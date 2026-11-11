(function(){
  // 按下「提交答案」。舊版 DOM 是 #check-answer-button；新版作答頁的按鈕沒有 id，靠文字找。
  // 用法：agent-browser eval "$(cat scripts/submit_answer.js)"，等 2 秒後跑 check_result.js。
  var btn = document.getElementById('check-answer-button');
  var ui = 'legacy';
  if (!btn || btn.offsetParent === null) {
    ui = 'new';
    btn = Array.from(document.querySelectorAll('button')).find(function(b){
      return (b.textContent || '').trim() === '提交答案' && b.offsetParent !== null;
    }) || null;
  }
  if (!btn) return JSON.stringify({error: 'no submit button (already submitted, or page not ready)'});
  if (btn.disabled) return JSON.stringify({error: 'submit button is disabled', ui: ui});
  btn.click();
  return JSON.stringify({success: true, ui: ui});
})()
