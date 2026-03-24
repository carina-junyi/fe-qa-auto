# Explanation Hints (解題說明)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Hint button | `#hint` | CSS id — must use this, NOT text search |
| Hints container | `.hints-area` | MUI Box component (NOT `#hintsarea`) |
| Hint heading | `.hints-area > .css-hpgf8j` | Shows "解題說明" label |
| Hint step | `.hints-area > .css-qpp9hi` | Each step div |
| Step label | `.css-cp03zm` | Shows "1/2", "2/2", etc. |
| Step content renderer | `.hints-area .perseus-renderer` | Perseus renderer inside each step |
| Step paragraphs | `.hints-area .paragraph[data-perseus-paragraph-index]` | Ordered paragraphs |
| Block math | `.perseus-block-math` | Display-mode math in hints |
| Inline math | `mjx-container` inside hint step | MathJax v3 |

## JavaScript Extraction

```js
// Extract all hint steps with text and math
(function(){
  var hintsArea = document.querySelector('.hints-area');
  if (!hintsArea) return JSON.stringify({error: 'no .hints-area found'});

  var children = hintsArea.children;
  var hints = [];

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var cls = child.className.toString();

    // Skip the heading ("解題說明")
    if (cls.indexOf('css-hpgf8j') !== -1) continue;

    // Extract step label
    var labelEl = child.querySelector('[class*="css-cp03zm"]');
    var label = labelEl ? labelEl.textContent.trim() : null;

    // Extract content
    function extractText(node) {
      var parts = [];
      for (var j = 0; j < node.childNodes.length; j++) {
        var cn = node.childNodes[j];
        if (cn.nodeType === 3) {
          var t = cn.textContent.trim();
          if (t) parts.push({type: 'text', value: t});
        } else if (cn.nodeType === 1) {
          // Skip step label element
          if (cn.className.toString().indexOf('css-cp03zm') !== -1) continue;
          if (cn.tagName === 'MJX-CONTAINER') {
            var math = cn.querySelector('math');
            if (math) parts.push({type: 'math', value: math.textContent.trim()});
          } else {
            parts.push.apply(parts, extractText(cn));
          }
        }
      }
      return parts;
    }

    hints.push({
      step: label,
      content: extractText(child),
      text: child.textContent.trim()
    });
  }

  return JSON.stringify({totalSteps: hints.length, hints: hints});
})()
```

## Snapshot Comparison
- In snapshot, hints appear inline after the question content:
  - `text: 解題說明 1/2 利用`
  - `math: 分配律`
  - `text: 將式子展開 2/2`
  - `math: a(b−c)=ab−ac`

## Hint Structure Pattern

```
.hints-area
  ├── div.css-hpgf8j          → "解題說明" (heading)
  ├── div.css-qpp9hi           → Step 1
  │   ├── div.css-cp03zm       → "1/2" (step label)
  │   └── .perseus-renderer    → Step content (text + math)
  └── div.css-qpp9hi           → Step 2
      ├── div.css-cp03zm       → "2/2" (step label)
      └── .perseus-renderer    → Step content (text + math)
```

## Known Gotchas
- "解題說明" text appears in TWO places — always use `#hint` CSS id for the button
- Steps are revealed one at a time — must click `#hint` repeatedly
- Typical structure: Step 1/N = calculation hint, Step 2/N = recommended video or final answer
- `#hintsarea` (the old DOM element) is EMPTY — hints render in `.hints-area` (MUI Box)
- The CSS class names (`css-hpgf8j`, `css-qpp9hi`, `css-cp03zm`) are MUI generated and may change between builds
- Safer to select by: `.hints-area > div` for steps, or check for step label pattern `/^\d+\/\d+$/`

## Robust Fallback Selector

```js
// If MUI class names change, use this approach:
var hintsArea = document.querySelector('.hints-area');
var steps = [];
hintsArea.querySelectorAll(':scope > div').forEach(function(div) {
  var labelMatch = div.textContent.match(/^(\d+\/\d+)/);
  if (labelMatch) {
    steps.push({label: labelMatch[1], div: div});
  }
});
```

## Raw HTML Sample
```html
<div class="hints-area MuiBox-root css-0">
  <div class="MuiBox-root css-hpgf8j">解題說明</div>
  <div class="MuiBox-root css-qpp9hi">
    <div class="MuiBox-root css-cp03zm">1/2</div>
    <div class="perseus-renderer perseus-renderer-responsive">
      <div class="paragraph" data-perseus-paragraph-index="0">
        <div class="paragraph">
          利用<span style="white-space: nowrap;">
            <div class="MuiBox-root css-1fy0vcc">
              <mjx-container class="MathJax" jax="CHTML">
                <!-- MathJax rendered content -->
                <mjx-assistive-mml>
                  <math><!-- MathML --></math>
                </mjx-assistive-mml>
              </mjx-container>
            </div>
          </span>將式子展開
        </div>
      </div>
    </div>
  </div>
  <div class="MuiBox-root css-qpp9hi">
    <div class="MuiBox-root css-cp03zm">2/2</div>
    <div class="perseus-renderer perseus-renderer-responsive">
      <div class="paragraph perseus-paragraph-centered" data-perseus-paragraph-index="0">
        <div class="perseus-block-math">
          <div class="perseus-block-math-inner">
            <mjx-container class="MathJax" jax="CHTML">
              <!-- a(b−c)=ab−ac -->
            </mjx-container>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```
