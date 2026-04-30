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