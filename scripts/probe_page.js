(function(){
  // 兩種作答頁：
  //   legacy —— 舊版 DOM（#workarea／#problemarea、window.Exercises、.problem-history-icon 進度點）
  //   new    —— 新版作答頁（/exercise/<id>、/sequential-quiz/<id>）：題目在 .question-area > .perseus-renderer，
  //             作答元件是 MUI／data-testid，沒有 #workarea，也沒有 window.Exercises
  // 2026-09-21 起主站把舊網址一律轉導新版（cookie content_ux_version_v2 已無作用），URL 目標實際上都落在 new。
  var legacyRoot = document.getElementById('workarea') || document.getElementById('problemarea');
  var newRoot = document.querySelector('.question-area');
  var ui = legacyRoot ? 'legacy' : (newRoot && newRoot.querySelector('.perseus-renderer') ? 'new' : 'unknown');

  var dots = document.querySelectorAll('.problem-history-icon');
  var total = dots.length;
  var answered = Array.from(dots).filter(function(d){ return d.src.indexOf('blank') === -1; }).length;
  var hasPerseusRenderer = !!document.querySelector('.perseus-renderer');

  var route = null, exerciseId = null;
  var match = location.pathname.match(/\/(exercises|exercise|new-exercise|sequential-quiz)\/([^/?#]+)/);
  if (match) { route = match[1]; try { exerciseId = decodeURIComponent(match[2]); } catch(e) { exerciseId = match[2]; } }

  var exerciseMode = 'unknown'; var passCondition = null;
  try { var E = window.Exercises; if (E) { exerciseMode = E.contentType || 'unknown'; passCondition = E.passCondition || null; } } catch(e){}
  if (exerciseMode === 'unknown' && ui === 'new') {
    // 新版沒有 window.Exercises：題組型態看路徑（題組流程的權威來源仍是 fetch_questions.py 的 index.json）
    if (route === 'sequential-quiz') exerciseMode = 'sequential_quiz';
    else if (route === 'exercise' || route === 'new-exercise') exerciseMode = 'exercise';
  }

  var qidParam = null;
  try { var q = new URLSearchParams(location.search).get('qid'); if (q && /^\d+$/.test(q)) qidParam = parseInt(q, 10); } catch(e){}

  function buttonByText(texts) {
    return Array.from(document.querySelectorAll('button')).find(function(b){
      return texts.indexOf((b.textContent || '').trim()) !== -1 && b.offsetParent !== null;
    }) || null;
  }
  var hasSubmitButton = !!(document.getElementById('check-answer-button') || buttonByText(['提交答案']));

  return JSON.stringify({ ui: ui, route: route, totalQuestions: total, answered: answered, hasWorkarea: !!document.getElementById('workarea'),
    hasQuestionArea: !!newRoot, hasPerseusRenderer: hasPerseusRenderer, hasSubmitButton: hasSubmitButton,
    exerciseMode: exerciseMode, exerciseId: exerciseId, qidParam: qidParam, passCondition: passCondition });
})()
