---
name: probe-page
description: Probe Page (頁面探測)
---

# Probe Page (頁面探測)

開啟頁面後，探測頁面結構與題組資訊。

**前置條件：** 頁面已透過 `agent-browser open` 開啟。

---

## Step 1: Snapshot

取得 accessibility tree 與元素 ref：

```bash
/opt/homebrew/bin/agent-browser snapshot
```

## Step 2: DOM 探測

用 eval 取得頁面骨架與題目數量：

```bash
cat > /tmp/probe_page.js << 'JSEOF'
(function(){
  var dots = document.querySelectorAll('.problem-history-icon');
  var total = dots.length;
  var answered = Array.from(dots).filter(function(d){
    return d.src.indexOf('blank') === -1;
  }).length;
  var hasWorkarea = !!document.getElementById('workarea');
  var hasPerseusRenderer = !!document.querySelector('.perseus-renderer');
  return JSON.stringify({
    totalQuestions: total,
    answered: answered,
    hasWorkarea: hasWorkarea,
    hasPerseusRenderer: hasPerseusRenderer
  });
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/probe_page.js)"
```

## Step 3: 異常處理

若 `hasWorkarea: false` 或 `hasPerseusRenderer: false`：

1. 截圖視覺確認頁面狀態：
   ```bash
   /opt/homebrew/bin/agent-browser screenshot
   ```

2. 執行 DOM 探索尋找替代結構：
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
         if (c.match(/perseus|exercise|hint|question|answer|choice|widget/i)) perseusClasses.add(c);
       });
     });
     return JSON.stringify({ids: ids, perseusClasses: Array.from(perseusClasses)});
   })()
   JSEOF
   /opt/homebrew/bin/agent-browser eval "$(cat /tmp/dom_explore.js)"
   ```

3. 更新 `page_structures/shared/exercise-layout.md`

## 輸出

```
頁面探測結果：
- totalQuestions: <題目總數>
- answered: <已作答數>
- hasWorkarea: true/false
- hasPerseusRenderer: true/false
- snapshotRefs: <關鍵元素的 ref 列表>
```
