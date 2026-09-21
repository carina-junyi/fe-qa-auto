#!/usr/bin/env python3
"""Deterministic question fetch：把習題的整個題目池從 API 落地成 agent 可讀的檔案。

    python3 scripts/fetch_questions.py <url-or-exercise-id> [...]   # 指定習題
    python3 scripts/fetch_questions.py --from-url-list               # url_list.txt 裡所有 ToDo 題目
    選項：--out <dir>（預設 questions/）、--qid <n>（只針對這一題，可重複）

為什麼走 API 而不是開頁面：
- 2026-09-19 起主站把 /exercises/<id> 導向新版作答頁，舊版 DOM 隨時會消失；
  內容 QA（題幹、選項、正解、解說）需要的資料全在
  `GET /api/v2/perseus/<exerciseId>/get_question` 的 Perseus JSON 裡，
  與 UI 版本無關。這支端點也是主站「列印練習卷」功能的資料來源。
- Perseus 是 client-side 批改，widget 自帶正解（radio 的 correct、
  numeric 的 answers…），所以拿到的就是答案卷，公開題不需登入。
- 隱藏題要 KAID：沿用 resolve_urls.py 的純 HTTP 登入（讀 JUNYI_EMAIL /
  JUNYI_PASSWORD），有帳密就一律帶著，公開題也帶，端點哪天收緊不用改。

輸出（每個習題一個資料夾 `questions/<exerciseId>/`）：
- `index.json`  題目池摘要：mode（exercise / sequential_quiz）、每題 qid 與
                widget 類型、schema 檢查結果、不支援的 widget、target_qids
- `q-<qid>.md`  單題：題幹（widget 佔位符就地展開成選項清單並標 ✓ 正解）、
                圖片、解說每一步、答案規格 raw JSON。agent 讀這個驗內容。
- `all.md`      上面所有單題串起來（有 --qid 時只含目標題），一次 Read 讀完。

schema 護欄：API 沒有版本契約，形狀漂移要「看得到」而不是靜默退化。
致命（exit 2，該習題不寫 md）：data 不是 list、題目缺 qid 或 content、
content 的佔位符找不到對應 widget。警告（寫進 index.json 的 warnings，
exit 0）：未知 widget 類型、整題沒有 graded widget。
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from resolve_urls import login_kaid, read_credentials  # noqa: E402

BASE = "https://www.junyiacademy.org"
API = BASE + "/api/v2/perseus/{exercise_id}/get_question"
UA = "fe-qa-auto/fetch-questions (+https://github.com/carina-junyi/fe-qa-auto)"
URL_LIST = "urls/url_list.txt"
DEFAULT_OUT = "questions"

PLACEHOLDER_RE = re.compile(r"\[\[☃ ([a-z-]+) (\d+)\]\]")
EXERCISE_URL_RE = re.compile(r"junyiacademy\.org/(?:exercises|exercise|new-exercise)/([^/?#\s]+)")

# 能從 options 讀出正解的 widget → 內容 QA 可完整驗
GRADED_KNOWN = {
    "radio", "dropdown", "input-number", "numeric-input", "expression",
    "input-text", "sorter", "orderer", "matcher", "interactive-graph",
}
# 內容型（無答案，但有可驗的內容）
CONTENT_KNOWN = {"image", "explanation", "iframe", "draggable-container", "measurer"}
# 互動型：答案存在 JSON，但「學生要怎麼作答」要開頁才看得到；內容照驗、作答面標 needs_browser
NEEDS_BROWSER = {"interactive-graph", "measurer", "draggable-container", "iframe"}

TYPE_LABEL = {
    "radio": "單選", "dropdown": "下拉選單", "input-number": "填充（數字）",
    "numeric-input": "填充（數字）", "expression": "填充（數學式）", "input-text": "填充（文字）",
    "sorter": "拖曳排序", "orderer": "排序", "matcher": "配對", "interactive-graph": "互動座標圖",
    "image": "圖片", "explanation": "說明折疊", "iframe": "嵌入頁面", "draggable-container": "拖曳圖",
    "measurer": "量尺",
}


class SchemaError(Exception):
    """API 回傳形狀不符合我們依賴的契約——整個習題不可信，不要靜默繼續。"""


# ---------------------------------------------------------------------------
# 抓取
# ---------------------------------------------------------------------------


def exercise_id_from(arg: str) -> str:
    m = EXERCISE_URL_RE.search(arg)
    if m:
        return m.group(1)
    if "/" in arg or " " in arg:
        raise ValueError(f"看不懂的習題參數：{arg}")
    return arg.strip()


def qid_from_url(arg: str) -> int | None:
    q = urllib.parse.urlparse(arg).query
    v = urllib.parse.parse_qs(q).get("qid")
    return int(v[0]) if v and v[0].isdigit() else None


def fetch_pool(exercise_id: str, kaid: str | None) -> list[dict]:
    headers = {"User-Agent": UA}
    if kaid:
        headers["Cookie"] = f"KAID={kaid}"
    req = urllib.request.Request(API.format(exercise_id=exercise_id), headers=headers)
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            break
        except (urllib.error.URLError, TimeoutError, ValueError) as err:
            last_err = err
            if attempt == 0:
                time.sleep(2)
    else:
        raise RuntimeError(f"get_question failed for {exercise_id}: {last_err}")
    data = body.get("data") if isinstance(body, dict) else None
    if not isinstance(data, list):
        raise SchemaError(f"{exercise_id}: data 不是 list（keys={list(body)[:5] if isinstance(body, dict) else type(body).__name__}）")
    if not data:
        raise SchemaError(f"{exercise_id}: 題目池是空的（習題不存在、已下架，或全是隱藏題而未登入）")
    return data


# ---------------------------------------------------------------------------
# 正規化
# ---------------------------------------------------------------------------


def _choices(opts: dict) -> list[dict]:
    return [
        {"content": str(c.get("content", "")), "correct": bool(c.get("correct"))}
        for c in (opts.get("choices") or [])
    ]


def normalize_widget(key: str, w: dict) -> dict:
    """widget → {key,type,label,graded,answer(自然語言化的正解),spec(raw 精簡),flags}"""
    wtype = str(w.get("type", ""))
    opts = w.get("options") or {}
    out: dict = {
        "key": key, "type": wtype, "label": TYPE_LABEL.get(wtype, wtype),
        "graded": bool(w.get("graded", True)), "answer": None, "spec": None, "flags": [],
    }
    if wtype == "radio":
        ch = _choices(opts)
        out["answer"] = [c["content"] for c in ch if c["correct"]]
        out["spec"] = {"choices": ch, "multipleSelect": bool(opts.get("multipleSelect")),
                       "noneOfTheAbove": bool(opts.get("noneOfTheAbove"))}
        if opts.get("multipleSelect"):
            out["label"] = "多選"
    elif wtype == "dropdown":
        ch = _choices(opts)
        out["answer"] = [c["content"] for c in ch if c["correct"]]
        out["spec"] = {"choices": ch}
    elif wtype == "input-number":
        out["answer"] = opts.get("value")
        out["spec"] = {k: opts.get(k) for k in ("value", "answerType", "maxError", "simplify", "inexact")}
    elif wtype == "numeric-input":
        answers = opts.get("answers") or []
        out["answer"] = [a.get("value") for a in answers if a.get("status") == "correct"]
        out["spec"] = {"answers": [
            {k: a.get(k) for k in ("value", "status", "maxError", "simplify", "strict", "message")}
            for a in answers
        ]}
    elif wtype == "expression":
        out["answer"] = opts.get("value")
        out["spec"] = {k: opts.get(k) for k in ("value", "form", "simplify", "buttonSets", "functions", "times")}
        if "buttonSets" in opts:
            out["flags"].append("check_button_sets")  # 答案用到的符號要在 buttonSets 裡打得出來
    elif wtype == "input-text":
        out["answer"] = opts.get("value")
        out["spec"] = {"value": opts.get("value"), "placeholder": opts.get("placeholder")}
    elif wtype == "sorter":
        out["answer"] = list(opts.get("correct") or [])
        out["spec"] = {"correct_order": out["answer"], "layout": opts.get("layout")}
    elif wtype == "orderer":
        alias = {o.get("alias"): o.get("content") for o in (opts.get("options") or [])}
        order = [alias.get(a, a) for a in (opts.get("correctOptions") or [])]
        out["answer"] = order
        out["spec"] = {"correct_order": order,
                       "distractors": [alias.get(a, a) for a in (opts.get("otherOptions") or [])]}
    elif wtype == "matcher":
        left, right = list(opts.get("left") or []), list(opts.get("right") or [])
        out["answer"] = [f"{l} ↔ {r}" for l, r in zip(left, right)]
        out["spec"] = {"pairs": list(zip(left, right)), "labels": opts.get("labels"),
                       "orderMatters": bool(opts.get("orderMatters"))}
    elif wtype == "interactive-graph":
        correct = opts.get("correct") or {}
        out["answer"] = correct
        out["spec"] = {"graph_type": (opts.get("graph") or {}).get("type"), "correct": correct,
                       "range": opts.get("range")}
    elif wtype == "image":
        bg = opts.get("backgroundImage") or {}
        out["spec"] = {"url": bg.get("url"),
                       "labels": [str(l.get("content", "")) for l in (opts.get("labels") or [])]}
    elif wtype == "iframe":
        out["spec"] = {"url": opts.get("url"), "width": opts.get("width"), "height": opts.get("height")}
    elif wtype == "explanation":
        out["spec"] = {"prompt": opts.get("showPrompt"), "explanation": opts.get("explanation")}
    elif wtype == "draggable-container":
        out["spec"] = {"backgroundImage": opts.get("backgroundImage"), "content": opts.get("content")}
    elif wtype == "measurer":
        out["spec"] = {"image": (opts.get("image") or {}).get("url"),
                       "showRuler": opts.get("showRuler"), "showProtractor": opts.get("showProtractor")}
    else:
        out["flags"].append("unknown_widget_type")
        out["spec"] = _trim(opts)
    if wtype in NEEDS_BROWSER:
        out["flags"].append("needs_browser")
    return out


def _trim(o, depth: int = 0):
    if depth > 4:
        return "…"
    if isinstance(o, dict):
        return {k: _trim(v, depth + 1) for k, v in list(o.items())[:12]}
    if isinstance(o, list):
        return [_trim(v, depth + 1) for v in o[:6]] + (["…"] if len(o) > 6 else [])
    if isinstance(o, str):
        return o[:200]
    return o


def normalize_item(item: dict, exercise_id: str) -> dict:
    qid = item.get("qid")
    if not isinstance(qid, int):
        raise SchemaError(f"{exercise_id}: 題目缺 qid（keys={list(item)[:6]}）")
    q = item.get("question") or {}
    inner = q.get("question") or {}
    content = inner.get("content")
    if not isinstance(content, str):
        raise SchemaError(f"{exercise_id} qid={qid}: 缺 question.question.content")
    widgets_raw = inner.get("widgets") or {}
    if not isinstance(widgets_raw, dict):
        raise SchemaError(f"{exercise_id} qid={qid}: widgets 不是 dict")
    placeholders = [f"{t} {n}" for t, n in PLACEHOLDER_RE.findall(content)]
    missing = [p for p in placeholders if p not in widgets_raw]
    if missing:
        raise SchemaError(f"{exercise_id} qid={qid}: 佔位符沒有對應 widget：{missing}")
    widgets = [normalize_widget(k, w) for k, w in widgets_raw.items()]
    hints = []
    for i, h in enumerate(q.get("hints") or [], 1):
        hw = [normalize_widget(k, w) for k, w in (h.get("widgets") or {}).items()]
        hints.append({"step": i, "content": str(h.get("content", "")), "widgets": hw})
    warnings = []
    if not any(w["graded"] and w["type"] in GRADED_KNOWN for w in widgets):
        warnings.append("no_graded_known_widget")
    all_widgets = widgets + [x for h in hints for x in h["widgets"]]
    unknown = sorted({w["type"] for w in all_widgets if "unknown_widget_type" in w["flags"]})
    if unknown:
        warnings.append("unknown_widget_types:" + ",".join(unknown))
    images = re.findall(r"!\[[^\]]*\]\(([^)\s]+)\)", content)
    for w in widgets:
        url = (w["spec"] or {}).get("url") if w["type"] == "image" else None
        if url:
            images.append(url)
    return {
        "qid": qid,
        "content": content,
        "widgets": widgets,
        "hints": hints,
        "images": images,
        "is_start": bool(q.get("is_start")),
        "correct_nxt_qid": q.get("correct_nxt_qid"),
        "wrong_nxt_qid": q.get("wrong_nxt_qid"),
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# 輸出
# ---------------------------------------------------------------------------


def render_widget_block(w: dict) -> str:
    lines = [f"> 【{w['key']}｜{w['label']}】"]
    spec = w["spec"] or {}
    t = w["type"]
    if t in ("radio", "dropdown"):
        for c in spec.get("choices", []):
            lines.append(f"> - {'✓ ' if c['correct'] else ''}{c['content']}")
        if spec.get("multipleSelect"):
            lines.append("> （多選）")
    elif t in ("input-number", "numeric-input", "expression", "input-text"):
        lines.append(f"> 正解：`{json.dumps(w['answer'], ensure_ascii=False)}`")
        extra = {k: v for k, v in spec.items() if k not in ("value", "answers") and v not in (None, False, [], "")}
        if extra:
            lines.append(f"> 規格：`{json.dumps(extra, ensure_ascii=False)}`")
        if t == "numeric-input" and len(spec.get("answers", [])) > 1:
            lines.append(f"> 全部 answers：`{json.dumps(spec['answers'], ensure_ascii=False)}`")
    elif t in ("sorter", "orderer"):
        lines.append("> 正確順序：" + " → ".join(map(str, w["answer"])))
        if spec.get("distractors"):
            lines.append("> 干擾項：" + "、".join(map(str, spec["distractors"])))
    elif t == "matcher":
        lines.append(f"> 標題：{spec.get('labels')}")
        for pair in w["answer"]:
            lines.append(f"> - {pair}")
    elif t == "interactive-graph":
        lines.append(f"> 圖型：{spec.get('graph_type')}；正解：`{json.dumps(spec.get('correct'), ensure_ascii=False)}`")
    elif t == "image":
        lines.append(f"> 圖片：{spec.get('url')}")
        if spec.get("labels"):
            lines.append("> 圖上標籤：" + "、".join(spec["labels"]))
    elif t == "iframe":
        lines.append(f"> 嵌入：{spec.get('url')}（內容 QA 看不到，需開頁）")
    elif t == "explanation":
        lines.append(f"> 折疊說明「{spec.get('prompt')}」：")
        for ln in str(spec.get("explanation", "")).splitlines():
            lines.append(f"> {ln}")
    else:
        lines.append(f"> raw：`{json.dumps(spec, ensure_ascii=False)[:600]}`")
    if w["flags"]:
        lines.append(f"> flags：{', '.join(w['flags'])}")
    return "\n".join(lines)


def render_question_md(item: dict, idx: int, total: int, mode: str) -> str:
    graded = [w for w in item["widgets"] if w["graded"]]
    answerable = [w for w in graded if w["type"] in GRADED_KNOWN]
    types = "、".join(dict.fromkeys(w["label"] for w in answerable)) or "（無作答 widget）"
    out = [f"# qid {item['qid']}　題 {idx}/{total}　題型：{types}", ""]
    if mode == "sequential_quiz":
        out.append(f"依序型：is_start={item['is_start']}，答對→{item['correct_nxt_qid']}，答錯→{item['wrong_nxt_qid']}")
        out.append("")
    if item["warnings"]:
        out.append(f"⚠️ warnings：{', '.join(item['warnings'])}")
        out.append("")
    by_key = {w["key"]: w for w in item["widgets"]}

    def repl(m: re.Match) -> str:
        key = f"{m.group(1)} {m.group(2)}"
        return "\n" + render_widget_block(by_key[key]) + "\n"

    out.append("## 題幹（widget 佔位符已就地展開，✓ = 平台正解）")
    out.append("")
    out.append(PLACEHOLDER_RE.sub(repl, item["content"]).strip())
    unplaced = [w for w in item["widgets"] if f"[[☃ {w['key']}]]" not in item["content"]]
    if unplaced:
        out.append("")
        out.append("## 題幹沒放進去的 widget")
        for w in unplaced:
            out.append(render_widget_block(w))
    if item["images"]:
        out.append("")
        out.append("## 圖片（用 curl 下載後以 Read 判讀）")
        out.extend(f"- {u}" for u in dict.fromkeys(item["images"]))
    out.append("")
    out.append(f"## 解說（hints，共 {len(item['hints'])} 步）")
    if not item["hints"]:
        out.append("（無 hints）")
    for h in item["hints"]:
        out.append("")
        out.append(f"### 步驟 {h['step']}/{len(item['hints'])}")
        h_by_key = {w["key"]: w for w in h["widgets"]}
        placed = set()

        def h_repl(m: re.Match, _by=h_by_key, _placed=placed) -> str:
            key = f"{m.group(1)} {m.group(2)}"
            if key not in _by:
                return m.group(0)
            _placed.add(key)
            return "\n" + render_widget_block(_by[key]) + "\n"

        out.append(PLACEHOLDER_RE.sub(h_repl, h["content"]).strip())
        for w in h["widgets"]:
            if w["key"] not in placed:
                out.append(render_widget_block(w))
    out.append("")
    out.append("## 答案規格 raw")
    out.append("```json")
    out.append(json.dumps([{k: w[k] for k in ("key", "type", "graded", "answer", "spec")} for w in graded],
                          ensure_ascii=False, indent=1))
    out.append("```")
    return "\n".join(out) + "\n"


def write_exercise(exercise_id: str, pool: list[dict], out_dir: str,
                   target_qids: list[int], source_url: str | None) -> dict:
    items = [normalize_item(it, exercise_id) for it in pool]
    mode = "sequential_quiz" if any(it["correct_nxt_qid"] or it["wrong_nxt_qid"] for it in items) else "exercise"
    if mode == "sequential_quiz":
        # 依序型照 is_start → correct_nxt_qid 走主線排序，讀起來才是學生看到的順序
        by_qid = {it["qid"]: it for it in items}
        ordered, seen = [], set()
        cur = next((it["qid"] for it in items if it["is_start"]), items[0]["qid"])
        while cur in by_qid and cur not in seen:
            seen.add(cur)
            ordered.append(by_qid[cur])
            cur = by_qid[cur]["correct_nxt_qid"]
        ordered.extend(it for it in items if it["qid"] not in seen)
        items = ordered
    known_qids = {it["qid"] for it in items}
    missing_targets = [q for q in target_qids if q not in known_qids]
    folder = os.path.join(out_dir, exercise_id)
    os.makedirs(folder, exist_ok=True)
    total = len(items)
    md_all = []
    for idx, it in enumerate(items, 1):
        md = render_question_md(it, idx, total, mode)
        with open(os.path.join(folder, f"q-{it['qid']}.md"), "w", encoding="utf-8") as fh:
            fh.write(md)
        if not target_qids or it["qid"] in target_qids:
            md_all.append(md)
    header = [
        f"# 習題 {exercise_id}　模式：{mode}　題目池 {total} 題",
        f"來源：{source_url or API.format(exercise_id=exercise_id)}",
    ]
    if target_qids:
        header.append(f"**只驗目標題 qid {target_qids}**（其餘 {total - len(md_all)} 題不在本次範圍）")
    with open(os.path.join(folder, "all.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(header) + "\n\n---\n\n" + "\n---\n\n".join(md_all))
    index = {
        "exercise_id": exercise_id,
        "source_url": source_url,
        "mode": mode,
        "total": total,
        "target_qids": target_qids,
        "missing_target_qids": missing_targets,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "questions": [
            {"qid": it["qid"], "file": f"q-{it['qid']}.md",
             "types": [w["type"] for w in it["widgets"] if w["graded"]],
             "needs_browser": any("needs_browser" in w["flags"] for w in it["widgets"]),
             "hints": len(it["hints"]), "images": len(it["images"]), "warnings": it["warnings"]}
            for it in items
        ],
        "warnings": sorted({w for it in items for w in it["warnings"]}),
    }
    with open(os.path.join(folder, "index.json"), "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, indent=1)
    return index


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def targets_from_url_list() -> list[tuple[str, str, list[int]]]:
    """url_list.txt 裡 ToDo／無狀態的題目 URL → (exercise_id, url, qids)。"""
    out = []
    try:
        with open(URL_LIST, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError as err:
        raise SystemExit(f"讀不到 {URL_LIST}: {err}")
    for line in lines:
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        url, _, rest = s.partition(" ")
        status = rest.strip().split(" ", 1)[0] if rest.strip() else "ToDo"
        if status != "ToDo" or not EXERCISE_URL_RE.search(url):
            continue
        qid = qid_from_url(url)
        out.append((exercise_id_from(url), url, [qid] if qid else []))
    return out


def main(argv: list[str]) -> int:
    out_dir = DEFAULT_OUT
    qids: list[int] = []
    args: list[str] = []
    it = iter(argv)
    for a in it:
        if a == "--out":
            out_dir = next(it)
        elif a == "--qid":
            qids.append(int(next(it)))
        elif a == "--from-url-list":
            args.append(a)
        elif a.startswith("-"):
            raise SystemExit(f"未知選項 {a}\n{__doc__}")
        else:
            args.append(a)
    if not args:
        raise SystemExit(__doc__)

    if "--from-url-list" in args:
        targets = targets_from_url_list()
    else:
        targets = []
        for a in args:
            url_qid = qid_from_url(a)
            targets.append((exercise_id_from(a), a if "://" in a else None,
                            sorted(set(qids + ([url_qid] if url_qid else [])))))

    kaid: str | None = None
    creds = read_credentials()
    if creds:
        kaid = login_kaid(*creds)
    print(f"- 登入：{'KAID 已取得（含隱藏題）' if kaid else '匿名（無帳密或登入失敗；隱藏題拿不到）'}")

    rc = 0
    for exercise_id, url, target_qids in targets:
        try:
            pool = fetch_pool(exercise_id, kaid)
            index = write_exercise(exercise_id, pool, out_dir, target_qids, url)
        except SchemaError as err:
            print(f"  ✗ SCHEMA {err}", file=sys.stderr)
            rc = 2
            continue
        except RuntimeError as err:
            print(f"  ✗ FETCH {err}", file=sys.stderr)
            rc = rc or 1
            continue
        nb = sum(1 for q in index["questions"] if q["needs_browser"])
        tgt = f"，目標 qid {target_qids}" if target_qids else ""
        miss = f"，⚠️ 目標不在池內：{index['missing_target_qids']}" if index["missing_target_qids"] else ""
        warn = f"，warnings：{index['warnings']}" if index["warnings"] else ""
        print(f"  ✓ {exercise_id}：{index['mode']}，{index['total']} 題，{nb} 題含需開頁的 widget"
              f"{tgt}{miss}{warn} → {os.path.join(out_dir, exercise_id)}/")
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
