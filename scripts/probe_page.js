(function(){
  var dots = document.querySelectorAll('.problem-history-icon');
  var total = dots.length;
  var answered = Array.from(dots).filter(function(d){ return d.src.indexOf('blank') === -1; }).length;
  var hasWorkarea = !!document.getElementById('workarea');
  var hasPerseusRenderer = !!document.querySelector('.perseus-renderer');
  var exerciseMode = 'unknown'; var exerciseId = null; var passCondition = null;
  try { var E = window.Exercises; if (E) { exerciseMode = E.contentType || 'unknown'; passCondition = E.passCondition || null; } } catch(e){}
  var match = location.pathname.match(/\/exercises\/([^/?]+)/);
  if (match) exerciseId = match[1];
  return JSON.stringify({ totalQuestions: total, answered: answered, hasWorkarea: hasWorkarea, hasPerseusRenderer: hasPerseusRenderer, exerciseMode: exerciseMode, exerciseId: exerciseId, passCondition: passCondition });
})()
