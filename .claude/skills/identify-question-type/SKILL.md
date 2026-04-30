---
name: identify-question-type
description: Identify Question Type (判斷題型)
---

# Identify Question Type (判斷題型)

掃描目前瀏覽器中開啟的 Junyi Academy 練習頁面，偵測**所有互動元素**，回傳元素清單供主流程分派對應的 QA Skill。

## 執行步驟

### 1. DOM 探測（Primary）

將以下 JS 寫入暫存檔後用 `eval` 執行：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/identify_qtype.js)"
```

### 2. 判定 DOM 探測失敗

如果 `eval` 回傳 `elements` 為空陣列或命令本身報錯，進入降級流程。

### 3. 降級 1 — Snapshot

```bash
/opt/homebrew/bin/agent-browser snapshot
```

從 snapshot 的 accessibility tree 判斷：

| Snapshot 特徵 | 元素類型 |
|--------------|---------|
| `combobox [ref=eN]` | select（下拉選單） |
| `textbox [ref=eN]` | text-input 或 mathquill（輸入框） |
| 多個 `radio` 角色元素 | radio（單選） |
| 多個 `checkbox` 角色元素 | checkbox（多選） |
| 多個連續 `button [ref=eN]` 含 math 內容 + 提示「長按再進行拖曳」 | drag-sort（拖曳排序） |

### 4. 降級 2 — Screenshot

```bash
/opt/homebrew/bin/agent-browser screenshot
```

從截圖視覺判斷：

| 視覺特徵 | 元素類型 |
|----------|---------|
| 帶下拉箭頭的矩形框 | select（下拉選單） |
| 白色矩形帶灰色邊框 | text-input 或 mathquill（輸入框） |
| 圓形 radio button + 編號選項 | radio（單選） |
| 方形 checkbox + 編號選項 | checkbox（多選） |

### 5. 輸出格式

最終必須輸出以下結構化結果供主流程使用：

```
頁面元素掃描結果：
- confidence: high / medium / low
- method: DOM / snapshot / screenshot
- elements: [
    {type: "select", idx: 0, options: [...], ...},
    {type: "text-input", idx: 0, ...},
    {type: "mathquill", idx: 0, ...},
    {type: "radio", idx: 0, ...},
    {type: "checkbox", idx: 0, ...},
    {type: "drag-sort", idx: 0, draggableId: "0", text: "...", ...}
  ]
- summary: {select: N, text-input: N, mathquill: N, radio: N, checkbox: N, drag-sort: N, choiceType: "單選"/"多選"}
```

主流程會根據 `summary` 決定呼叫哪些 QA Skill（見 CLAUDE.md Step 5）。

若 `elements` 為空，該題標記為 `SKIPPED (非支援題型，請使用者手動 QA)`，透過 CLAUDE.md 的「Step 5b 跳題機制」跳過該題。同時執行以下探索以記錄頁面結構：

### 6. Unknown 題型探索（僅 elements 為空時執行）

#### 6a. 截圖 + snapshot 記錄頁面現況

```bash
/opt/homebrew/bin/agent-browser screenshot
/opt/homebrew/bin/agent-browser snapshot
```

#### 6b. DOM 探索，嘗試辨識新的元素結構

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/dom_explore.js)"
```

#### 6c. 將探索結果寫入 page_structures/

根據探索發現的元素特徵，在 `page_structures/` 下建立對應的新檔案：

- 若能辨識出新題型類別，建立新資料夾（如 `page_structures/drag-drop/`）
- 若無法歸類，寫入 `page_structures/shared/unknown-<url-slug>.md`
- 檔案格式需遵循 `page_structures/README.md` 中定義的標準格式

將探索發現同時記錄到 QA_result.txt 該題的 Notes 欄位。
