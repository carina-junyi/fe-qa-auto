(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var result = {mathquills: [], textInputs: [], totalCount: 0};

  // 1) MathQuill 輸入框
  var mqFields = workarea.querySelectorAll('.mq-editable-field.mq-math-mode');
  result.mathquills = Array.from(mqFields).map(function(f, i) {
    var block = f.querySelector('.mq-root-block');
    var rect = f.getBoundingClientRect();
    return {
      idx: i,
      inputType: 'mathquill',
      value: block ? block.textContent.trim() : '',
      isEmpty: block ? block.classList.contains('mq-empty') : true,
      blockId: block ? block.getAttribute('mathquill-block-id') : null,
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  // 2) 普通 text input (perseus-input-number-widget)
  var textInputs = workarea.querySelectorAll('input[type="text"]');
  result.textInputs = Array.from(textInputs).map(function(inp, i) {
    var rect = inp.getBoundingClientRect();
    var para = inp.closest('[data-perseus-paragraph-index]') || inp.closest('.paragraph') || inp.parentElement;
    return {
      idx: i,
      inputType: 'text-input',
      value: inp.value,
      testId: inp.getAttribute('data-testid') || '',
      context: para ? para.textContent.trim().substring(0, 200) : '',
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  result.totalCount = result.mathquills.length + result.textInputs.length;
  return JSON.stringify(result);
})()