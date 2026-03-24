# fe-qa-auto

Automated QA testing for Junyi Academy math exercises — validates question stems, answers, and hint explanations via browser automation.

## Overview

對均一教育平台的數學練習頁面進行自動化 QA 驗證，檢查題幹、選項、答案與解題說明（hints）是否有數學錯誤。

## Supported Question Types

| 題型 | 偵測方式 | 操作方式 |
|------|---------|---------|
| 單選 / 多選 | `[role="radio"]` / `[role="checkbox"]` | mouse click |
| 填充（MathQuill） | `.mq-editable-field` | mouse click + press 逐字 |
| 填充（text input） | `input[type="text"]` | `agent-browser fill` |
| 下拉選單 | `<select>` | `agent-browser select` |
| 拖曳畫圖 / 排序 | 無法自動化 | SKIPPED，透過 hints 驗證數學 |

## Workflow

```
Step 1: Open page
Step 2: Probe page structure
Step 3: Extract and verify stem
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
├── QA_result.txt                # QA report output
├── urls/
│   └── url_list.txt             # URLs to QA (with status)
├── .claude/
│   └── commands/                # Skill definitions
│       ├── identify-question-type.md
│       ├── qa-choice-question.md
│       ├── qa-fill-question.md
│       ├── qa-dropdown-question.md
│       ├── probe-page.md
│       ├── extract-and-verify-stem.md
│       └── generate-qa-report.md
├── page_structures/             # DOM selectors & JS extraction
│   ├── choice/
│   ├── dropdown/
│   ├── fill-in/
│   └── shared/
└── references/
    ├── platform-gotchas.md      # Known platform quirks
    ├── command-reference.md     # agent-browser CLI reference
    └── qa-report-format.md      # Report template
```

## Prerequisites

- [agent-browser](https://github.com/anthropics/agent-browser) installed at `/opt/homebrew/bin/agent-browser`
- Claude Code CLI

## Usage

1. Add exercise URLs to `urls/url_list.txt` (one per line, status `ToDo`)
2. Run Claude Code in this directory
3. Claude will automatically execute the QA workflow per CLAUDE.md

## Verification

Each question is validated with **three-way consistency**:

1. **Independent calculation** — solve the math independently
2. **Platform answer** — submit and check if accepted
3. **Hint final answer** — expand all hint steps and compare

Any inconsistency is flagged as a potential error.
