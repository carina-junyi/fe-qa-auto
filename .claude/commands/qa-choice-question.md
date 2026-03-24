# QA Choice Question (選擇題 QA 流程)

針對頁面中的單選（radio）或多選（checkbox）元素執行答案選擇。

**前置條件：**
- 頁面已開啟且題幹已擷取（Step 3-4 已完成）
- `/identify-question-type` 的 `elements` 中包含 `type: "radio"` 或 `type: "checkbox"` 的元素

**注意：** 此 skill 只負責**擷取選項 + 點選答案**。提交、解題說明展開、驗證由主流程統一處理（見 CLAUDE.md Step 5b）。

---

## Step A: 擷取選項內容

使用 DOM eval 取得所有選項的文字與數學表達式：

```bash
cat > /tmp/extract_choices.js << 'JSEOF'
(function(){
  var result = {options: [], type: 'unknown'};

  // 嘗試找 radio 或 checkbox
  var radios = document.querySelectorAll('[role="radio"]');
  var checkboxes = document.querySelectorAll('[role="checkbox"]');
  var opts = radios.length > 0 ? radios : checkboxes;
  result.type = radios.length > 0 ? 'radio' : (checkboxes.length > 0 ? 'checkbox' : 'unknown');

  // 若 role-based 找不到，嘗試 perseus widget
  if (opts.length === 0) {
    var widgets = document.querySelectorAll('.perseus-widget-container');
    widgets.forEach(function(w){
      var inputs = w.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length > 0) {
        opts = inputs;
        result.type = inputs[0].type;
      }
    });
  }

  result.options = Array.from(opts).map(function(opt, i){
    var rect = opt.getBoundingClientRect();
    var math = opt.querySelector('math');
    var allMath = opt.querySelectorAll('math');
    var mathTexts = Array.from(allMath).map(function(m){ return m.textContent.trim(); });
    return {
      idx: i,
      label: opt.textContent.trim().substring(0, 300),
      mathTexts: mathTexts,
      checked: opt.checked || opt.getAttribute('aria-checked') === 'true',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  return JSON.stringify(result);
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_choices.js)"
```

**降級：** 若 DOM eval 失敗（options 為空），用 screenshot 取得選項座標：

```bash
/opt/homebrew/bin/agent-browser screenshot
```

從截圖視覺辨識各選項的位置與內容。

---

## Step B: 獨立解題並選擇答案

根據題幹（已在前置步驟擷取）獨立計算正確答案，然後：

### 單選題

點擊計算出的正確選項：

```bash
/opt/homebrew/bin/agent-browser screenshot
# 確認選項座標後點擊
/opt/homebrew/bin/agent-browser mouse move <x> <y> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
```

### 多選題

依序點擊所有正確選項：

```bash
/opt/homebrew/bin/agent-browser screenshot
# 逐一點擊每個正確選項
/opt/homebrew/bin/agent-browser mouse move <x1> <y1> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
/opt/homebrew/bin/agent-browser wait 300
/opt/homebrew/bin/agent-browser mouse move <x2> <y2> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
```

---

## 輸出

完成後回傳以下結構化結果，供主流程合併：

```
選擇題 QA 結果：
- choiceType: 單選 / 多選
- optionCount: <選項數量>
- mySelection: [{idx, label}]
- notes: <降級紀錄或其他觀察>
```
