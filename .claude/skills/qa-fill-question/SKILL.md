---
name: qa-fill-question
description: QA Fill-in Question (填充題 QA 流程)
---

# QA Fill-in Question (填充題 QA 流程)

針對頁面中的輸入框元素執行答案填入。支援兩種輸入框：

| 類型 | DOM 特徵 | 操作方式 |
|------|---------|---------|
| **MathQuill** | `.mq-editable-field.mq-math-mode` | mouse click + `press` 逐字（`fill` 會 timeout） |
| **普通 text input** | `input[type="text"][data-testid="perseus-input-number-widget"]` | `fill @ref "value"` 或 `keyboard type` |

**前置條件：**
- 頁面已開啟且題幹已擷取（Step 3-4 已完成）
- `/identify-question-type` 的 `elements` 中包含 `type: "mathquill"` 或 `type: "text-input"` 的元素

**注意：** 此 skill 只負責**擷取輸入框 + 填入答案**。提交、解題說明展開、驗證由主流程統一處理（見 CLAUDE.md Step 5b）。

---

## Step A: 擷取輸入框資訊

使用 DOM eval 取得所有輸入框的位置與目前值：

```bash
cat > /tmp/extract_inputs.js << 'JSEOF'
(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var result = {mathquills: [], textInputs: [], totalCount: 0};

  // 1) MathQuill 輸入框
  var mqFields = workarea.querySelectorAll('.mq-editable-field.mq-math-mode');
  result.mathquills = Array.from(mqFields).map(function(f, i) {
    var block = f.querySelector('.mq-root-block');
    var rect = f.getBoundingClientRect();
    return {
      idx: i,
      inputType: 'mathquill',
      value: block ? block.textContent.trim() : '',
      isEmpty: block ? block.classList.contains('mq-empty') : true,
      blockId: block ? block.getAttribute('mathquill-block-id') : null,
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  // 2) 普通 text input (perseus-input-number-widget)
  var textInputs = workarea.querySelectorAll('input[type="text"]');
  result.textInputs = Array.from(textInputs).map(function(inp, i) {
    var rect = inp.getBoundingClientRect();
    var para = inp.closest('[data-perseus-paragraph-index]') || inp.closest('.paragraph') || inp.parentElement;
    return {
      idx: i,
      inputType: 'text-input',
      value: inp.value,
      testId: inp.getAttribute('data-testid') || '',
      context: para ? para.textContent.trim().substring(0, 200) : '',
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  result.totalCount = result.mathquills.length + result.textInputs.length;
  return JSON.stringify(result);
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_inputs.js)"
```

**降級：** 若 DOM eval 失敗（totalCount 為 0 或指令報錯）：

1. **snapshot** — 找 `textbox [ref=eN]` 元素確認輸入框存在
2. **screenshot** — 視覺辨識輸入框位置（白色矩形帶灰色邊框）

```bash
/opt/homebrew/bin/agent-browser snapshot
/opt/homebrew/bin/agent-browser screenshot
```

降級時記錄到 Notes：`DOM input extraction failed, fell back to snapshot/screenshot`

---

## Step B: 獨立解題並輸入答案

根據題幹獨立計算正確答案，然後依輸入框類型用不同方式填入。

### 普通 text input（perseus-input-number-widget）

可以直接用 `fill` 或 `keyboard type`：

```bash
# 方法 1：用 snapshot ref（推薦）
/opt/homebrew/bin/agent-browser fill @eN "<answer>"

# 方法 2：點擊後用 keyboard 輸入
/opt/homebrew/bin/agent-browser mouse move <x> <y> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
/opt/homebrew/bin/agent-browser wait 300
/opt/homebrew/bin/agent-browser keyboard type "<answer>"
```

### MathQuill 輸入框

#### 方法 1（推薦）：使用 LaTeX API 直接設定值

透過 MathQuill 的 LaTeX API 可以設定任意數學表達式，包括帶分數：

```bash
cat > /tmp/set_mq_latex.js << 'JSEOF'
(function(latexStr, mqIndex){
  var mqs = document.querySelectorAll('.mq-editable-field.mq-math-mode');
  var mq = mqs[mqIndex || 0];
  if (!mq) return JSON.stringify({error: 'no MathQuill field at index ' + mqIndex});
  try {
    var MQ = MathQuill.getInterface(2);
    var field = MQ.MathField(mq);
    field.latex(latexStr);
    mq.dispatchEvent(new Event('input', {bubbles: true}));
    return JSON.stringify({success: true, latex: field.latex()});
  } catch(e){ return JSON.stringify({error: e.message}); }
})("<LATEX>", 0)
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/set_mq_latex.js)"
```

**常用 LaTeX 格式：**

| 數值類型 | LaTeX | 範例 |
|----------|-------|------|
| 整數 | `42` | `42` |
| 負數 | `-5` | `-5` |
| 分數 | `\\frac{a}{b}` | `\\frac{3}{7}` → 3/7 |
| 帶分數 | `N\\frac{a}{b}` | `5\\frac{3}{8}` → 5³⁄₈ |
| 負分數 | `-\\frac{a}{b}` | `-\\frac{1}{3}` → -1/3 |
| 小數 | `3.14` | `3.14` |
| 指數 | `x^{2}` | `x^{2}` → x² |
| 多項式 | `x^{2}-3` | `x^{2}-3` → x²-3 |

#### 方法 2（備用）：mouse click + press 逐字輸入

當 LaTeX API 不可用時，改用逐字輸入：

```bash
# 點擊輸入框聚焦
/opt/homebrew/bin/agent-browser mouse move <x> <y> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
/opt/homebrew/bin/agent-browser wait 300
# 逐字輸入答案
/opt/homebrew/bin/agent-browser press "<char1>" && /opt/homebrew/bin/agent-browser press "<char2>"
```

**注意：** 逐字輸入無法可靠輸入帶分數，請優先使用方法 1。

### 多個 MathQuill 輸入框

使用 LaTeX API 時，透過 `mqIndex` 參數指定第幾個輸入框（從 0 開始）。

普通 text input 直接輸入完整數值字串即可（如 `fill @eN "3.14"`）。

---

## 輸出

完成後回傳以下結構化結果，供主流程合併：

```
填充題 QA 結果：
- mathquillCount: <MathQuill 輸入框數量>
- textInputCount: <普通文字輸入框數量>
- myInputs: [{idx, inputType, value}]
- notes: <降級紀錄或其他觀察>
```
