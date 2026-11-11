(function(){
  // 下拉選單清單。舊版 DOM 的根是 #workarea；新版作答頁（/exercise、/sequential-quiz）是 .question-area。
  // 新版有兩種下拉並存：選項是純文字的用原生 <select>；選項含數學式的用 MUI Select（[role=combobox]，
  // 選項要打開才在 DOM 裡，這裡只回目前顯示什麼，選項內容以題目檔為準）。
  // idx 是兩種混在一起、照頁面出現順序的編號，identify_qtype.js、set_select.js 用同一套。
  var workarea = document.getElementById('workarea') || document.querySelector('.question-area');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var all = workarea.querySelectorAll('select, [role="combobox"]');
  if (all.length === 0) return JSON.stringify({error: 'no select elements', count: 0});

  // context：這個下拉所在的那一段題幹，下拉本身換成「[下拉N]」（N 就是 idx），用來對照題目檔裡是哪一個空格。
  // 不換掉的話，原生 <select> 的所有選項文字會整串黏在題幹中間。
  function contextOf(el){
    var para = el.closest('[data-perseus-paragraph-index]') || el.closest('.paragraph') || el.parentElement;
    if (!para) return '';
    var origs = para.querySelectorAll('select, [role="combobox"]');
    var clone = para.cloneNode(true);
    var clones = clone.querySelectorAll('select, [role="combobox"]');
    for (var k = 0; k < clones.length; k++) {
      var n = Array.prototype.indexOf.call(all, origs[k]);
      var holder = clones[k].tagName === 'SELECT' ? clones[k] : (clones[k].closest('.MuiInputBase-root') || clones[k]);
      holder.replaceWith(document.createTextNode(' [下拉' + n + '] '));
    }
    return clone.textContent.replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  return JSON.stringify({
    count: all.length,
    selects: Array.from(all).map(function(s, i){
      var rect = s.getBoundingClientRect();
      var base = {
        idx: i,
        context: contextOf(s),
        center: {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)}
      };
      if (s.tagName === 'SELECT') {
        base.widget = 'native';
        base.options = Array.from(s.options).map(function(o){ return {value: o.value, text: o.textContent.trim(), disabled: o.disabled}; });
        base.currentValue = s.value;
      } else {
        base.widget = 'mui';
        base.currentText = (s.innerText || '').trim().split('\n')[0];
        base.expanded = s.getAttribute('aria-expanded') === 'true';
      }
      return base;
    })
  });
})()
