(function(){
  var checkBtn = document.getElementById('check-answer-button');
  var nextBtn = document.getElementById('next-question-button');
  var feedback = document.getElementById('answer-feedback');
  var feedbackImg = document.getElementById('answer-feedback-img');
  var dots = document.querySelectorAll('.problem-history-icon');
  var answeredCount = Array.from(dots).filter(function(d){ return d.src.indexOf('blank') === -1; }).length;
  var text = feedback ? feedback.textContent : '';
  // 答對回饋文案不只一種（「答對了，很棒喔！」「太好了！你很努力~」…），
  // 圖片訊號（correct_answer.png）比文案穩定，兩者取 OR。
  var textCorrect = ['答對', '太好了'].some(function(kw){ return text.indexOf(kw) !== -1; });
  var imgCorrect = !!(feedbackImg && feedbackImg.src && feedbackImg.src.indexOf('correct_answer') !== -1);
  return JSON.stringify({
    isSubmitted: checkBtn && checkBtn.offsetParent === null,
    hasNextButton: nextBtn && nextBtn.offsetParent !== null,
    feedbackText: text.trim(),
    isCorrect: textCorrect || imgCorrect,
    feedbackImgCorrect: imgCorrect,
    answeredCount: answeredCount
  });
})()
