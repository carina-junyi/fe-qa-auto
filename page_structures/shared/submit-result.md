# Submit Result (提交答案 & 結果判定)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Submit button | `#check-answer-button` | `<input type="button" value="提交答案">` |
| Next question button | `#next-question-button` | `<input type="button" value="下一題">` |
| Feedback text | `#answer-feedback` | "答對了，很棒喔！" or error message |
| Feedback container | `#answer-feedback-container` | Contains image + text |
| Feedback image | `#answer-feedback-img` | `correct_answer.png` or similar |
| Check results | `#check-answer-results` | Contains `.check-answer-message` |
| Correct answer audio | `#au-correct-answer` | `<audio>` element |

## JavaScript Extraction

```js
// Check submission result
(function(){
  var checkBtn = document.getElementById('check-answer-button');
  var nextBtn = document.getElementById('next-question-button');
  var feedback = document.getElementById('answer-feedback');
  var feedbackImg = document.getElementById('answer-feedback-img');

  var isSubmitted = checkBtn && checkBtn.offsetParent === null;
  var hasNextBtn = nextBtn && nextBtn.offsetParent !== null;
  var feedbackText = feedback ? feedback.textContent.trim() : '';
  var isCorrect = feedbackText.indexOf('答對') !== -1;
  var isWrong = feedbackText.indexOf('再試') !== -1 || feedbackText.indexOf('錯') !== -1;

  return JSON.stringify({
    isSubmitted: isSubmitted,
    hasNextButton: hasNextBtn,
    feedbackText: feedbackText,
    isCorrect: isCorrect,
    isWrong: isWrong,
    feedbackImgSrc: feedbackImg ? feedbackImg.src : null
  });
})()
```

## State Transitions

| State | `#check-answer-button` | `#next-question-button` | `#answer-feedback` |
|-------|----------------------|------------------------|-------------------|
| Before submit | visible (`display: block`) | hidden (`display: none`) | empty |
| After correct | hidden (`display: none`) | visible (`display: block`) | "答對了，很棒喔！" |
| After wrong | visible (for retry) | hidden | Error text |

## Snapshot Comparison
- Before submit: `button "Submit" [ref=eN]` visible
- After correct: `button "下一題" [ref=eN]` appears
- `#answer-feedback` text is NOT visible in snapshot (container hidden)

## Known Gotchas
- Badge popup may appear after FIRST correct answer — dismiss with `press Escape`
- `#answer-feedback` has text content but `visible: false` (container is hidden by CSS)
- The feedback image src changes: `correct_answer.png` for correct
- Submit button's `value` attribute stays "提交答案" even when hidden
- Check button display changes via CSS `display: none`, not DOM removal

## Raw HTML Sample
```html
<div id="answer-button-frame" class="answer-buttons flex-center">
  <div id="answer-feedback-container">
    <span class="arrow-bot"></span>
    <span class="arrow-mid" style="border-color: rgb(138, 187, 81) transparent transparent;"></span>
    <span class="arrow-top"></span>
    <div style="display:flex;">
      <div id="feedback-text-container">
        <img src="/images/exercises/correct_answer.png" id="answer-feedback-img">
        <span id="answer-feedback">答對了，很棒喔！</span>
      </div>
    </div>
  </div>
  <div id="energy-points"></div>
  <input id="check-answer-button" type="button" value="提交答案"
         class="problem-btn full-width btn btn-success" style="display: none;">
  <input id="next-question-button" type="button" value="下一題"
         class="btn btn-success problem-btn full-width" style="display: block;">
</div>
```
