(function(){
  var match = location.pathname.match(/\/exercises\/([^/?]+)/);
  if (!match) return JSON.stringify({error: 'no exercise ID'});
  var exerciseId = match[1];
  return new Promise(function(resolve){
    fetch('/api/v2/perseus/' + exerciseId + '/get_question')
      .then(function(r){ return r.json(); })
      .then(function(resp){
        var items = resp.data;
        resolve(JSON.stringify({ exerciseId: exerciseId, totalInPool: items.length, qids: items.map(function(item, i){ return { index: i, qid: item.qid }; }) }));
      })
      .catch(function(e){ resolve(JSON.stringify({error: e.message})); });
  });
})()
