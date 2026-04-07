---
name: extract-and-verify-stem
description: Extract and Verify Stem (擷取並驗證題幹)
---

# Extract and Verify Stem (擷取並驗證題幹)

擷取目前題目的題幹內容，並驗證其中的數學是否正確。

**前置條件：** `/probe-page` 已完成，頁面結構已確認。

---

## Step 1: 擷取 qid

在擷取題幹前，先取得該題的 qid（題目識別碼）：

```bash
cat > /tmp/extract_qid.js << 'JSEOF'
(function(){
  try {
    var E = window.Exercises;
    if (E && E.PerseusBridge) {
      var seedInfo = E.PerseusBridge.getSeedInfo();
      return JSON.stringify({
        qid: seedInfo.problem_type || E.PerseusBridge.quizPid,
        sha1: seedInfo.sha1,
        seed: seedInfo.seed
      });
    }
  } catch(e){}
  // Fallback: performance API
  var entries = performance.getEntriesByType('resource');
  var qids = [];
  entries.forEach(function(e){
    var match = e.name.match(/[?&]qid=(\d+)/);
    if (match) qids.push(match[1]);
  });
  return JSON.stringify({qid: qids.length > 0 ? qids[qids.length - 1] : null, method: 'performance-fallback'});
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_qid.js)"
```

記錄回傳的 `qid`，供後續寫入 QA_result.txt。

## Step 2: DOM 擷取題幹

使用 `page_structures/shared/question-stem.md` 中的 JS extraction 程式碼，或以下通用版本：

```bash
cat > /tmp/extract_stem.js << 'JSEOF'
(function(){
  var qa = document.querySelector('.question-area') || document.getElementById('workarea');
  if (!qa) return JSON.stringify({error: 'no question area'});

  // MathML 結構解析（取代 textContent，正確處理分數、指數等）
  function parseMathML(mathEl) {
    if (!mathEl) return '';
    var children = mathEl.children;
    var parts = [];
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.tagName.toLowerCase();
      if (tag === 'mn') { parts.push(el.textContent.trim()); }
      else if (tag === 'mi') { parts.push(el.textContent.trim()); }
      else if (tag === 'mo') { parts.push(el.textContent.trim()); }
      else if (tag === 'mfrac') {
        var num = el.children[0] ? (parseMathML(el.children[0]) || el.children[0].textContent.trim()) : '?';
        var den = el.children[1] ? (parseMathML(el.children[1]) || el.children[1].textContent.trim()) : '?';
        parts.push('(' + num + '/' + den + ')');
      } else if (tag === 'msup') {
        var base = el.children[0] ? (parseMathML(el.children[0]) || el.children[0].textContent.trim()) : '?';
        var exp = el.children[1] ? el.children[1].textContent.trim() : '?';
        parts.push(base + '^' + exp);
      } else if (tag === 'mrow' || tag === 'mstyle') {
        parts.push(parseMathML(el));
      } else { parts.push(el.textContent.trim()); }
    }
    return parts.join('');
  }

  function ex(node) {
    var parts = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 3) {
        var t = c.textContent.trim();
        if (t) parts.push({type: 'text', value: t});
      } else if (c.nodeType === 1) {
        var tag = c.tagName, cls = (c.className || '').toString();
        if (tag === 'MJX-CONTAINER') {
          var m = c.querySelector('math');
          if (m) parts.push({type: 'math', value: parseMathML(m)});
        } else if (cls.indexOf('hints-area') !== -1) {
          // skip
        } else if (cls.indexOf('perseus-widget-container') !== -1) {
          var img = c.querySelector('img'), mq = c.querySelector('.mq-editable-field');
          if (img) parts.push({type: 'image', src: img.src});
          else if (mq) { var b = c.querySelector('.mq-root-block'); parts.push({type: 'input', value: b ? b.textContent.trim() : ''}); }
          else parts.push({type: 'widget', text: c.textContent.trim().substring(0, 100)});
        } else if (['P','DIV','SPAN','STRONG','EM','B','I'].indexOf(tag) !== -1) {
          parts.push.apply(parts, ex(c));
        }
      }
    }
    return parts;
  }
  return JSON.stringify({parts: ex(qa), fullText: qa.textContent.trim().substring(0, 500)});
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_stem.js)"
```

> **重要**：`parseMathML()` 會將 MathML 的 `<mfrac>` 解析為 `(分子/分母)` 格式，避免 `textContent` 將分子分母合併的問題（如 `15/14` 被讀成 `1514`）。

**判定失敗：** 回傳 `{error: ...}`、`parts` 為空、或 `eval` 報錯。

## Step 3: 降級擷取

### 降級 1 — Snapshot

```bash
/opt/homebrew/bin/agent-browser snapshot
```

從 snapshot 的 `article` 區段提取 `text:` 和 `math:` 節點重建題幹。

### 降級 2 — Screenshot

```bash
/opt/homebrew/bin/agent-browser screenshot
```

由視覺判讀題幹內容。

**任何降級都必須：**
1. 記錄到 QA_result.txt Notes：`DOM extraction failed for stem, fell back to snapshot/screenshot`
2. 觸發 `page_structures/shared/question-stem.md` 的更新探索

## Step 4: 驗證題幹數學正確性

檢查擷取到的題幹：

| 檢查項目 | 說明 |
|----------|------|
| 數字與公式 | 是否內部一致、無矛盾？ |
| 數學意義 | 問題是否合理（無不可能的約束）？ |
| 表達式渲染 | 有無亂碼、缺項、符號錯誤？ |

有錯誤則記錄，供後續寫入 QA_result.txt。

## 輸出

```
題幹擷取與驗證結果：
- qid: <題目識別碼，如 140541>
- method: DOM / snapshot / screenshot
- stemText: <重建的題幹文字>
- stemParts: [{type, value}]
- mathValid: true / false
- errors: []  # 若有錯誤，列出位置與描述
- notes: <降級紀錄或其他觀察>
```
