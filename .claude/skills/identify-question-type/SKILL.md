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
cat > /tmp/identify_qtype.js << 'JSEOF'
(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) workarea = document.getElementById('problemarea');
  if (!workarea) return JSON.stringify({error: 'no workarea found'});

  var result = {confidence: 'high', elements: [], summary: {}};

  // ---- 掃描所有互動元素 ----

  // 1) 下拉選單 <select>
  var selects = workarea.querySelectorAll('select');
  Array.from(selects).forEach(function(s, i){
    var rect = s.getBoundingClientRect();
    var opts = Array.from(s.options).map(function(o){
      return {value: o.value, text: o.textContent.trim(), disabled: o.disabled};
    });
    var para = s.closest('[data-perseus-paragraph-index]') || s.closest('.paragraph') || s.parentElement;
    result.elements.push({
      type: 'select',
      idx: i,
      options: opts,
      context: para ? para.textContent.trim().substring(0, 200) : '',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2)
    });
  });

  // 2) MathQuill 輸入框
  var mqFields = workarea.querySelectorAll('.mq-editable-field.mq-math-mode');
  Array.from(mqFields).forEach(function(f, i){
    var rect = f.getBoundingClientRect();
    var block = f.querySelector('.mq-root-block');
    result.elements.push({
      type: 'mathquill',
      idx: i,
      value: block ? block.textContent.trim() : '',
      isEmpty: block ? block.classList.contains('mq-empty') : true,
      blockId: block ? block.getAttribute('mathquill-block-id') : null,
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2)
    });
  });

  // 3) 普通文字輸入框 (perseus-input-number-widget)
  var textInputs = workarea.querySelectorAll('input[type="text"]');
  Array.from(textInputs).forEach(function(inp, i){
    var rect = inp.getBoundingClientRect();
    var para = inp.closest('[data-perseus-paragraph-index]') || inp.closest('.paragraph') || inp.parentElement;
    result.elements.push({
      type: 'text-input',
      idx: i,
      value: inp.value,
      testId: inp.getAttribute('data-testid') || '',
      context: para ? para.textContent.trim().substring(0, 200) : '',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2)
    });
  });

  // 4) Radio buttons (單選)
  var radios = workarea.querySelectorAll('[role="radio"]');
  // 降級：若 role="radio" 找不到，嘗試 perseus-radio-widget 的 label
  if (radios.length === 0) {
    var radioWidget = workarea.querySelector('[data-testid="perseus-radio-widget"]');
    if (radioWidget) radios = radioWidget.querySelectorAll('label');
  }
  Array.from(radios).forEach(function(opt, i){
    var rect = opt.getBoundingClientRect();
    var math = opt.querySelector('math');
    result.elements.push({
      type: 'radio',
      idx: i,
      label: opt.textContent.trim().substring(0, 150),
      mathText: math ? math.textContent.trim() : null,
      checked: opt.checked || opt.getAttribute('aria-checked') === 'true',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2)
    });
  });

  // 5) Checkbox (多選)
  var checkboxes = workarea.querySelectorAll('[role="checkbox"]');
  Array.from(checkboxes).forEach(function(opt, i){
    var rect = opt.getBoundingClientRect();
    var math = opt.querySelector('math');
    result.elements.push({
      type: 'checkbox',
      idx: i,
      label: opt.textContent.trim().substring(0, 150),
      mathText: math ? math.textContent.trim() : null,
      checked: opt.getAttribute('aria-checked') === 'true',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2)
    });
  });

  // 6) 拖曳排序 (react-beautiful-dnd)
  var droppable = workarea.querySelector('[data-rfd-droppable-id="droppable"]');
  if (droppable) {
    var dragItems = droppable.querySelectorAll('[data-rfd-draggable-id]');
    Array.from(dragItems).forEach(function(item, i){
      var rect = item.getBoundingClientRect();
      var mathEl = item.querySelector('math');
      result.elements.push({
        type: 'drag-sort',
        idx: i,
        draggableId: item.getAttribute('data-rfd-draggable-id'),
        text: mathEl ? mathEl.textContent.trim() : item.textContent.trim(),
        x: Math.round(rect.x + rect.width/2),
        y: Math.round(rect.y + rect.height/2)
      });
    });
  }

  // ---- 統計摘要 ----
  var types = {};
  result.elements.forEach(function(el){ types[el.type] = (types[el.type] || 0) + 1; });
  result.summary = types;

  // 判斷多選指標
  if (radios.length > 0) {
    var stemText = workarea.textContent || '';
    var multiKeywords = ['選出正確的選項', '選出所有', '複選', '多選', '哪些'];
    var isMulti = multiKeywords.some(function(kw){ return stemText.indexOf(kw) !== -1; });
    if (checkboxes.length > 0) isMulti = true;
    result.summary.choiceType = isMulti ? '多選' : '單選';
  }

  // 若完全沒有互動元素
  if (result.elements.length === 0) {
    result.confidence = 'low';
    result.summary.note = 'No interactive elements found';
  }

  return JSON.stringify(result);
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/identify_qtype.js)"
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
cat > /tmp/dom_explore.js << 'JSEOF'
(function(){
  var ids = [];
  document.querySelectorAll('[id]').forEach(function(el){
    ids.push({id: el.id, tag: el.tagName, cls: (el.className||'').toString().substring(0,80)});
  });
  var perseusClasses = new Set();
  document.querySelectorAll('[class]').forEach(function(el){
    el.className.toString().split(' ').forEach(function(c){
      if (c.match(/perseus|exercise|hint|question|answer|choice|widget|input|select|drag|drop|sort|match/i)) perseusClasses.add(c);
    });
  });
  var interactiveEls = [];
  document.querySelectorAll('[role]').forEach(function(el){
    var rect = el.getBoundingClientRect();
    interactiveEls.push({
      role: el.getAttribute('role'),
      tag: el.tagName,
      cls: (el.className||'').toString().substring(0,80),
      text: el.textContent.trim().substring(0,100),
      x: Math.round(rect.x), y: Math.round(rect.y),
      w: Math.round(rect.width), h: Math.round(rect.height)
    });
  });
  return JSON.stringify({ids: ids, perseusClasses: Array.from(perseusClasses), interactiveEls: interactiveEls});
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/dom_explore.js)"
```

#### 6c. 將探索結果寫入 page_structures/

根據探索發現的元素特徵，在 `page_structures/` 下建立對應的新檔案：

- 若能辨識出新題型類別，建立新資料夾（如 `page_structures/drag-drop/`）
- 若無法歸類，寫入 `page_structures/shared/unknown-<url-slug>.md`
- 檔案格式需遵循 `page_structures/README.md` 中定義的標準格式

將探索發現同時記錄到 QA_result.txt 該題的 Notes 欄位。
