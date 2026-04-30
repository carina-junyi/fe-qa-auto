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
  | `InProgress` | 正在 QA | Step 1 |
  | `Pass` | 無數學錯誤 | Step 6 |
  | `Fail` | 有數學錯誤 | Step 6 |
  | `Warn` | 數學內容正確（透過 API 備援確認），但 browser 操作有困難，頁面渲染未完整驗證 | Step 6 |

  **只處理 `ToDo`（或無狀態）的 URL。** 以 `#` 開頭的行為註解，會被略過。

## Execution Rules

- **自動執行**，僅以下情況暫停詢問使用者：
  - `agent-browser` 找不到或啟動失敗
  - URL 重試後仍無法開啟
  - 偵測到登入牆
  - 系統層級錯誤
- **所有 URL 完成後**產生 `QA_result.txt`（格式見 `references/qa-report-format.md`）。
- **嚴格模式（必須遵守）**：每一題都必須展開所有解題說明步驟（hints），逐步驗證每一步的數學正確性，不得跳過任何題目的 hints 驗證。
- **依序型（sequential_quiz）必須全程 browser 驗證**：不得因為答錯、操作失敗或效率考量而跳過 browser 改用 API 驗證。API 僅供備援 double check（標 Warn），不可取代 browser 流程。
- **答錯復原流程**：在依序型中答錯時，平台會重複出同一題且可能新增額外題目。處理方式：
  1. 展開 hints 確認正確答案
  2. 用 reload 跳到下一題（平台會載入下一個未答題目）
  3. 若 reload 後仍停在同一題或回到已答題，用 dot navigation（點擊未作答的圓點）跳到下一個未答題
  4. 繼續正常 browser 流程，不得放棄

## Reference Files

| 檔案 | 內容 |
|------|------|
| `references/platform-gotchas.md` | 平台特殊行為與解法 |
| `references/command-reference.md` | agent-browser 指令速查 |
| `references/qa-report-format.md` | QA_result.txt 格式規範 |
| `page_structures/` | DOM 結構、CSS selectors、JS extraction |

---

## Workflow

### Step 0: Resolve URLs（展開資料夾連結）

```
/resolve-urls
```

掃描 `url_list.txt`，將資料夾 URL（不含 `/exercises/`）展開為底下的題目 URL。已展開或純題目 URL 的檔案不受影響。

---

## Workflow Per URL

### Step 1: Open the Page

```bash
/opt/homebrew/bin/agent-browser open "<url>"
```

開啟後將 `url_list.txt` 中該 URL 標記為 `InProgress`，並記錄開始時間（用於計算該 URL 的 QA 耗時）。

### Step 2: Probe the Page

```
/probe-page
```

探測頁面結構、題組資訊、關鍵元素 ref。

### Step 2b: 累積型題組策略（exerciseMode = exercise 時）

當 `/probe-page` 回傳 `exerciseMode: "exercise"` 時，需要特殊處理：

**目標**：驗證題目池中的**所有題目**，而非只做到「答對 N 題」就停止。

#### Phase 1：Browser 驗證（前 passCondition - 1 題）

從 `/probe-page` 取得 `passCondition`（累積答對幾題即通過，可透過 `window.Exercises.passCondition` 取得）。

正常用 browser 做題（Step 3-7 流程），但**只答對 passCondition - 1 題**。
例如 `passCondition = 5` 時，答對 4 題後停止，避免觸發通過。

- 每題記錄 qid，追蹤已覆蓋的題目
- 第 passCondition 題使用 hint-first（先點 `#hint` 再提交），平台會視為未答對，不會累積

#### Phase 2：API 驗證（剩餘未覆蓋的 qid）

Phase 1 結束後，比對 API 偵察取得的完整 qid 清單，找出尚未覆蓋的 qid。
對這些題目改用 API 資料驗證：

