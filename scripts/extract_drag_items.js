(function(){
  // 拖曳排序題目前的卡片順序。
  // 舊版 DOM：react-beautiful-dnd（[data-rfd-droppable-id]），用鍵盤排（focus_drag_item.js＋Space／方向鍵）。
  // 新版作答頁：主站自己寫的 pointer 拖曳（libs/perseus 的 Sorter），卡片沒有任何 data-*／role／tabindex，
  //   鍵盤排不了，要用滑鼠拖：mouse move 到卡片中心 → mouse down → mouse move 到目的地 → mouse up
  //   （做法與座標算法見 page_structures/drag-sort/answer-drag-sort.md）。回傳每張卡片的中心與左右邊界。
  function describe(items){
    return Array.from(items).map(function(item, i){
      var mathEl = item.querySelector('math');
      var rect = item.getBoundingClientRect();
      return {
        position: i,
        draggableId: item.getAttribute('data-rfd-draggable-id'),
        text: (mathEl ? mathEl.textContent : (item.innerText || item.textContent || '')).replace(/\s+/g, ' ').trim(),
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });
  }

  var container = document.querySelector('[data-rfd-droppable-id="droppable"]');
  if (container) {
    var items = container.querySelectorAll('[data-rfd-draggable-id]');
    if (items.length === 0) return JSON.stringify({error: 'no draggable items', count: 0});
    return JSON.stringify({ui: 'legacy', how: 'keyboard', count: items.length, items: describe(items)});
  }

  // 新版：排序區是「小叮嚀」那一行的下一個兄弟節點，卡片是它的直接子節點
  var root = document.querySelector('.question-area');
  if (root) {
    var widgets = root.querySelectorAll('.perseus-widget-container');
    for (var w = 0; w < widgets.length; w++) {
      var tip = Array.from(widgets[w].querySelectorAll('div')).find(function(d){
        return d.children.length === 0 && (d.textContent || '').indexOf('拖曳卡片') !== -1;
      });
      var zone = tip && tip.nextElementSibling;
      if (zone && zone.children.length > 1) {
        var zr = zone.getBoundingClientRect();
        var cards = describe(zone.children);
        var vertical = cards.length > 1 && Math.abs(cards[1].y - cards[0].y) > Math.abs(cards[1].x - cards[0].x);
        return JSON.stringify({ui: 'new', how: 'mouse', direction: vertical ? 'vertical' : 'horizontal', count: cards.length,
          zone: {left: Math.round(zr.left), right: Math.round(zr.right), top: Math.round(zr.top), bottom: Math.round(zr.bottom)}, items: cards});
      }
    }
  }
  return JSON.stringify({error: 'no droppable container'});
})()
