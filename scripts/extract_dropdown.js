(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var selects = workarea.querySelectorAll('select');
  if (selects.length === 0) return JSON.stringify({error: 'no select elements', count: 0});

  return JSON.stringify({
    count: selects.length,
    selects: Array.from(selects).map(function(s, i){
      var rect = s.getBoundingClientRect();
      var opts = Array.from(s.options).map(function(o){
        return {value: o.value, text: o.textContent.trim(), disabled: o.disabled};
      });
      var para = s.closest('[data-perseus-paragraph-index]') || s.closest('.paragraph') || s.parentElement;
      return {
        idx: i,
        options: opts,
        currentValue: s.value,
        context: para ? para.textContent.trim().substring(0, 200) : '',
        center: {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)}
      };
    })
  });
})()