1. **取得題目資料**：從 API 的 `get_question` 回傳中，找到對應 qid 的 `question` 和 `hints`
2. **圖片處理**：若題目含圖片 widget，從 `backgroundImage.url`（S3 公開連結）下載圖片，視覺判讀內容
3. **數學驗證**：根據題幹文字 + 圖片，獨立計算答案，逐步驗證 hints
4. **輕量 browser 截圖**：開啟頁面截圖，確認題目渲染正常（公式、圖片、排版）
   - 累積型會隨機出題，截到哪題就驗證哪題的渲染
   - 不需要填答或提交

> **注意**：Phase 2 中不可直接使用 API 的答案。答案必須由 agent 獨立計算。

#### qid 覆蓋追蹤

- 從 `/probe-page` 的 API 偵察取得完整 qid 清單
- Phase 1 + Phase 2 結束後，確認所有 qid 都已驗證
- 若有 qid 在 Phase 2 中使用了 API 資料做 double check，須在報告 Notes 中標註

> 依序型（`sequential_quiz`）不需要此策略，直接按現有流程逐題做完即可。

### Step 3: Extract and Verify Stem

```
/extract-and-verify-stem
```

擷取題幹並驗證數學正確性。

### Step 4: Identify Question Type

```
/identify-question-type
```

掃描頁面上所有互動元素，回傳元素清單（`elements`）與摘要（`summary`）。

### Step 5: 依元素組合分派 QA Skill

根據 `/identify-question-type` 回傳的 `summary`，按以下規則**依序**呼叫對應 skill。
一題可能包含多種元素（如下拉 + 文字輸入），需要呼叫多個 skill 分別處理各自的元素，**最後統一提交一次**。

#### 5a. 分派規則

| summary 中包含的元素 | 呼叫的 Skill | 說明 |
|---------------------|-------------|------|
| `radio` 或 `checkbox` | `/qa-choice-question` | 解題→點選正確選項 |
| `select` | `/qa-dropdown-question` | 解題→選擇下拉選項 |
| `mathquill` | `/qa-fill-question` | 解題→MathQuill 逐字輸入 |
| `text-input` | `/qa-fill-question` | 解題→普通輸入框填值 |
| `drag-sort` | `/qa-drag-question` | 解題→鍵盤拖曳排序 |
| 全部為空 | 不呼叫 skill | 該題標記 SKIPPED，進入「Step 5c 跳題機制」 |

#### 5b. 混合題型執行順序

當同一題包含多種元素時：

1. 先獨立解題，計算出**所有子題**的正確答案
2. 依元素在頁面上的出現順序（由上到下），逐一呼叫對應 skill 填入答案
   - 各 skill 只負責**填入/選擇答案**（Step A + Step B），**不要提交**
3. 全部元素填完後，**統一執行一次提交**（`click "#check-answer-button"`）
4. 處理彈窗 & 檢查結果
5. 展開所有解題說明並驗證數學正確性

> **注意**：提交答案只需按一次 `#check-answer-button`，平台會一次性檢查所有子題。

#### 5b-3. 統一提交

```bash
/opt/homebrew/bin/agent-browser click "#check-answer-button"
/opt/homebrew/bin/agent-browser wait 2000
/opt/homebrew/bin/agent-browser press Escape
/opt/homebrew/bin/agent-browser wait 500
```

用 DOM eval 檢查提交結果：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/check_result.js)"
```

#### 5b-4. 展開所有解題說明（必要步驟，不得跳過）

重複點擊 `#hint` 以展開所有解題步驟：

```bash
for i in 1 2 3 4 5; do
  /opt/homebrew/bin/agent-browser click "#hint" && /opt/homebrew/bin/agent-browser wait 800
done
```

用 DOM eval 擷取所有解題說明：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/extract_hints.js)"
```

**如何確認已看完所有步驟：** 最後一步 (N/N) 通常包含「答案選 (X)」或「答案為 X」。

**重要：** Hints 渲染在 `.hints-area`（MUI component），不是 `#hintsarea`（legacy，永遠是空的）。

