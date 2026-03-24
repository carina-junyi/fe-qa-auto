# Progress Dots (題組進度圓點)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Progress block | `#problem-history-block` | Contains dots + group label |
| Dot wrapper | `#problem-history-container` | Contains all dot images |
| Individual dot | `.problem-history-icon` | `<img>` elements |
| Group label | `#problem-history-block .section-headline` | Contains "請完成這個題組" |
| Skill progress | `.skill-progress` | Shows skill name |

## JavaScript Extraction

```js
// Extract progress dots: total, current, status of each
(function(){
  var container = document.getElementById('problem-history-container');
  if (!container) return JSON.stringify({error: 'no #problem-history-container'});

  var dots = container.querySelectorAll('.problem-history-icon');
  var total = dots.length;
  var statuses = Array.from(dots).map(function(dot, i) {
    var src = dot.src.split('/').pop();
    var status = 'blank';
    if (src === 'right_ans.svg') status = 'correct';
    else if (src === 'wrong_ans.svg') status = 'wrong';
    else if (src === 'blank.png') status = 'unanswered';
    return {idx: i, status: status, src: src};
  });

  var answered = statuses.filter(function(s) { return s.status !== 'unanswered'; }).length;

  return JSON.stringify({
    total: total,
    answered: answered,
    current: answered, // 0-indexed next question
    statuses: statuses
  });
})()
```

## Dot Image Sources

| Status | Image File | Description |
|--------|-----------|-------------|
| Unanswered | `blank.png` | Grey/blank dot |
| Correct | `right_ans.svg` | Gold/green dot |
| Wrong | `wrong_ans.svg` | Red dot (expected, needs confirmation) |

## Snapshot Comparison
- In snapshot: appears as a series of `img` elements inside article
- No text content — just images
- The group label "請完成這個題組" appears as `paragraph:` text

## Known Gotchas
- Pages with "請完成這個題組" contain multiple questions
- Number of `.problem-history-icon` images = number of questions in group
- Image paths are relative: `/khan-exercises/images/blank.png`
- All dots start as `blank.png`; changes to `right_ans.svg` or `wrong_ans.svg` after answering

## Raw HTML Sample
```html
<div id="problem-history-block">
  <div id="problem-history-wrapper">
    <div id="problem-history" class="exercise">
      <div id="problem-history-container">
        <img src="/khan-exercises/images/right_ans.svg" class="problem-history-icon">
        <img src="/khan-exercises/images/blank.png" class="problem-history-icon">
        <img src="/khan-exercises/images/blank.png" class="problem-history-icon">
        <img src="/khan-exercises/images/blank.png" class="problem-history-icon">
        <img src="/khan-exercises/images/blank.png" class="problem-history-icon">
        <img src="/khan-exercises/images/blank.png" class="problem-history-icon">
      </div>
    </div>
    <div class="info"><i class="fa fa-question-circle"></i></div>
    <div class="h3 section-headline exercise">
      <p>請完成這個題組</p>
    </div>
  </div>
</div>
```
