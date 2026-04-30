(function(positionIndex){
  var items = document.querySelectorAll('[data-rfd-droppable-id="droppable"] [data-rfd-draggable-id]');
  var target = items[positionIndex];
  if (!target) return JSON.stringify({error: 'item not found at index ' + positionIndex});
  target.focus();
  return JSON.stringify({focused: true, text: target.textContent.trim().substring(0, 50)});
})
