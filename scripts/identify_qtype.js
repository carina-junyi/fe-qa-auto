(function(){
  // 舊版 DOM 的根是 #workarea／#problemarea；新版作答頁（/exercise、/sequential-quiz）的根是 .question-area
  var legacyRoot = document.getElementById('workarea') || document.getElementById('problemarea');
  var workarea = legacyRoot || document.querySelector('.question-area');
  if (!workarea) return JSON.stringify({error: 'no workarea found'});
  var result = {confidence: 'high', ui: legacyRoot ? 'legacy' : 'new', elements: [], summary: {}};
  var radios = workarea.querySelectorAll('[role="radio"]');
  if (radios.length === 0) { var rw = workarea.querySelector('[data-testid="perseus-radio-widget"]'); if (rw) radios = rw.querySelectorAll('label'); }
  Array.from(radios).forEach(function(opt, i){ var rect = opt.getBoundingClientRect(); result.elements.push({type:'radio',idx:i,label:opt.textContent.trim().substring(0,150),checked:opt.getAttribute('aria-checked')==='true',x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var mqFields = workarea.querySelectorAll('.mq-editable-field.mq-math-mode');
  Array.from(mqFields).forEach(function(f, i){ var rect = f.getBoundingClientRect(); var block = f.querySelector('.mq-root-block'); result.elements.push({type:'mathquill',idx:i,value:block?block.textContent.trim():'',isEmpty:block?block.classList.contains('mq-empty'):true,x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var textInputs = workarea.querySelectorAll('input[type="text"]');
  Array.from(textInputs).forEach(function(inp, i){ var rect = inp.getBoundingClientRect(); result.elements.push({type:'text-input',idx:i,value:inp.value,x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  // 下拉：原生 <select>（舊版，以及新版裡選項是純文字的）與 MUI Select（新版裡選項含數學式的，[role=combobox]，選項要打開才在 DOM 裡）
  // 兩種照頁面出現順序一起編號，idx 可以直接丟給 set_select.js
  var selects = workarea.querySelectorAll('select, [role="combobox"]');
  Array.from(selects).forEach(function(s, i){ var rect = s.getBoundingClientRect(); var native = s.tagName === 'SELECT'; result.elements.push({type:'select',idx:i,widget:native?'native':'mui',value:native?s.value:(s.innerText||'').trim().split('\n')[0],x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  // 拖曳排序：舊版是 react-beautiful-dnd（data-rfd-*，鍵盤可排）；新版是主站自己寫的 pointer 拖曳，卡片沒有任何屬性，
  // 靠「小叮嚀…拖曳卡片」那一行的下一個兄弟節點認（要用滑鼠拖，見 extract_drag_items.js）
  var dragItems = workarea.querySelectorAll('[data-rfd-draggable-id]'); var dragWidget = 'rfd';
  if (dragItems.length === 0) { var tip = Array.from(workarea.querySelectorAll('.perseus-widget-container div')).find(function(d){ return d.children.length === 0 && (d.textContent || '').indexOf('拖曳卡片') !== -1; }); if (tip && tip.nextElementSibling && tip.nextElementSibling.children.length > 1) { dragItems = tip.nextElementSibling.children; dragWidget = 'pointer'; } }
  Array.from(dragItems).forEach(function(d, i){ var rect = d.getBoundingClientRect(); var m = d.querySelector('math'); result.elements.push({type:'drag-sort',idx:i,widget:dragWidget,draggableId:d.getAttribute('data-rfd-draggable-id'),text:(m?m.textContent:(d.innerText||'')).replace(/\s+/g,' ').trim().substring(0,80),x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var types = {}; result.elements.forEach(function(el){ types[el.type] = (types[el.type] || 0) + 1; }); result.summary = types;
  if (radios.length > 0) { var stemText = workarea.textContent || ''; var multiKw = ['選出正確的選項','選出所有','複選','多選','哪些','答案不只一個']; var isMulti = multiKw.some(function(kw){ return stemText.indexOf(kw) !== -1; }); result.summary.choiceType = isMulti ? '多選' : '單選'; }
  if (result.elements.length === 0) { result.confidence = 'low'; result.summary.note = 'No interactive elements found'; }
  return JSON.stringify(result);
})()
