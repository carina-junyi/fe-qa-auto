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

限制（v1）：匿名視角，看不到隱藏（[hidden]）題目——與舊展開法相同
（topicpage API 對任何權限都過濾隱藏題；隱藏題清單只存在於帶權限
登入態的資料夾頁 SSR HTML 裡）。含隱藏題的展開屬下一版。
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://www.junyiacademy.org"
API = BASE + "/api/v2/content/topicpage/{topic_id}"
UA = "fe-qa-auto/resolve-urls (+https://github.com/carina-junyi/fe-qa-auto)"
URL_LIST = "urls/url_list.txt"
MAX_DEPTH = 5  # 巢狀資料夾遞迴上限（type=Topic 的子節點）

ANCHOR_RE = re.compile(r"#topic-page-anchor-([A-Za-z0-9_-]+)")


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


def collect_exercises(topic_id: str, visited: set[str], depth: int = 0) -> list[str]:
    """回傳絕對題目 URL 清單（deep-first，保持頁面順序）。"""
    if depth > MAX_DEPTH or topic_id in visited:
        return []
    visited.add(topic_id)
    data = fetch_topic(topic_id)
    out: list[str] = []
    for child in data.get("child") or []:
        ctype = str(child.get("type", ""))
        if ctype == "Exercise" and child.get("url"):
            out.append(BASE + child["url"])
        elif ctype == "Topic":
            # 注意：頁內「小節」也是 type=Topic，但 id/url 皆空——自然跳過；
            # 只有帶 url 的真巢狀子資料夾才遞迴。
            sub_url = str(child.get("url") or "")
            if sub_url:
                out.extend(
                    collect_exercises(topic_id_candidates(sub_url)[-1], visited, depth + 1)
                )
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

    out_lines: list[str] = []
    n_folders = n_expanded = n_skipped = n_errors = 0
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
        found: list[str] = []
        api_error: RuntimeError | None = None
        for candidate in topic_id_candidates(folder_url):
            try:
                found = collect_exercises(candidate, visited=set())
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
        fresh = []
        for url in found:
            key = exercise_key(url)
            if key not in existing_keys:
                existing_keys.add(key)
                fresh.append(url)
        if not fresh and not found:
            out_lines.append(f"# [Error: no exercises found] {folder_url}")
            n_errors += 1
            continue
        out_lines.append(f"# [Expanded] {folder_url}")
        out_lines.extend(f"{url} ToDo" for url in fresh)
        n_expanded += len(fresh)

    if not dry_run:
        with open(URL_LIST, "w", encoding="utf-8") as fh:
            fh.write("\n".join(out_lines) + "\n")

    print("URL 展開結果：")
    print(f"- 資料夾 URL 數量: {n_folders}")
    print(f"- 展開的題目 URL 總數: {n_expanded}")
    print(f"- 略過（已展開）: {n_skipped}")
    print(f"- 錯誤: {n_errors}")
    print(f"- {URL_LIST} {'未變更（--dry-run）' if dry_run else '已更新'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
