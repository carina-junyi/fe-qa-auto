(function(selectIndex, value){
  var selects = document.querySelectorAll('#workarea select');
  var s = selects[selectIndex || 0];
  if (!s) return JSON.stringify({error: 'no select at index ' + selectIndex});
  s.value = value;
  s.dispatchEvent(new Event('change', {bubbles: true}));
  return JSON.stringify({success: true, value: s.value});
})
