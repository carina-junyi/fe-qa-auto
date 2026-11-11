(function(){
  // 舊版 DOM：靠固定 id（#check-answer-button、#next-question-button、#answer-feedback）。
  // 新版作答頁（/exercise、/sequential-quiz）沒有這些 id：按鈕靠文字（「提交答案」→ 提交後變「下一題」），
  // 回饋是一個彈出的 [role=dialog]（答對：「答對了，很棒喔！」「太棒了，你做到了！」；答錯：「再想一下，你越來越接近了！」）。
  function visible(el){ return !!(el && el.offsetParent !== null); }
  function buttonByText(texts){
    return Array.from(document.querySelectorAll('button')).find(function(b){
      return texts.indexOf((b.textContent || '').trim()) !== -1 && visible(b);
    }) || null;
  }
  var CORRECT = ['答對', '太好了', '太棒了'];
  var WRONG = ['再想一下', '越來越接近', '再試一次', '答錯'];
  function has(text, kws){ return kws.some(function(kw){ return text.indexOf(kw) !== -1; }); }

  var legacyCheck = document.getElementById('check-answer-button');
  var legacyNext = document.getElementById('next-question-button');
  var feedback = document.getElementById('answer-feedback');
  var feedbackImg = document.getElementById('answer-feedback-img');
  var dots = document.querySelectorAll('.problem-history-icon');
  var answeredCount = Array.from(dots).filter(function(d){ return d.src.indexOf('blank') === -1; }).length;

  if (legacyCheck || legacyNext || feedback) {
    var text = feedback ? feedback.textContent : '';
    // 答對回饋文案不只一種（「答對了，很棒喔！」「太好了！你很努力~」…），
    // 圖片訊號（correct_answer.png）比文案穩定，兩者取 OR。
    var imgCorrect = !!(feedbackImg && feedbackImg.src && feedbackImg.src.indexOf('correct_answer') !== -1);
    return JSON.stringify({
      ui: 'legacy',
      isSubmitted: legacyCheck && legacyCheck.offsetParent === null,
      hasNextButton: legacyNext && legacyNext.offsetParent !== null,
      feedbackText: text.trim(),
      isCorrect: has(text, CORRECT) || imgCorrect,
      feedbackImgCorrect: imgCorrect,
      answeredCount: answeredCount
    });
  }

  // 新版
  // 主站 AttemptBar：答對才會鎖住這一題（isAwaitingNext），按鈕從「提交答案」換成「下一題」——這是不會消失的訊號，
  // 也是唯一拿來判答對的依據。回饋文字是一個只顯示 5 秒的彈出框，頁面上還有別的訊息會帶「答對」兩個字
  // （例如「總共答對 1 題習題」、「獲得新徽章」視窗），所以文字只認主站寫死的那三句，而且只用來判答錯：
  //   答對 = 「下一題」在、「提交答案」不在
  //   答錯 = 「提交答案」還在（可以再試）且看得到「再想一下，你越來越接近了！」——只有提交後 5 秒內看得到，
  //          所以提交後等 1～2 秒就要跑這一支
  var submitBtn = buttonByText(['提交答案']);
  var nextBtn = buttonByText(['下一題']);
  var NEW_CORRECT = ['答對了，很棒喔', '太棒了，你做到了'];
  var NEW_WRONG = ['再想一下，你越來越接近了'];
  var feedbackText = '', sawWrong = false;
  Array.from(document.querySelectorAll('[role="dialog"], [role="status"], [role="alert"]')).forEach(function(el){
    ((el.innerText || el.textContent || '').trim()).split('\n').forEach(function(line){
      line = line.trim();
      var wrong = has(line, NEW_WRONG);
      if (wrong) sawWrong = true;
      if (!feedbackText && (wrong || has(line, NEW_CORRECT))) feedbackText = line.substring(0, 80);
    });
  });
  var isCorrect = !submitBtn && !!nextBtn;
  var isWrong = !isCorrect && !!submitBtn && sawWrong;
  return JSON.stringify({
    ui: 'new',
    isSubmitted: isCorrect || isWrong,
    hasNextButton: !!nextBtn,
    hasSubmitButton: !!submitBtn,
    feedbackText: feedbackText,
    isCorrect: isCorrect,
    // isCorrect、isWrong 都是 false：還沒提交，或答錯但已超過 5 秒、回饋消失了（重新提交一次再看）
    isWrong: isWrong
  });
})()
