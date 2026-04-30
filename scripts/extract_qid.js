(function(){
  try {
    var E = window.Exercises;
    if (E && E.PerseusBridge) {
      var seedInfo = E.PerseusBridge.getSeedInfo();
      return JSON.stringify({
        qid: seedInfo.problem_type || E.PerseusBridge.quizPid,
        sha1: seedInfo.sha1,
        seed: seedInfo.seed
      });
    }
  } catch(e){}
  // Fallback: performance API
  var entries = performance.getEntriesByType('resource');
  var qids = [];
  entries.forEach(function(e){
    var match = e.name.match(/[?&]qid=(\d+)/);
    if (match) qids.push(match[1]);
  });
  return JSON.stringify({qid: qids.length > 0 ? qids[qids.length - 1] : null, method: 'performance-fallback'});
})()