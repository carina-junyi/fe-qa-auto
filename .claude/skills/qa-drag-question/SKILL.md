---
name: qa-drag-question
description: QA Drag-Sort Question (拖曳排序題 QA 流程)
---

# QA Drag-Sort Question (拖曳排序題 QA 流程)

針對頁面中的拖曳排序（`react-beautiful-dnd`）元素執行答案排列。

**前置條件：**
- 頁面已開啟且題幹已擷取（Step 3-4 已完成）
- `/identify-question-type` 的 `elements` 中包含 `type: "drag-sort"` 的元素

**注意：** 此 skill 只負責**擷取排序項目 + 拖曳排序**。提交、解題說明展開、驗證由主流程統一處理（見 CLAUDE.md Step 5b）。

---

## Step A: 擷取排序項目

使用 DOM eval 取得所有 draggable 項目的當前順序與內容：

```bash
cat > /tmp/extract_drag_items.js << 'JSEOF'
(function(){
  var container = document.querySelector('[data-rfd-droppable-id="droppable"]');
  if (!container) return JSON.stringify({error: 'no droppable container'});

  var items = container.querySelectorAll('[data-rfd-draggable-id]');
  if (items.length === 0) return JSON.stringify({error: 'no draggable items', count: 0});

  return JSON.stringify({
    count: items.length,
    items: Array.from(items).map(function(item, i){
      var mathEl = item.querySelector('math');
      var rect = item.getBoundingClientRect();
      return {
        position: i,
        draggableId: item.getAttribute('data-rfd-draggable-id'),
        text: mathEl ? mathEl.textContent.trim() : item.textContent.trim(),
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2)
      };
    })
  });
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_drag_items.js)"
```

**降級：** 若 DOM eval 失敗：

1. **snapshot** — 找有 `role="button"` + math 內容的連續元素
2. **screenshot** — 視覺辨識可拖曳的方框項目

```bash
/opt/homebrew/bin/agent-browser snapshot
/opt/homebrew/bin/agent-browser screenshot
```

---

## Step B: 獨立解題並排序

根據題幹獨立計算正確排列順序，然後透過鍵盤拖曳操作完成排序。

### 排序算法

1. **比較當前順序與目標順序**，找出需要移動的項目
2. **使用 selection sort 策略**：從左到右，確保每個位置放的是正確的項目
3. 對每個需要移動的項目執行鍵盤拖曳

### 鍵盤拖曳操作（單一項目移動）

將一個項目從當前位置移動到目標位置：

```bash
# 1. Focus 目標項目
cat > /tmp/focus_drag_item.js << 'JSEOF'
(function(){
  // 取得當前順序中第 N 個位置的 draggable（N 為當前位置索引）
  var items = document.querySelectorAll('[data-rfd-droppable-id="droppable"] [data-rfd-draggable-id]');
  var target = items[CURRENT_POSITION_INDEX];
  if (!target) return JSON.stringify({error: 'item not found'});
  target.focus();
  return JSON.stringify({focused: true, text: target.textContent.trim().substring(0, 50)});
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/focus_drag_item.js)"

# 2. Space 拿起
/opt/homebrew/bin/agent-browser press " "
/opt/homebrew/bin/agent-browser wait 300

# 3. Arrow 移動（重複 N 次）
# 向左移動：
/opt/homebrew/bin/agent-browser press ArrowLeft
/opt/homebrew/bin/agent-browser wait 200
# 向右移動：
/opt/homebrew/bin/agent-browser press ArrowRight
/opt/homebrew/bin/agent-browser wait 200

# 4. Space 放下
/opt/homebrew/bin/agent-browser press " "
/opt/homebrew/bin/agent-browser wait 300
```

### 完整排序範例

假設當前順序為 `[C, A, D, B]`，目標順序為 `[A, B, C, D]`：

1. 位置 0 需要 A，A 目前在位置 1 → focus 位置 1 的項目，Space，ArrowLeft × 1，Space
2. 重新讀取順序（`[A, C, D, B]`）
3. 位置 1 需要 B，B 目前在位置 3 → focus 位置 3 的項目，Space，ArrowLeft × 2，Space
4. 重新讀取順序（`[A, B, C, D]`）
5. 位置 2 需要 C，C 已在位置 2 → 跳過
6. 位置 3 需要 D，D 已在位置 3 → 跳過

**重要：** 每次移動後必須重新讀取當前順序（重新執行 `extract_drag_items.js`），因為移動操作會改變其他項目的位置。

### 驗證排序結果

排序完成後，驗證最終順序是否正確：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_drag_items.js)"
```

比對回傳的 items 順序是否與計算的目標順序一致。若不一致，重新執行排序。

---

## 輸出

完成後回傳以下結構化結果，供主流程合併：

```
拖曳排序 QA 結果：
- itemCount: <排序項目數量>
- originalOrder: [<原始順序的項目文字>]
- targetOrder: [<目標正確順序的項目文字>]
- finalOrder: [<實際排序後的順序>]
- movesMade: <移動操作次數>
- notes: <降級紀錄或其他觀察>
```
