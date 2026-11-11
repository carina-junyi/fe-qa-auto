(function(selectIndex, value){
  // 下拉選單選值。用法：agent-browser eval "$(cat scripts/set_select.js)(INDEX, VALUE)"
  //   INDEX：第幾個下拉，從 0 起算，照頁面出現順序（同 extract_dropdown.js／identify_qtype.js 的 idx）。
  //   VALUE 建議一律給數字（不加引號）＝第幾個選項，從 1 起算，順序同題目檔 all.md 的選項清單（0 是不能選的佔位項）。
  //         也可以給字串：先當 option 的 value 比對（舊用法 '1'、'2'），比不到再比選項文字。
  //         選項文字本身是數字時（例如選項是 2、6）字串會有歧義，所以用數字最保險。
  //   回傳的 text 是實際選到的選項文字，選完核對一下。
  //   兩種下拉都支援：原生 <select>（舊版頁面，以及新版裡選項是純文字的下拉）同步回傳；
  //   MUI Select（新版裡選項含數學式的下拉，[role=combobox]，選項打開才在 DOM 裡）回傳 Promise（agent-browser eval 會等它）。
  var idx = selectIndex || 0;
  var root = document.getElementById('workarea') || document.getElementById('problemarea') || document.querySelector('.question-area') || document;
  var all = root.querySelectorAll('select, [role="combobox"]');
  var el = all[idx];
  if (!el) return JSON.stringify({error: 'no select at index ' + idx, count: all.length});
  var want = String(value);
  var byPosition = typeof value === 'number';
  function firstLine(node){ return (node.innerText || node.textContent || '').trim().split('\n')[0].trim(); }

  if (el.tagName === 'SELECT') {
    var opts = Array.from(el.options).filter(function(o){ return !o.disabled; });
    var opt = opts.find(function(o){ return o.value === want; });
    if (!opt && !byPosition) opt = opts.find(function(o){ return o.textContent.trim() === want; });
    if (!opt) return JSON.stringify({error: 'no option matching ' + want, options: Array.from(el.options).map(function(o){ return {value: o.value, text: o.textContent.trim(), disabled: o.disabled}; })});
    // React 受控元件：直接改 .value 不會觸發 onChange，要用原生 setter 再發 change
    var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, opt.value);
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return JSON.stringify({success: true, widget: 'native', index: idx, value: el.value, text: opt.textContent.trim()});
  }

  function options(){ return Array.from(document.querySelectorAll('[role="listbox"] [role="option"]')); }
  function enabled(o){ return o.getAttribute('aria-disabled') !== 'true'; }
  return new Promise(function(resolve){
    el.scrollIntoView({block: 'center'});
    // MUI Select 是在 mousedown 打開的，click 沒有作用
    el.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    var tries = 0;
    (function waitOpen(){
      var opts = options();
      if (opts.length === 0) { if (++tries > 20) return resolve(JSON.stringify({error: 'dropdown did not open', index: idx})); return setTimeout(waitOpen, 100); }
      var hit = opts.find(function(o){ return o.getAttribute('data-value') === want && enabled(o) && byPosition; });
      if (!hit && !byPosition) {
        hit = opts.find(function(o){ return firstLine(o) === want && enabled(o); })
           || opts.find(function(o){ var t = firstLine(o); return t && t.indexOf(want) === 0 && enabled(o); });
      }
      if (!hit) {
        var listed = opts.map(function(o){ return {value: o.getAttribute('data-value'), text: firstLine(o), disabled: !enabled(o)}; });
        // 選不到就把選單關回去，不然打開的選單會蓋住頁面。Escape 要送到 listbox 上才有用（送到 body 沒反應）
        var lb = document.querySelector('[role="listbox"]');
        if (lb) lb.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true}));
        return setTimeout(function(){ resolve(JSON.stringify({error: 'no option matching ' + want, options: listed})); }, 300);
      }
      var picked = {value: hit.getAttribute('data-value'), text: firstLine(hit)};
      hit.click();
      setTimeout(function(){ resolve(JSON.stringify({success: true, widget: 'mui', index: idx, value: picked.value, text: picked.text, shown: firstLine(el)})); }, 150);
    })();
  });
})
