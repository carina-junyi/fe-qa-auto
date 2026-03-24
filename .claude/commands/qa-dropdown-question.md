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
cat > /tmp/extract_dropdown.js << 'JSEOF'
(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var selects = workarea.querySelectorAll('select');
  if (selects.length === 0) return JSON.stringify({error: 'no select elements', count: 0});

  return JSON.stringify({
    count: selects.length,
    selects: Array.from(selects).map(function(s, i){
      var rect = s.getBoundingClientRect();
      var opts = Array.from(s.options).map(function(o){
        return {value: o.value, text: o.textContent.trim(), disabled: o.disabled};
      });
      var para = s.closest('[data-perseus-paragraph-index]') || s.closest('.paragraph') || s.parentElement;
      return {
        idx: i,
        options: opts,
        currentValue: s.value,
        context: para ? para.textContent.trim().substring(0, 200) : '',
        center: {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)}
      };
    })
  });
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_dropdown.js)"
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

# 方法 2：用 JS 指定特定 select（多個 select 時）
cat > /tmp/set_select.js << 'JSEOF'
(function(){
  var selects = document.querySelectorAll('#workarea select');
  if (selects[0]) {
    selects[0].value = '<value>';
    selects[0].dispatchEvent(new Event('change', {bubbles: true}));
  }
  return 'done';
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/set_select.js)"
```

**重要：** `<value>` 是 option 的 `value` 屬性（如 `"1"`, `"2"`），不是顯示文字（如 `"向上"`, `"向下"`）。第一個選項（value `"0"`）通常是 disabled 的 placeholder。

### 多個下拉選單

依序對每個 `<select>` 設定值，用 JS 中的 index 區分：

```bash
cat > /tmp/set_selects.js << 'JSEOF'
(function(){
  var selects = document.querySelectorAll('#workarea select');
  // selects[0].value = '<value_for_first>';
  // selects[0].dispatchEvent(new Event('change', {bubbles: true}));
  // selects[1].value = '<value_for_second>';
  // selects[1].dispatchEvent(new Event('change', {bubbles: true}));
  return 'done';
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/set_selects.js)"
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
