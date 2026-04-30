---
name: qa-dropdown-question
description: QA Dropdown Question (下拉選單題 QA 流程)
---

# QA Dropdown Question (下拉選單題 QA 流程)

針對頁面中的下拉式選單（`<select>`）元素執行答案選擇。此 skill 僅處理 `<select>` 元素，不處理文字輸入框或 MathQuill。

**前置條件：**
- 頁面已開啟且題幹已擷取（Step 3-4 已完成）
- `/identify-question-type` 的 `elements` 中包含 `type: "select"` 的元素

**注意：** 此 skill 只負責**擷取選項 + 填入答案**。提交、解題說明展開、驗證由主流程統一處理（見 CLAUDE.md Step 5b）。

---

## Step A: 擷取下拉選單資訊

使用 DOM eval 取得所有 `<select>` 元素的選項與位置：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/extract_dropdown.js)"
```

**降級：** 若 DOM eval 失敗：

1. **snapshot** — 找 `combobox [ref=eN]` 元素
2. **screenshot** — 視覺辨識下拉選單（帶下拉箭頭的矩形框）

```bash
/opt/homebrew/bin/agent-browser snapshot
/opt/homebrew/bin/agent-browser screenshot
```

---

## Step B: 獨立解題並選擇答案

根據題幹獨立計算正確答案，然後選擇對應的下拉選項。

### 使用 `agent-browser select`

```bash
# 方法 1：用 snapshot ref
/opt/homebrew/bin/agent-browser select @eN "<value>"

# 方法 2：用 JS 指定特定 select（傳入 index 和 value）
/opt/homebrew/bin/agent-browser eval "$(cat scripts/set_select.js)(0, '<value>')"
```

**重要：** `<value>` 是 option 的 `value` 屬性（如 `"1"`, `"2"`），不是顯示文字（如 `"向上"`, `"向下"`）。第一個選項（value `"0"`）通常是 disabled 的 placeholder。

### 多個下拉選單

依序對每個 `<select>` 設定值，用 JS 中的 index 區分：

```bash
# 依序對每個 select 設定值，用不同 index：
/opt/homebrew/bin/agent-browser eval "$(cat scripts/set_select.js)(0, '<value_for_first>')"
/opt/homebrew/bin/agent-browser eval "$(cat scripts/set_select.js)(1, '<value_for_second>')"
```

---

## 輸出

完成後回傳以下結構化結果，供主流程合併：

```
下拉選單 QA 結果：
- selectCount: <下拉選單數量>
- mySelections: [{idx, selectedText, selectedValue}]
- notes: <降級紀錄或其他觀察>
```
