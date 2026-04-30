(function(){
  var checkBtn = document.getElementById('check-answer-button');
  var nextBtn = document.getElementById('next-question-button');
  var feedback = document.getElementById('answer-feedback');
  var dots = document.querySelectorAll('.problem-history-icon');
  var answeredCount = Array.from(dots).filter(function(d){ return d.src.indexOf('blank') === -1; }).length;
  return JSON.stringify({
    isSubmitted: checkBtn && checkBtn.offsetParent === null,
    hasNextButton: nextBtn && nextBtn.offsetParent !== null,
    feedbackText: feedback ? feedback.textContent.trim() : '',
    isCorrect: feedback && feedback.textContent.indexOf('答對') !== -1,
    answeredCount: answeredCount
  });
})()
