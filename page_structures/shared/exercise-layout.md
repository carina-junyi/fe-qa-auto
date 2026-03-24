# Exercise Layout — Overall Page Skeleton

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Main content wrapper | `#page-container-inner` | Contains header + pagecontent |
| Exercise content | `#pagecontent > article.root-container` | |
| Question area | `.question-area[data-speech-synthesis-id="question-area"]` | Inside `.css-14p04jj` |
| Perseus renderer | `.perseus-renderer.perseus-renderer-responsive` | Inside question area |
| Work area (question) | `#workarea` | Contains stem + widgets |
| Solution area | `#solutionarea` | Empty for fill-in type |
| Hints area (old) | `#hintsarea` | Unused in current layout |
| Hints area (new) | `.hints-area` | Actual hints container (MUI Box) |
| Answer button frame | `#answer-button-frame` | Contains submit/next buttons |
| Submit button | `#check-answer-button` | `<input type="button" value="提交答案">` |
| Next question button | `#next-question-button` | `<input type="button" value="下一題">` |
| Hint button | `#hint` | CSS id selector required |
| Feedback text | `#answer-feedback` | Shows "答對了，很棒喔！" etc. |
| Feedback container | `#answer-feedback-container` | Contains image + text |
| Problem history | `#problem-history-container` | Progress dots container |
| Exercise title | `#exercise-title` | |
| Helper menu | `#helper-menu` | Contains hint + related video buttons |

## Page Hierarchy

```
body > #outer-wrapper > #page-container > #page-container-inner
  ├── header.header-exercise
  │   ├── #top-header (logo, nav)
  │   └── nav#page_sub_nav (breadcrumb)
  └── #pagecontent > article.root-container > .nav-page-content
      ├── #nav-pane (sidebar navigation)
      └── .content-pane
          └── #container.exercises-content-container
              ├── .exercises-header (#exercise-title, #problem-history-block)
              └── .exercises-body > .exercises-stack > .exercises-card
                  └── #problem-and-answer.perseus-typography.framework-perseus
                      ├── #problem_area_wrap > #questionform > #problemarea
                      │   ├── #workarea (question stem + widgets)
                      │   ├── #solutionarea (answer content area)
                      │   └── #hintsarea (legacy, usually empty)
                      ├── .hints-area (actual hint display, MUI component)
                      └── #answer_area_wrap > #answer_area > #answerform
                          ├── #answer-button-frame
                          │   ├── #check-answer-button
                          │   └── #next-question-button
                          └── #helper-menu
                              ├── #hint (解題說明 button)
                              └── #related-video-button
```

## JavaScript Extraction

```js
// Page skeleton check
(function(){
  var workarea = document.getElementById('workarea');
  var solutionarea = document.getElementById('solutionarea');
  var hintsArea = document.querySelector('.hints-area');
  var checkBtn = document.getElementById('check-answer-button');
  var nextBtn = document.getElementById('next-question-button');
  return JSON.stringify({
    hasWorkarea: !!workarea,
    hasSolutionArea: !!solutionarea,
    hasHintsArea: !!hintsArea,
    checkBtnVisible: checkBtn ? checkBtn.offsetParent !== null : false,
    nextBtnVisible: nextBtn ? nextBtn.offsetParent !== null : false
  });
})()
```

## Snapshot Comparison
- `article` section contains all exercise content
- `button "Submit"` appears for submit, `button "下一題"` for next
- `textbox [ref=eN]` for input fields
- `math:` for MathJax-rendered expressions

## Known Gotchas
- `#hintsarea` (old DOM element) is EMPTY — hints render in `.hints-area` (MUI component)
- `#solutionarea` is empty for fill-in type questions (answers are inline in workarea)
- `#problem-and-answer` has both `perseus-typography` and `framework-perseus` classes

## Raw HTML Sample
```html
<div id="problem-and-answer" class="perseus-typography framework-perseus">
  <div id="problem_area_wrap" class="vertical-shadow">
    <form id="questionform">
      <div id="problemarea">
        <div id="workarea">
          <div class="MuiBox-root css-14p04jj">
            <div class="question-area MuiBox-root css-0" data-speech-synthesis-id="question-area">
              <div class="MuiBox-root css-bk9fzy">
                <div class="perseus-renderer perseus-renderer-responsive">
                  <!-- paragraphs with data-perseus-paragraph-index -->
                </div>
              </div>
            </div>
            <div class="hints-area MuiBox-root css-0">
              <!-- hint steps appear here -->
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
```
