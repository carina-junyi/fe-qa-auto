# Agent-Browser QA Workflow Instructions

## Overview

對均一教育平台的數學練習頁面進行 QA 驗證，檢查題幹、選項、答案與解題說明是否有**數學錯誤**。

## Source Data

- **URL list**: `urls/url_list.txt` — 每行格式 `<url> <status>`

  支援兩種 URL 類型：

  | URL 類型 | 特徵 | 處理方式 |
  |----------|------|----------|
  | **題目 URL** | 含 `/exercises/` | 直接進入 QA 流程 |
  | **資料夾 URL** | 不含 `/exercises/`（如 `/course-compare/...`） | Step 0 自動展開為底下的題目 URL |

  | 狀態 | 說明 | 何時標記 |
  |------|------|----------|
  | `ToDo` | 尚未開始（可省略） | URL 加入時 |
  | `InProgress` | 正在 QA | Subagent 開始時 |
  | `Pass` | 無數學錯誤 | Subagent 完成後 |
  | `Fail` | 有數學錯誤 | Subagent 完成後 |
  | `Warn` | 數學內容正確（透過 API 備援確認），但 browser 操作有困難，頁面渲染未完整驗證 | Subagent 完成後 |

  **只處理 `ToDo`（或無狀態）的 URL。** 以 `#` 開頭的行為註解，會被略過。

## Reference Files

| 檔案 | 內容 |
|------|------|
| `references/platform-gotchas.md` | 平台特殊行為與解法 |
| `references/command-reference.md` | agent-browser 指令速查 |
| `references/qa-report-format.md` | QA_result.txt 格式規範 |
| `references/subagent-prompt-template.md` | Subagent prompt 模板 |
| `references/subagent-return-format.json` | Subagent 回傳 JSON 格式 |
| `scripts/` | JS 工具檔（直接 `cat scripts/xxx.js` 使用） |
| `page_structures/` | DOM 結構、CSS selectors |

---

## Workflow

### Step 0: Resolve URLs（展開資料夾連結）

```
/resolve-urls
```

掃描 `url_list.txt`，將資料夾 URL（不含 `/exercises/`）展開為底下的題目 URL。已展開或純題目 URL 的檔案不受影響。

---

### Step 1: 讀取待處理 URL

讀取 `urls/url_list.txt`，篩選出所有 `ToDo`（或無狀態）的 URL。

### Step 2: 對每個 URL spawn Subagent

讀取 `references/subagent-prompt-template.md` 中的 prompt 模板，將 `{url}` 和 `{session}` 替換為實際值後，spawn subagent。

每個 URL 使用獨立的 agent-browser session（如 `qa-1`、`qa-2`...），避免 browser 衝突。

```
for i, url in enumerate(todo_urls):
    session = f"qa-{i+1}"
    prompt = template.replace("{url}", url).replace("{session}", session)
    spawn subagent(prompt, session)
```

#### 執行模式

- **並行模式**（預設）：所有 subagent 同時執行（各用不同 session），用 `run_in_background: true`
- **序列模式**：一個 subagent 完成後再 spawn 下一個（除錯時使用）

### Step 3: 收集結果

每個 subagent 完成後回傳 JSON（格式見 `references/subagent-return-format.json`）。

主 Agent 負責：

1. **解析 JSON**：從 subagent 回傳中提取 status、questions、errors
2. **驗證嚴謹度**：檢查每題的 `hintsVerification` 欄位，確認 subagent 有逐步驗算：
   - 每題都必須有 `hintsVerification` 陣列，若缺少則視為驗證不完整
   - 陣列長度必須等於 `hintsSteps`（每一步都有驗算記錄）
   - 每筆記錄都必須有 `myCalculation`（有自己重算）
   - `match: false` 的必須附 `error` 欄位
   - 若 subagent 未提供完整的 `hintsVerification`，主 agent 應標註該 URL 為驗證不完整，要求重新執行
3. **更新 url_list.txt**：根據 `status` 欄位更新對應 URL 的狀態（Pass/Fail/Warn）
4. **記錄結果**：暫存每個 URL 的 JSON 結果，供 Step 4 組裝報告

### Step 4: Generate QA Report

檢查是否有任何 URL 的狀態為 `Fail` 或 `Warn`。**若有，產生 `QA_result.txt`**：

根據 `references/qa-report-format.md` 的格式，將所有 subagent 回傳的 JSON 組裝成報告：

- `status` → PASS / FAIL / WARN
- `questions[].stem` → Stem 欄位
- `questions[].myAnswer` → Answer 欄位
- `questions[].platformAnswer` → Platform 欄位
- `questions[].errors[]` → 錯誤描述區塊
- `questions[].notes` → Notes 欄位

若全部 Pass（無 Fail 也無 Warn），則不需要產生報告。

---

## Subagent 內部流程（參考用）

Subagent 的詳細執行流程定義在 `references/subagent-prompt-template.md`，包含：

- 偵測題組類型（sequential_quiz / exercise）
- 依序型：全程 browser 逐題驗證
- 累積型：Phase 1 browser + Phase 2 API
- 每題：擷取題幹 → 獨立計算 → 填答 → 提交 → 展開 hints → 驗證
- 答錯復原流程
- 結構化 JSON 回傳

### 關鍵規則（Subagent 必須遵守）

- **嚴格模式**：每一題都必須展開所有 hints，逐步驗證數學正確性
- **依序型全程 browser**：不得跳過 browser 改用 API
- **獨立計算**：不可使用 API 的答案提交，答案必須獨立計算
- **答錯不放棄**：展開 hints → reload → dot navigation → 繼續

---

## Edge Cases

| 情況 | 處理 |
|------|------|
| 需要登入 | `SKIPPED (requires login)` |
| 頁面未載入 | `wait --load networkidle` + `wait 3000` 重試 |
| 元素不在畫面內 | `scrollintoview @eN` 或 `scroll down 300` |
| `find text` 多重匹配 | 改用 CSS selector |
| diagnostic-exam 類型 | `SKIPPED (非 exercises 類型)` |
