# fe-qa-auto

Automated QA testing for Junyi Academy math exercises — validates question stems, answers, and hint explanations via browser automation with parallel subagent execution.

## Overview

對均一教育平台的數學練習頁面進行自動化 QA 驗證，檢查題幹、選項、答案與解題說明（hints）是否有數學錯誤。

## Architecture

```
主 Agent（協調者）
│
├─ 讀取 url_list.txt
├─ 對每個 URL 並行 spawn Subagent（各用獨立 browser session）
├─ 收集 JSON 結果 + 驗證嚴謹度（hintsVerification）
├─ 更新 url_list.txt
└─ 產生 QA_result.txt
```

每個 Subagent 獨立執行完整 QA 流程，使用 `agent-browser --session` 避免 browser 衝突。

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
主 Agent:
  Step 0:  Pre-flight Check（檢查 agent-browser、url_list.txt、scripts/）
  Step 1:  Resolve URLs（展開資料夾 URL）
  Step 2:  讀取待處理 URL
  Step 3:  並行 spawn Subagent（每個 URL 一個）
  Step 4:  收集結果 + 驗證嚴謹度
  Step 5:  產生 QA report

Subagent（每個 URL）:
  1. 開啟頁面 + 偵測類型（sequential_quiz / exercise）
  2A. 依序型：全程 browser 逐題驗證
  2B. 累積型：Phase 1 browser（passCondition-1 題）+ Phase 2 API 驗證剩餘 qid
  3. 回傳結構化 JSON（含 hintsVerification）
```

詳細流程見 [CLAUDE.md](CLAUDE.md)。

## Project Structure

```
.
├── CLAUDE.md                    # 主 Agent 工作流程
├── QA_result.txt                # QA 報告（自動產生）
├── urls/
│   └── url_list.txt             # 待 QA 的 URL 清單
├── scripts/                     # JS 工具檔（17 個，直接 cat 使用）
│   ├── probe_page.js                # 偵測頁面結構與題組類型
│   ├── api_recon.js                 # API 取得題目池清單
│   ├── extract_qid.js               # 取得題目 qid
│   ├── extract_stem.js              # 擷取題幹
│   ├── identify_qtype.js            # 辨識題型
│   ├── extract_hints.js             # 擷取解題說明
│   ├── check_result.js              # 檢查提交結果
│   ├── extract_choices.js           # 擷取選項
│   ├── extract_inputs.js            # 擷取輸入框
│   ├── extract_dropdown.js          # 擷取下拉選單
│   ├── extract_drag_items.js        # 擷取拖曳項目
│   ├── set_mq.js                    # MathQuill 填值（參數式）
│   ├── set_mq_latex.js              # MathQuill 填值（替代版）
│   ├── set_select.js                # 下拉選單選值（參數式）
│   ├── focus_drag_item.js           # 聚焦拖曳項目（參數式）
│   └── dom_explore.js               # DOM 結構探索
├── .claude/
│   └── skills/                  # Skill 定義（Subagent 需要時讀取）
│       ├── resolve-urls/
│       ├── probe-page/
│       ├── extract-and-verify-stem/
│       ├── identify-question-type/
│       ├── qa-choice-question/
│       ├── qa-fill-question/
│       ├── qa-dropdown-question/
│       ├── qa-drag-question/
│       └── generate-qa-report/
├── references/
│   ├── subagent-prompt-template.md  # Subagent prompt 模板
│   ├── subagent-return-format.json  # Subagent 回傳 JSON 格式
│   ├── qa-report-format.md          # QA 報告格式
│   ├── platform-gotchas.md          # 平台特殊行為
│   └── command-reference.md         # agent-browser 指令速查
└── page_structures/             # DOM 結構、CSS selectors
```

## Prerequisites

- [agent-browser](https://github.com/vercel-labs/agent-browser) installed at `/opt/homebrew/bin/agent-browser`
- Claude Code CLI

## Usage

### 1. 準備 URL 清單

在 `urls/url_list.txt` 中貼上要 QA 的 URL（每行一個）：

```
https://www.junyiacademy.org/exercises/jnc-6-09-1-5a?topic=... ToDo
https://www.junyiacademy.org/exercises/jnc-6-05-1-2f?topic=... ToDo
```

### 2. 執行 QA

在此目錄下啟動 Claude Code，Claude 會依照 [CLAUDE.md](CLAUDE.md) 自動：
- 並行 spawn subagent 處理每個 URL
- 收集結果並驗證嚴謹度
- 更新 url_list.txt 狀態

### 3. 查看結果

- `urls/url_list.txt` — 每個 URL 的狀態：`Pass` / `Fail` / `Warn` / `Skipped`
- `QA_result.txt` — 詳細報告（有 Fail 或 Warn 時產生）

## Exercise Modes

平台有兩種題組類型，透過 `window.Exercises.contentType` 自動偵測：

| 類型 | `contentType` | 說明 | QA 策略 |
|------|--------------|------|---------|
| 依序型 | `sequential_quiz` | 固定 N 題，全部做完 | 全程 browser 逐題驗證 |
| 累積型 | `exercise` | 從題目池隨機出題 | Phase 1: browser 做 passCondition-1 題 → Phase 2: API 驗證剩餘 qid |

### API 偵察

透過 `/api/v2/perseus/<exercise-id>/get_question` 取得完整題目池（含所有 qid）。

> API 呼叫必須透過 browser eval 執行（需要 session cookie），不可用 curl。
> API 的答案不可直接使用提交，答案必須由 agent 獨立計算。

## Verification

每題透過**三方一致性**驗證：

1. **Independent calculation** — agent 獨立計算答案
2. **Platform answer** — 提交後確認平台接受
3. **Hint verification** — 展開每步 hint，逐步重新計算驗證

### 嚴格驗證（hintsVerification）

Subagent 回傳的 JSON 中，每題必須包含 `hintsVerification` 陣列，記錄每步 hint 的驗算過程：

```json
{
  "hintsVerification": [
    {
      "step": "1/3",
      "hintContent": "125-100=25",
      "myCalculation": "125-100=25",
      "match": true
    }
  ]
}
```

主 Agent 會檢查此欄位確認 subagent 有逐步驗算，而非只看最終答案。

## Known Limitations

### 部分題型不支援自動化
| 題型 | 原因 |
|------|------|
| 座標平面拖曳畫圖（Raphael/SVG） | 需要在 canvas 上拖曳點，無法透過鍵盤或 API 操作 |
| diagnostic-exam 類型 | 非 exercises 頁面，不適用目前 QA 流程 |

### QA 報告產生規則
- 有任何 URL 為 `Fail` 或 `Warn` → 自動產生 `QA_result.txt`
- 全部 `Pass` → 不產生報告
