(function(){
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
