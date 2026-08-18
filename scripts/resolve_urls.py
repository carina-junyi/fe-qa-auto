#!/usr/bin/env python3
"""Deterministic folder-URL expansion for urls/url_list.txt.

取代舊的「開瀏覽器讀渲染列表」展開法：直接打均一的 topicpage API，
一發 HTTP GET 拿到結構化清單，快、省 token、且可用 child_exercise_count 自我核對。

    python3 scripts/resolve_urls.py            # 展開 urls/url_list.txt（就地改寫）
    python3 scripts/resolve_urls.py --dry-run  # 只印結果，不改檔案

行為與舊 /resolve-urls skill 的合約一致：
- 資料夾 URL 行（junyiacademy URL 且不含 /exercises/）→ 換成
  「# [Expanded] <原URL>」＋底下每題一行「<題目URL> ToDo」
- 已展開（# [Expanded]）不重複展開；已存在的題目 URL 不重複新增
- 展不出題目 → 該行換成「# [Error: no exercises found] <原URL>」
- API 失敗 → 「# [Error: api failed] <原URL>」，其餘行照常處理
- 結束時印出與舊 skill Step 4 相同格式的摘要

隱藏（[hidden]）題目：topicpage API 對任何權限都過濾隱藏題，但帶「開發者」
權限的登入態資料夾頁 SSR HTML（__NEXT_DATA__ 的 dehydratedState）會列出隱藏題。
本 script 若讀得到 JUNYI_EMAIL / JUNYI_PASSWORD（環境變數或同目錄 .env / 專案根
.env），會先以純 HTTP 登入取得 KAID cookie，展開時逐 topic 補上 API 看不到的隱藏
題；讀不到帳密則退回純匿名展開（不含隱藏題），並在摘要註明。密碼只用於登入請求，
不寫入任何輸出。已知限制：只補「隱藏的題目」，不處理「整個被隱藏的子資料夾」。
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://www.junyiacademy.org"
API = BASE + "/api/v2/content/topicpage/{topic_id}"
SSR = BASE + "/topics/{topic_id}"
LOGIN_API = BASE + "/api/v2/user/login"
UA = "fe-qa-auto/resolve-urls (+https://github.com/carina-junyi/fe-qa-auto)"
URL_LIST = "urls/url_list.txt"
MAX_DEPTH = 5  # 巢狀資料夾遞迴上限（type=Topic 的子節點）

ANCHOR_RE = re.compile(r"#topic-page-anchor-([A-Za-z0-9_-]+)")
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL
)


def topic_id_candidates(url: str) -> list[str]:
    """從資料夾 URL 取 topic id 候選（依序嘗試，取第一個展得出題目的）。

    path 最後一段對 topics/ 與 course-compare/ 皆適用（2026-08-17 以四種
    資料夾型態實測）。帶 #topic-page-anchor-<slug> 的連結先試 anchor slug
    （若是真子資料夾可縮小範圍），但頁內「小節」的 anchor 不是可查詢的
    topic（API 回空資料），此時退回整頁展開——與舊瀏覽器展開法的實際
    行為一致（讀的是整頁渲染列表）。
    """
    path = url.split("#", 1)[0].split("?", 1)[0].rstrip("/")
    page_id = path.rsplit("/", 1)[-1]
    m = ANCHOR_RE.search(url)
    if m and m.group(1) != page_id:
        return [m.group(1), page_id]
    return [page_id]


def fetch_topic(topic_id: str) -> dict:
    req = urllib.request.Request(API.format(topic_id=topic_id), headers={"User-Agent": UA})
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))["data"]
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as err:
            last_err = err
            if attempt == 0:
                time.sleep(2)
    raise RuntimeError(f"topicpage API failed for {topic_id}: {last_err}")


def read_credentials() -> tuple[str, str] | None:
    """取 JUNYI_EMAIL / JUNYI_PASSWORD：優先環境變數，其次 .env 檔。

    .env 找兩處：cwd（QA worker 的工作目錄）與專案根（本檔的上一層）。
    找不到或任一為空 → 回 None（退回匿名展開）。
    """
    email = os.environ.get("JUNYI_EMAIL", "")
    password = os.environ.get("JUNYI_PASSWORD", "")
    if not (email and password):
        here = os.path.dirname(os.path.abspath(__file__))
        for env_path in (".env", os.path.join(here, os.pardir, ".env")):
            try:
                with open(env_path, encoding="utf-8") as fh:
                    env = fh.read()
            except OSError:
                continue
            email = email or _env_value(env, "JUNYI_EMAIL")
            password = password or _env_value(env, "JUNYI_PASSWORD")
            if email and password:
                break
    return (email, password) if email and password else None


def _env_value(env_text: str, name: str) -> str:
    m = re.search(rf"^{name}=(.*)$", env_text, re.MULTILINE)
    return m.group(1).strip().strip("'\"") if m else ""


def login_kaid(email: str, password: str) -> str | None:
    """純 HTTP 登入取得 KAID cookie 值。

    POST /api/v2/user/login {identifier, password} 成功時 body.data.auth 即為
    KAID cookie 的值（base64 的身分字串）；帶著它請求資料夾頁，SSR 才會以
    「開發者」視角渲染、含隱藏題。失敗（帳密錯 / 端點異常）回 None。
    """
    body = json.dumps({"identifier": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        LOGIN_API, data=body, headers={"User-Agent": UA, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8")).get("data") or {}
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        print(f"  ! 登入請求失敗：{err}", file=sys.stderr)
        return None
    auth = data.get("auth")
    if not auth:
        # errors 常見：noEmail（欄位沒讀到）、isInvalidPassword、signupMedium=Google
        print(f"  ! 登入未取得 KAID（errors={data.get('errors')}）", file=sys.stderr)
        return None
    return auth


def fetch_hidden_exercises(topic_id: str, kaid: str) -> list[str]:
    """以 KAID 登入態抓資料夾頁 SSR，回傳「隱藏題」的絕對 URL 清單。

    僅補 topicpage API 過濾掉的隱藏題（title 帶 [hidden]）；可見題仍由 API 展開，
    不在此重複。best-effort：任何解析失敗都回空清單，不影響匿名展開結果。
    """
    req = urllib.request.Request(
        SSR.format(topic_id=topic_id),
        headers={"User-Agent": UA, "Cookie": f"KAID={kaid}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8")
        match = NEXT_DATA_RE.search(html)
        if not match:
            return []
        children = _ssr_children(json.loads(match.group(1)))
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        print(f"  ! 隱藏題 SSR 抓取失敗（{topic_id}）：{err}", file=sys.stderr)
        return []
    out: list[str] = []
    for child in children:
        url = str(child.get("url") or "")
        title = str(child.get("title") or "")
        if url.startswith("/exercises/") and "[hidden]" in title:
            out.append(BASE + url)
    return out


def _ssr_children(next_data: dict) -> list[dict]:
    """從 __NEXT_DATA__ 取資料夾頁的內容子節點清單。

    react-query 的 dehydratedState 裡，資料夾內容那個 query 的 state.data.children
    才是我們要的（含 video / 各種 quiz 型題目）；逐 query 找第一個 data 帶
    children 的即可，不依賴 query 排序。
    """
    queries = (
        next_data.get("props", {})
        .get("pageProps", {})
        .get("dehydratedState", {})
        .get("queries")
        or []
    )
    for query in queries:
        data = (query.get("state") or {}).get("data")
        if isinstance(data, dict) and isinstance(data.get("children"), list):
            return data["children"]
    return []


def collect_exercises(
    topic_id: str, visited: set[str], kaid: str | None = None, depth: int = 0
) -> list[tuple[str, bool]]:
    """回傳 (絕對題目 URL, 是否隱藏題) 清單（deep-first，保持頁面順序）。

    kaid 有值時，每個 topic 於 API 可見題之後，補上該 topic 被 API 過濾掉的隱藏題。
    """
    if depth > MAX_DEPTH or topic_id in visited:
        return []
    visited.add(topic_id)
    data = fetch_topic(topic_id)
    out: list[tuple[str, bool]] = []
    for child in data.get("child") or []:
        ctype = str(child.get("type", ""))
        if ctype == "Exercise" and child.get("url"):
            out.append((BASE + child["url"], False))
        elif ctype == "Topic":
            # 注意：頁內「小節」也是 type=Topic，但 id/url 皆空——自然跳過；
            # 只有帶 url 的真巢狀子資料夾才遞迴。
            sub_url = str(child.get("url") or "")
            if sub_url:
                out.extend(
                    collect_exercises(
                        topic_id_candidates(sub_url)[-1], visited, kaid, depth + 1
                    )
                )
    if kaid:
        out.extend((url, True) for url in fetch_hidden_exercises(topic_id, kaid))
    return out


def exercise_key(url: str) -> str:
    """去重用 key：slug＋topic 參數（忽略 domain 與百分比編碼差異）。"""
    path = url.split("://", 1)[-1].split("/", 1)[-1]
    return urllib.parse.unquote(path)


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    try:
        with open(URL_LIST, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError as err:
        print(f"讀不到 {URL_LIST}: {err}", file=sys.stderr)
        return 1

    existing_keys = set()
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "/exercises/" in stripped:
            existing_keys.add(exercise_key(stripped.split()[0]))

    # 有帳密就先登入取 KAID：展開時可補上 API 過濾掉的隱藏題。
    kaid: str | None = None
    creds = read_credentials()
    if creds:
        kaid = login_kaid(*creds)
        print(
            f"- 隱藏題展開：{'已登入（含隱藏題）' if kaid else '登入失敗，退回匿名展開'}"
        )
    else:
        print("- 隱藏題展開：未設定 JUNYI_EMAIL/JUNYI_PASSWORD，匿名展開（不含隱藏題）")

    out_lines: list[str] = []
    n_folders = n_expanded = n_skipped = n_errors = n_hidden = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# [Expanded]"):
            n_skipped += 1
            out_lines.append(line)
            continue
        if (
            not stripped
            or stripped.startswith("#")
            or "junyiacademy.org" not in stripped
            or "/exercises/" in stripped
        ):
            out_lines.append(line)
            continue

        folder_url = stripped.split()[0]
        n_folders += 1
        found: list[tuple[str, bool]] = []
        api_error: RuntimeError | None = None
        for candidate in topic_id_candidates(folder_url):
            try:
                found = collect_exercises(candidate, visited=set(), kaid=kaid)
            except RuntimeError as err:
                api_error = err
                continue
            api_error = None
            if found:
                break
        if api_error is not None:
            print(f"  ! {api_error}", file=sys.stderr)
            out_lines.append(f"# [Error: api failed] {folder_url}")
            n_errors += 1
            continue
        fresh: list[tuple[str, bool]] = []
        for url, hidden in found:
            key = exercise_key(url)
            if key not in existing_keys:
                existing_keys.add(key)
                fresh.append((url, hidden))
        if not fresh and not found:
            out_lines.append(f"# [Error: no exercises found] {folder_url}")
            n_errors += 1
            continue
        out_lines.append(f"# [Expanded] {folder_url}")
        out_lines.extend(f"{url} ToDo" for url, _ in fresh)
        n_expanded += len(fresh)
        n_hidden += sum(1 for _, hidden in fresh if hidden)

    if not dry_run:
        with open(URL_LIST, "w", encoding="utf-8") as fh:
            fh.write("\n".join(out_lines) + "\n")

    print("URL 展開結果：")
    print(f"- 資料夾 URL 數量: {n_folders}")
    print(f"- 展開的題目 URL 總數: {n_expanded}")
    if kaid:
        print(f"- 其中隱藏題: {n_hidden}")
    print(f"- 略過（已展開）: {n_skipped}")
    print(f"- 錯誤: {n_errors}")
    print(f"- {URL_LIST} {'未變更（--dry-run）' if dry_run else '已更新'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
