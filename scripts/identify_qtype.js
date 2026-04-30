(function(){
  var workarea = document.getElementById('workarea') || document.getElementById('problemarea');
  if (!workarea) return JSON.stringify({error: 'no workarea found'});
  var result = {confidence: 'high', elements: [], summary: {}};
  var radios = workarea.querySelectorAll('[role="radio"]');
  if (radios.length === 0) { var rw = workarea.querySelector('[data-testid="perseus-radio-widget"]'); if (rw) radios = rw.querySelectorAll('label'); }
  Array.from(radios).forEach(function(opt, i){ var rect = opt.getBoundingClientRect(); result.elements.push({type:'radio',idx:i,label:opt.textContent.trim().substring(0,150),checked:opt.getAttribute('aria-checked')==='true',x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var mqFields = workarea.querySelectorAll('.mq-editable-field.mq-math-mode');
  Array.from(mqFields).forEach(function(f, i){ var rect = f.getBoundingClientRect(); var block = f.querySelector('.mq-root-block'); result.elements.push({type:'mathquill',idx:i,value:block?block.textContent.trim():'',isEmpty:block?block.classList.contains('mq-empty'):true,x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var textInputs = workarea.querySelectorAll('input[type="text"]');
  Array.from(textInputs).forEach(function(inp, i){ var rect = inp.getBoundingClientRect(); result.elements.push({type:'text-input',idx:i,value:inp.value,x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var selects = workarea.querySelectorAll('select');
  Array.from(selects).forEach(function(s, i){ var rect = s.getBoundingClientRect(); result.elements.push({type:'select',idx:i,x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)}); });
  var types = {}; result.elements.forEach(function(el){ types[el.type] = (types[el.type] || 0) + 1; }); result.summary = types;
  if (radios.length > 0) { var stemText = workarea.textContent || ''; var multiKw = ['選出正確的選項','選出所有','複選','多選','哪些','答案不只一個']; var isMulti = multiKw.some(function(kw){ return stemText.indexOf(kw) !== -1; }); result.summary.choiceType = isMulti ? '多選' : '單選'; }
  if (result.elements.length === 0) { result.confidence = 'low'; result.summary.note = 'No interactive elements found'; }
  return JSON.stringify(result);
})()
