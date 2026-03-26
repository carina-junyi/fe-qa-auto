# Drag-Sort Answer (拖曳排序)

## Last Verified
- Date: 2026-03-25
- URL: https://www.junyiacademy.org/exercises/jfc-9-02-1-1e

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Droppable container | `[data-rfd-droppable-id="droppable"]` | `react-beautiful-dnd` 的 droppable 容器 |
| Draggable items | `[data-rfd-draggable-id]` | 每個可拖曳項目，`data-rfd-draggable-id` 為項目 ID |
| Drag handle | `[data-rfd-drag-handle-draggable-id]` | 拖曳把手（與 draggable 同一元素） |
| Item content | `[data-rfd-draggable-id] math` | MathML 數學內容 |
| Hint text | `.MuiBox-root.css-1dpd5wt` | 提示：「若以平板、手機操作，需以手指頭長按再進行拖曳」 |

## Key Attributes

每個 draggable item 具有以下 `data-*` 屬性：

| Attribute | Description |
|-----------|-------------|
| `data-rfd-draggable-id` | 項目 ID（如 `"0"`, `"1"`, `"2"`, `"3"`） |
| `data-rfd-draggable-context-id` | 上下文 ID（如 `":rg:"`） |
| `data-rfd-drag-handle-draggable-id` | 拖曳把手 ID（與 draggable-id 相同） |
| `data-rfd-drag-handle-context-id` | 拖曳把手上下文 ID |
| `role` | `"button"` |
| `tabindex` | `"0"` — 支援鍵盤 focus |

## JavaScript Extraction

```js
// 擷取所有拖曳項目的當前順序與內容
(function(){
  var container = document.querySelector('[data-rfd-droppable-id="droppable"]');
  if (!container) return JSON.stringify({error: 'no droppable container'});

  var items = container.querySelectorAll('[data-rfd-draggable-id]');
  var result = {
    count: items.length,
    items: []
  };

  items.forEach(function(item, i){
    var mathEl = item.querySelector('math');
    var rect = item.getBoundingClientRect();
    result.items.push({
      position: i,
      draggableId: item.getAttribute('data-rfd-draggable-id'),
      text: mathEl ? mathEl.textContent.trim() : item.textContent.trim(),
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  });

  return JSON.stringify(result);
})()
```

## Keyboard Drag-and-Drop

`react-beautiful-dnd` 支援鍵盤操作，這是自動化拖曳的核心方式：

1. **Focus** — 用 JS `element.focus()` 聚焦目標 draggable
2. **Space** — 拿起（lift）元素
3. **ArrowLeft / ArrowRight** — 水平方向移動位置（每按一次移動一格）
4. **Space** — 放下（drop）元素到當前位置

### 移動算法

將項目從位置 `fromIdx` 移動到位置 `toIdx`：

```
steps = toIdx - fromIdx
if steps > 0: press ArrowRight × steps（向右移動）
if steps < 0: press ArrowLeft × |steps|（向左移動）
```

## Snapshot Comparison

在 `agent-browser snapshot` 中，draggable items 顯示為：

```
- button [ref=eN]:
    - math: y = − 4 x 2
- button [ref=eN]:
    - math: y = − 3 x 2
```

每個 item 有 `role="button"` 且包含 math 元素。

## Known Gotchas

1. **`draggable` attribute 為 `false`**：雖然 `draggable="false"`，但 `react-beautiful-dnd` 使用自己的 drag 機制，不依賴 HTML5 原生 drag API
2. **鍵盤方式最可靠**：mouse-based drag 需要精確的 drag 事件序列（mousedown → mousemove → mouseup），很容易出錯；鍵盤方式（Space → Arrow → Space）更穩定
3. **方向為水平**：目前觀察到的排序題都是水平排列（左到右），所以使用 ArrowLeft/ArrowRight
4. **focus 後立即 Space**：focus 和 Space 之間不需要等待太久，但建議加 300ms 確保 focus 完成
5. **每次只能移動一個 item**：如果需要將多個 item 重新排序，需要逐一移動
6. **提示文字**：排序區域上方通常有「💡 小叮嚀：若以平板、手機操作，需以手指頭長按再進行拖曳。」提示

## Raw HTML Sample

```html
<div class="MuiBox-root css-174u217" data-rfd-droppable-id="droppable" data-rfd-droppable-context-id=":rg:">
  <div class="MuiBox-root css-1pm49vl"
       data-rfd-draggable-context-id=":rg:"
       data-rfd-draggable-id="0"
       tabindex="0"
       role="button"
       aria-describedby="rfd-hidden-text-:rg:-hidden-text-:rh:"
       data-rfd-drag-handle-draggable-id="0"
       data-rfd-drag-handle-context-id=":rg:"
       draggable="false">
    <div class="MuiBox-root css-1dtnjt5">
      <div class="MuiBox-root css-1fy0vcc">
        <span style="display: inline; visibility: visible;">
          <mjx-container class="MathJax" jax="CHTML">
            <mjx-math class="MJX-TEX" aria-hidden="true">...</mjx-math>
            <mjx-assistive-mml>
              <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mi>y</mi><mo>=</mo><mo>−</mo><mn>4</mn><msup><mi>x</mi><mn>2</mn></msup>
              </math>
            </mjx-assistive-mml>
          </mjx-container>
        </span>
      </div>
    </div>
  </div>
  <!-- more draggable items... -->
</div>
```
