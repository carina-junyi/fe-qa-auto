(function(latexStr, mqIndex){
  var mqs = document.querySelectorAll('.mq-editable-field.mq-math-mode');
  var mq = mqs[mqIndex || 0];
  if (!mq) return JSON.stringify({error: 'no MathQuill field at index ' + mqIndex});
  try {
    var MQ = MathQuill.getInterface(2);
    var field = MQ.MathField(mq);
    field.latex(latexStr);
    mq.dispatchEvent(new Event('input', {bubbles: true}));
    return JSON.stringify({success: true, latex: field.latex()});
  } catch(e){ return JSON.stringify({error: e.message}); }
})
