(function(choiceIndex){
  // 點第 choiceIndex 個選項（從 0 起算）。用法：agent-browser eval "$(cat scripts/pick_choice.js)(2)"
  // 舊版 DOM：[role=radio]／[role=checkbox]。新版作答頁：[data-testid=perseus-radio-widget] 底下的 <label>
  // （沒有 role、也沒有 input；多選題同一個 widget，逐個呼叫即可）。
  var root = document.getElementById('workarea') || document.getElementById('problemarea') || document.querySelector('.question-area') || document;
  var opts = root.querySelectorAll('[role="radio"], [role="checkbox"]');
  var ui = 'legacy';
  if (opts.length === 0) {
    var widget = root.querySelector('[data-testid="perseus-radio-widget"]');
    if (widget) { opts = widget.querySelectorAll('label'); ui = 'new'; }
  }
  if (opts.length === 0) return JSON.stringify({error: 'no choices found'});
  var el = opts[choiceIndex || 0];
  if (!el) return JSON.stringify({error: 'no choice at index ' + choiceIndex, count: opts.length});
  el.scrollIntoView({block: 'center'});
  el.click();
  return JSON.stringify({success: true, ui: ui, count: opts.length, label: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 80)});
})
