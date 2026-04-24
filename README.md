# fe-qa-auto

Automated QA testing for Junyi Academy math exercises — validates question stems, answers, and hint explanations via browser automation.

## Overview

對均一教育平台的數學練習頁面進行自動化 QA 驗證，檢查題幹、選項、答案與解題說明（hints）是否有數學錯誤。

## Supported Question Types

| 題型 | 偵測方式 | 操作方式 |
|------|---------|---------|
| 單選 / 多選 | `[role="radio"]` / `[data-testid="perseus-radio-widget"]` | mouse click |
| 填充（MathQuill） | `.mq-editable-field` | MathQuill LaTeX API（支援帶分數） |
| 填充（text input） | `input[type="text"]` | `agent-browser fill` |
| 下拉選單 | `<select>` | JS `dispatchEvent` |
| 拖曳排序 | `[data-rfd-droppable-id]` | 鍵盤拖曳（Space→Arrow→Space） |
| 座標平面畫圖 | Raphael/SVG canvas | SKIPPED，透過 hints 驗證數學 |

## Supported URL Formats

`url_list.txt` 支援兩種 URL 類型：

| URL 類型 | 範例 | 處理方式 |
|----------|------|----------|
| **題目 URL** | `https://www.junyiacademy.org/exercises/...` | 直接 QA |
| **資料夾 URL** | `https://www.junyiacademy.org/course-compare/...` | Step 0 自動展開為底下的題目 URL |

## Workflow

```
Step 0:  Resolve URLs（展開資料夾 URL）
Step 1:  Open page
Step 2:  Probe page structure + detect exercise mode + API recon
Step 2b: [exercise 模式] Hint-first strategy + qid coverage tracking
Step 3:  Extract qid + stem, verify stem math
Step 4:  Identify all interactive elements
Step 5:  Dispatch QA skills → fill answers → submit → expand hints → verify math
Step 6:  Update url_list.txt (Pass/Fail/Warn)
Step 7:  Next question
Step 8:  Generate QA report
```

詳細流程見 [CLAUDE.md](CLAUDE.md)。

## Project Structure

```
.
├── CLAUDE.md                    # Main workflow instructions
├── QA_result.txt                # QA report output (generated per run)
├── urls/
│   └── url_list.txt             # URLs to QA (with status)
├── .claude/
│   └── skills/                  # Skill definitions (SKILL.md format)
│       ├── resolve-urls/            # Step 0: expand folder URLs
│       ├── probe-page/             # Step 2: page structure detection
│       ├── extract-and-verify-stem/ # Step 3: qid + stem extraction
│       ├── identify-question-type/  # Step 4: element detection
│       ├── qa-choice-question/      # Step 5: radio/checkbox
│       ├── qa-fill-question/        # Step 5: MathQuill/text input
│       ├── qa-dropdown-question/    # Step 5: <select>
│       ├── qa-drag-question/        # Step 5: drag-sort
│       └── generate-qa-report/      # Step 8: QA report
├── page_structures/             # DOM selectors & JS extraction
│   ├── shared/                      # Common elements
│   ├── choice/                      # Radio/checkbox options
│   ├── dropdown/                    # Select dropdowns
│   ├── fill-in/                     # MathQuill & text inputs
│   └── drag-sort/                   # Drag-and-drop sortable
└── references/
    ├── platform-gotchas.md      # Known platform quirks
    ├── command-reference.md     # agent-browser CLI reference
    └── qa-report-format.md      # Report template
```

## Prerequisites

- [agent-browser](https://github.com/anthropics/agent-browser) installed at `/opt/homebrew/bin/agent-browser`
- Claude Code CLI

## Usage

### 1. 準備 URL 清單

在 `urls/url_list.txt` 中貼上要 QA 的 URL（每行一個），支援兩種格式：

```
# 資料夾連結（自動展開為底下的所有題目）
https://www.junyiacademy.org/course-compare/math-elem/math-6/j-m6a/j-m6a-c08/jrc-6-01-2 ToDo

# 單題連結（直接 QA）
https://www.junyiacademy.org/exercises/mcenter-g-10-6-2-1?topic=... ToDo
```

> **注意**：若該資料夾的題組為**隱藏題組**（頁面無法公開存取），則不支援資料夾連結的形式。
> 此時需要將每一組題目的 URL 逐一貼上，例如：
> ```
> https://www.junyiacademy.org/exercises/mcenter-g-10-7-2-11?topic=... ToDo
> https://www.junyiacademy.org/exercises/mcenter-g-10-7-2-12?topic=... ToDo
> https://www.junyiacademy.org/exercises/mcenter-g-10-7-2-13?topic=... ToDo
> ```

### 2. 執行 QA

在此目錄下啟動 Claude Code，Claude 會依照 [CLAUDE.md](CLAUDE.md) 自動執行完整 QA 流程。

### 3. 查看結果

- `urls/url_list.txt` — 每個 URL 的狀態會更新為 `Pass` / `Fail` / `Warn` / `Skipped`
- `QA_result.txt` — 詳細的 QA 報告（含每題 qid、題幹、答案、hints 驗證結果）

## Exercise Modes

平台有兩種題組類型，透過 `window.Exercises.contentType` 自動偵測：

| 類型 | `contentType` | 說明 | QA 策略 |
|------|--------------|------|---------|
| 依序型 | `sequential_quiz` | 固定 N 題，全部做完 | 逐題依序操作 |
| 累積型 | `exercise` | 從題目池隨機出題，累積答對 N 題完成 | Hint-first 策略 + qid 覆蓋追蹤 |

### API 偵察

透過 `/api/v2/perseus/<exercise-id>/get_question` 取得完整題目池（含所有 qid），用於：
1. 追蹤累積型題組的 qid 覆蓋進度
2. Browser 操作遇到困難時做 double check（標記為 `Warn`）

> API 的答案不可直接使用。答案必須由 agent 獨立計算。

## Known Limitations

### 部分題型不支援自動化
遇到不支援的題型（如互動式座標平面畫圖）時，該題會標記為 `SKIPPED`，並透過 reload 跳到下一題繼續 QA。若整個題組的所有題目都是不支援的題型，該 URL 會標記為 `Skipped`。

目前不支援的題型：
| 題型 | 原因 |
|------|------|
| 座標平面拖曳畫圖（Raphael/SVG） | 需要在 canvas 上拖曳點，無法透過鍵盤或 API 操作 |

### QA 報告產生規則
- 有任何 URL 為 `Fail` 或 `Warn` → 自動產生 `QA_result.txt`
- 全部 `Pass` → 不產生報告

## Key Features

### MathQuill LaTeX API
使用 `MathQuill.getInterface(2).MathField(el).latex()` 直接設定數學表達式，支援帶分數（如 `5\frac{3}{8}`）等所有格式。

### MathML Structure Parser
使用 `parseMathML()` 遍歷 MathML DOM 節點（`<mfrac>`, `<msup>` 等），正確解析分數避免 `textContent` 的分子分母合併問題。

### qid Tracking
每題透過 `Exercises.PerseusBridge.getSeedInfo().problem_type` 擷取 qid，記錄在 QA 報告中供追蹤。

## Verification

Each question is validated with **three-way consistency**:

1. **Independent calculation** — solve the math independently
2. **Platform answer** — submit and check if accepted
3. **Hint verification** — expand all hint steps, verify each step's math, compare final answer

Any inconsistency is flagged as a potential error in QA_result.txt.
