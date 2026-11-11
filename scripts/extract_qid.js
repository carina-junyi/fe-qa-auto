(function(){
  // Method 0: 新版作答頁（/exercise/<id>、/sequential-quiz/<id>）。
  // 頁面每顯示一題就抓一次 /api/v2/perseus/<qid>（不會預抓下一題），最近一次就是畫面上那一題。
  // 網址的 ?qid= 不能當答案：主站只對管理員帳號採用它（DoExercise：pinnedQuestionId = isModerator ? qid : undefined），
  // 一般帳號或未登入時，帶什麼 qid 都不影響顯示哪一題；/sequential-quiz 則完全不讀它。
  // 所以回傳實際顯示的 qid，另外附 urlQid／urlQidHonored 讓呼叫方知道指定有沒有生效。
  try {
    if (!window.Exercises && !document.getElementById('workarea')) {
      var shown = performance.getEntriesByType('resource').filter(function(e){
        return e.initiatorType === 'xmlhttprequest' && /\/api\/v2\/perseus\/\d+(\?|$)/.test(e.name);
      }).sort(function(a, b){ return b.startTime - a.startTime; })[0];
      var u = new URLSearchParams(location.search).get('qid');
      var urlQid = (u && /^\d+$/.test(u)) ? parseInt(u, 10) : null;
      // 新版頁面到這裡就回傳，不往下走：下面的 Method 2 會撈到 AI 筆記本請求網址裡的舊 qid
      if (!shown || !document.querySelector('.question-area')) {
        return JSON.stringify({qid: null, method: 'not-found', ui: 'new', urlQid: urlQid, note: 'no question on screen (page still loading, or a completion / reward screen is showing)'});
      }
      var qid = parseInt(shown.name.match(/\/perseus\/(\d+)/)[1], 10);
      return JSON.stringify({qid: qid, method: 'perseus-xhr', urlQid: urlQid, urlQidHonored: urlQid === null ? null : urlQid === qid});
    }
  } catch(e){}

  // Method 1: PerseusBridge — only use if value is a number (numeric qid)
  try {
    var E = window.Exercises;
    if (E && E.PerseusBridge) {
      var pb = E.PerseusBridge;
      // quizPid is typically the numeric qid of the current problem
      if (pb.quizPid && /^\d+$/.test(String(pb.quizPid))) {
        return JSON.stringify({qid: parseInt(pb.quizPid), method: 'quizPid'});
      }
      // currentProblem object
      if (E.currentProblem) {
        var cp = E.currentProblem;
        var cpId = cp.id || cp.qid || cp.problem_id;
        if (cpId && /^\d+$/.test(String(cpId))) {
          return JSON.stringify({qid: parseInt(cpId), method: 'currentProblem'});
        }
      }
      // getSeedInfo: problem_type is numeric qid on some exercises
      try {
        var s = pb.getSeedInfo();
        if (s && s.problem_type && /^\d+$/.test(String(s.problem_type))) {
          return JSON.stringify({qid: parseInt(s.problem_type), method: 'problem_type'});
        }
      } catch(e){}
    }
  } catch(e){}

  // Method 2: performance entries — sort by most recent startTime (not array order)
  // NOTE: This is still unreliable for sequential_quiz with batch pre-fetch.
  // Prefer using api-recon-position approach (see below) for sequential_quiz.
  try {
    var entries = performance.getEntriesByType('resource');
    var qidEntries = [];
    entries.forEach(function(e){
      var m = e.name.match(/[?&]qid=(\d+)/);
      if (m) qidEntries.push({qid: parseInt(m[1]), t: e.startTime});
    });
    if (qidEntries.length > 0) {
      qidEntries.sort(function(a, b){ return b.t - a.t; });
      return JSON.stringify({qid: qidEntries[0].qid, method: 'performance-recent'});
    }
  } catch(e){}

  return JSON.stringify({qid: null, method: 'not-found'});
})()
