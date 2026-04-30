(function(latex, index) {
  var mqs = document.querySelectorAll('.mq-editable-field');
  if (index >= mqs.length) return 'ERROR: index out of range, only ' + mqs.length + ' MQ fields';
  var mq = MathQuill.getInterface(2).MathField(mqs[index]);
  mq.latex(latex);
  var event = new Event('input', {bubbles: true});
  mqs[index].dispatchEvent(event);
  return 'OK: set MQ[' + index + '] to ' + latex;
})
