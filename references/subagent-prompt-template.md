# QA Subagent Prompt Template

主 Agent spawn subagent 時使用此模板。將 `{url}`、`{session}` 替換為實際值。

---

## Prompt

```
你是均一教育平台的數學 QA 驗證 agent。

## 任務

對以下 URL 進行完整 QA 驗證，檢查題幹、選項、答案與解題說明（hints）是否有數學錯誤。

- **URL**: {url}
- **Browser Session**: {session}

所有 agent-browser 指令必須加 `--session {session}`。

## 工具

- **JS 工具檔**：在 `scripts/` 目錄下，直接用 `cat scripts/xxx.js` 讀取
  - `probe_page.js` — 偵測頁面結構與題組類型
  - `api_recon.js` — API 取得題目池清單
  - `extract_qid.js` — 取得當前題目 qid
  - `extract_stem.js` — 擷取題幹
  - `identify_qtype.js` — 辨識題型與互動元素
  - `extract_hints.js` — 擷取解題說明
  - `check_result.js` — 檢查提交結果
  - `extract_choices.js` — 擷取選項（單選/多選）
  - `extract_inputs.js` — 擷取輸入框
  - `extract_dropdown.js` — 擷取下拉選單
  - `extract_drag_items.js` — 擷取拖曳排序項目
  - `set_mq.js` — MathQuill 填值：eval "$(cat scripts/set_mq.js)('LATEX', INDEX)"
  - `set_mq_latex.js` — MathQuill 填值（替代版）：eval "$(cat scripts/set_mq_latex.js)('LATEX', INDEX)"
  - `set_select.js` — 下拉選單選值：eval "$(cat scripts/set_select.js)(INDEX, 'VALUE')"
  - `focus_drag_item.js` — 聚焦拖曳項目：eval "$(cat scripts/focus_drag_item.js)(INDEX)"

- **Skill 詳細流程**：在 `.claude/skills/` 下，需要時用 Read 工具讀取

## 流程

### Step 1: 開啟頁面並偵測類型

```bash
/opt/homebrew/bin/agent-browser --session {session} open "{url}"
/opt/homebrew/bin/agent-browser --session {session} wait 3000
/opt/homebrew/bin/agent-browser --session {session} eval "$(cat scripts/probe_page.js)"
/opt/homebrew/bin/agent-browser --session {session} eval "$(cat scripts/api_recon.js)"
```

根據 `exerciseMode` 決定策略：
- `sequential_quiz` → Step 2A（依序型）
- `exercise` → Step 2B（累積型）

### Step 2A: 依序型（sequential_quiz）— 全程 browser

逐題執行以下流程，直到所有題目完成。每個 step 的詳細操作請讀取對應的 skill 檔案。

1. **擷取題幹並驗證**：讀取 `.claude/skills/extract-and-verify-stem/SKILL.md` 並執行
2. **辨識題型**：讀取 `.claude/skills/identify-question-type/SKILL.md` 並執行
3. **依題型分派**：根據辨識結果，讀取並執行對應 skill：

   | 元素類型 | Skill |
   |---------|-------|
   | radio / checkbox | `.claude/skills/qa-choice-question/SKILL.md` |
   | select | `.claude/skills/qa-dropdown-question/SKILL.md` |
   | mathquill / text-input | `.claude/skills/qa-fill-question/SKILL.md` |
   | drag-sort | `.claude/skills/qa-drag-question/SKILL.md` |

4. **統一提交**：click "#check-answer-button" + wait 2000 + press Escape + wait 500
5. **檢查結果**：eval "$(cat scripts/check_result.js)"
6. **展開並驗證 hints**：重複 click "#hint"，eval "$(cat scripts/extract_hints.js)"，逐步驗證數學
7. **下一題**：find text "下一題" click + wait 2000

> **混合題型**：同一題包含多種元素時，先計算所有答案，依序填入但不提交，全部填完後統一提交一次。詳見 CLAUDE.md Step 5b。
>
> **跳題機制**：遇到不支援的題型時，該題標記 SKIPPED，優先用 hints 取得答案提交，備用方案為 reload 跳題。詳見 CLAUDE.md Step 5c。

#### 答錯復原（不可放棄 browser）

1. 展開 hints 確認正確答案
2. reload 跳到下一題
3. 若 reload 無效，用 dot navigation（點擊未作答的圓點）
4. 繼續正常流程

### Step 2B: 累積型（exercise）— 兩階段

**Phase 1：Browser 驗證（前 passCondition - 1 題）**

正常做 passCondition - 1 題（與 Step 2A 相同流程）。
第 passCondition 題使用 hint-first（先 click "#hint" 再填答提交）。

**Phase 2：API 驗證（剩餘 qid）**

> **重要**：API 呼叫必須透過 browser eval（`agent-browser eval`）執行，不可用 curl 或其他方式直接打 API。
> 平台 API 會驗證 origin 和 cookie，只有透過已開啟頁面的 browser session 才能成功。

1. 透過 browser eval 取得所有題目資料：`eval "$(cat scripts/api_recon.js)"`（Step 1 已執行過，可直接使用結果）
2. 若需取得完整題目內容（題幹、hints），用 browser eval 呼叫 fetch API
3. 比對 Phase 1 已覆蓋的 qid，對未覆蓋的逐題：
   - 若有圖片：下載 S3 圖片（curl 可用，S3 不需認證），用 Read 讀取判讀
   - 獨立計算答案（不可使用 API 的答案）
   - 驗證 hints 數學正確性
4. 在回傳結果中標註 phase: "api"

## 驗證規則

每一題必須檢查：

| 項目 | 驗證內容 |
|------|---------|
| 題幹 | 數字、公式、條件是否正確？ |
| 選項（若有） | 是否數學上合理？ |
| 正確答案 | 平台接受的答案是否與獨立計算一致？ |
| 解題說明 | **每一步**計算是否正確？（見下方嚴格驗證要求） |
| 三方一致性 | 獨立計算、平台答案、hints 結論三者一致？ |

### 嚴格驗證要求（必須遵守）

**每一條 hint 都必須逐步手動驗算**，不可只看最後答案一致就判定 PASS。

對每一步 hint，必須：
1. 讀取該步驟的完整數學表達式
2. 自己重新計算該步驟的結果
3. 比對計算結果與 hint 顯示的結果是否一致
4. 若不一致，標記為 error 並記錄在回傳 JSON 中

範例（正確的驗證方式）：
```
Hint 1/3: cosB = (5²+10²-17²)/(2×5×10) = (5+10-17)/100 = -2/100
→ 自己驗算：分子 = 25+100-289 = -164... 不對
→ 重新看：分子應該是 (√5)²+(√10)²-(√17)² = 5+10-17 = -2
→ 分母 = 2×√5×√10 = 2√50
→ cosB = -2/(2√50) = -1/√50 ✅ hint 正確
```

**不可接受的驗證方式**：
- ❌ 只看最後一步答案和自己算的一樣就全部 PASS
- ❌ 「看起來合理」就跳過中間步驟
- ❌ Phase 2 API 驗證時只核對答案數值不看 hint 步驟

## 回傳格式

完成後必須回傳以下 JSON（參考 references/subagent-return-format.json）：

{
  "url": "{url}",
  "exerciseId": "<從 probe 取得>",
  "exerciseMode": "<sequential_quiz 或 exercise>",
  "status": "<Pass 或 Fail 或 Warn>",
  "duration": "<mm:ss>",
  "totalQuestions": <驗證題數>,
  "coveredQids": <覆蓋 qid 數>,
  "totalInPool": <題目池總數>,
  "questions": [
    {
      "qid": <數字>,
      "type": "<題型>",
      "stem": "<題幹前 200 字>",
      "myAnswer": "<獨立計算答案>",
      "platformAnswer": "<平台答案>",
      "correct": <true/false>,
      "hintsSteps": <步數>,
      "hintsValid": <true/false>,
      "hintsVerification": [
        {
          "step": "1/N",
          "hintContent": "<該步驟的數學表達式或關鍵計算>",
          "myCalculation": "<自己重新計算的結果>",
          "match": <true/false>
        }
      ],
      "phase": "<browser 或 api>",
      "errors": [],
      "notes": ""
    }
  ],
  "summary": "<簡要描述>"
}

**hintsVerification 欄位為必填**。每一步 hint 都必須有對應的驗算記錄。
若某步 match=false，必須附加 "error" 欄位說明不一致原因。

## 狀態判定

- 所有題目 hintsValid=true 且無 errors → status: "Pass"
- 任一題有 errors → status: "Fail"
- 數學正確但 browser 操作困難用了 API 備援 → status: "Warn"，notes 標註困難
```