#### 5b-5. 驗證數學正確性（必要步驟，不得跳過）

**必須逐步驗證每一條解題說明（hint）中的數學計算是否正確。**

| 檢查項目 | 驗證內容 |
|----------|---------|
| **題幹** | 數字、公式、條件是否正確？ |
| **選項（若有）** | 選項是否數學上合理？有無重複或無意義的值？ |
| **正確答案** | 平台接受的答案是否與自己的計算一致？ |
| **解題說明** | 每一步計算是否正確？逐步驗證。 |
| **三方一致性** | 自己的計算、平台接受的答案、解題說明最終步驟的答案，三者是否完全一致？ |

### Step 5c: 跳題機制（遇到不支援的題型時）

遇到不支援的題型（如互動式座標平面畫圖等）時，**不跳過整個 URL**，而是：

1. 該題標記為 `SKIPPED（非支援題型，請使用者手動 QA）`

2. **策略 A（優先）：透過 hints 取得正確答案後提交**
   - 重複點擊 `#hint` 直到所有步驟展開（N/N）
   - 從最後一步 hint 擷取正確答案
   - 用該答案提交（依題型用 click 或 press 輸入）
   - 平台判定答對後自動出現「下一題」按鈕

3. **策略 B（備用）：reload 跳題**
   適用於連答案都無法透過鍵盤/滑鼠輸入的題型（如拖曳、畫圖）：
   ```bash
   # 先點完所有 hints（確保 hint 資訊已載入，供 QA 報告記錄）
   for i in 1 2 3 4 5; do
     /opt/homebrew/bin/agent-browser click "#hint" && /opt/homebrew/bin/agent-browser wait 800
   done

   # 擷取 hints 內容（供 QA 報告驗證數學正確性）
   /opt/homebrew/bin/agent-browser eval "$(cat scripts/extract_hints.js)"

   # reload 頁面，平台會自動跳到下一個未答題目
   /opt/homebrew/bin/agent-browser reload
   /opt/homebrew/bin/agent-browser wait 5000
   ```

   > **為什麼用 reload？** 平台的「下一題」按鈕在答錯時為 `disabled`，
   > JS 強制移除 disabled 後 `.click()` 或 jQuery `.trigger('click')` 都無法觸發 React 的事件處理。
   > Reload 後平台會自動載入下一個 unanswered 題目。

4. 確認頁面已切換到下一題（擷取題幹驗證不同），回到 Step 3 繼續 QA
5. 在 QA_result.txt 中記錄該題為 SKIPPED 及原因

> **注意**：平台只有答對才會顯示「下一題」按鈕，答錯不會自動跳題。因此**不要**嘗試提交錯誤答案來跳題。

### Step 6: Update url_list.txt

- 所有題目皆正確 → `Pass`
- 任一題有數學錯誤 → `Fail`
- 數學內容正確，但 browser 操作遇到困難而使用了 API 備援 → `Warn`
- 記錄該 URL 的 QA 結束時間，計算耗時（Duration），供 QA_result.txt 使用。

### Step 7: Next Question (if in a question group)

```bash
/opt/homebrew/bin/agent-browser find text "下一題" click
/opt/homebrew/bin/agent-browser wait 2000
```

回到 Step 3 重複。

### Step 8: Generate QA Report（所有 URL 完成後）

檢查是否有任何 URL 的狀態為 `Fail` 或 `Warn`。**若有 Fail 或 Warn，必須產生報告：**

```
/generate-qa-report
```

收集所有 URL 的 QA 結果，產生 `QA_result.txt`。

若全部 Pass（無 Fail 也無 Warn），則不需要產生報告。

---

## Edge Cases

| 情況 | 處理 |
|------|------|
| 需要登入 | `SKIPPED (requires login)` |
| 頁面未載入 | `wait --load networkidle` + `wait 3000` 重試 |
| 元素不在畫面內 | `scrollintoview @eN` 或 `scroll down 300` |
| `find text` 多重匹配 | 改用 CSS selector |
