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
Step 0: Resolve URLs（展開資料夾 URL）
Step 1: Open page
Step 2: Probe page structure
Step 3: Extract qid + stem, verify stem math
Step 4: Identify all interactive elements
Step 5: Dispatch QA skills → fill answers → submit → expand hints → verify math
Step 6: Update url_list.txt (Pass/Fail)
Step 7: Next question
Step 8: Generate QA report
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
│   └── commands/                # Skill definitions
│       ├── resolve-urls.md          # Step 0: expand folder URLs
│       ├── probe-page.md           # Step 2: page structure detection
│       ├── extract-and-verify-stem.md # Step 3: qid + stem extraction
│       ├── identify-question-type.md  # Step 4: element detection
│       ├── qa-choice-question.md    # Step 5: radio/checkbox
│       ├── qa-fill-question.md      # Step 5: MathQuill/text input
│       ├── qa-dropdown-question.md  # Step 5: <select>
│       ├── qa-drag-question.md      # Step 5: drag-sort
│       └── generate-qa-report.md    # Step 8: QA report
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

1. Add exercise or folder URLs to `urls/url_list.txt` (one per line, status `ToDo`)
2. Run Claude Code in this directory
3. Claude will automatically execute the QA workflow per CLAUDE.md

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
