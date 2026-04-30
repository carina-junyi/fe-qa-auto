(function(){
  var result = {options: [], type: 'unknown'};

  // 嘗試找 radio 或 checkbox
  var radios = document.querySelectorAll('[role="radio"]');
  var checkboxes = document.querySelectorAll('[role="checkbox"]');
  var opts = radios.length > 0 ? radios : checkboxes;
  result.type = radios.length > 0 ? 'radio' : (checkboxes.length > 0 ? 'checkbox' : 'unknown');

  // 若 role-based 找不到，嘗試 perseus widget
  if (opts.length === 0) {
    var widgets = document.querySelectorAll('.perseus-widget-container');
    widgets.forEach(function(w){
      var inputs = w.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length > 0) {
        opts = inputs;
        result.type = inputs[0].type;
      }
    });
  }

  result.options = Array.from(opts).map(function(opt, i){
    var rect = opt.getBoundingClientRect();
    var math = opt.querySelector('math');
    var allMath = opt.querySelectorAll('math');
    var mathTexts = Array.from(allMath).map(function(m){ return m.textContent.trim(); });
    return {
      idx: i,
      label: opt.textContent.trim().substring(0, 300),
      mathTexts: mathTexts,
      checked: opt.checked || opt.getAttribute('aria-checked') === 'true',
      x: Math.round(rect.x + rect.width/2),
      y: Math.round(rect.y + rect.height/2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  return JSON.stringify(result);
})()