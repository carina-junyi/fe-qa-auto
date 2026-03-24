# Question Stem (題幹)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Question area | `.question-area` | Contains stem + answer widgets |
| Perseus renderer | `.question-area .perseus-renderer` | Main content wrapper |
| Paragraphs | `.perseus-renderer .paragraph[data-perseus-paragraph-index]` | Ordered by index |
| Math expressions | `mjx-container` | MathJax v3 CHTML output |
| MathML (readable) | `mjx-container mjx-assistive-mml math` | Human-readable math |
| Widget containers | `.perseus-widget-container` | Images, inputs, radio groups |
| Question images | `.perseus-widget-container img` | Diagram/figure images |

## JavaScript Extraction

```js
// Extract question stem: text + math + widgets
(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no #workarea'});

  function extractContent(node) {
    var parts = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3) {
        var t = child.textContent.trim();
        if (t) parts.push({type: 'text', value: t});
      } else if (child.nodeType === 1) {
        var tag = child.tagName;
        var cls = (child.className || '').toString();

        if (tag === 'MJX-CONTAINER') {
          var math = child.querySelector('math');
          if (math) parts.push({type: 'math', value: math.textContent.trim()});
        } else if (cls.indexOf('perseus-widget-container') !== -1) {
          var img = child.querySelector('img');
          var mqField = child.querySelector('.mq-editable-field');
          if (img) {
            parts.push({type: 'image', src: img.src, alt: img.alt});
          } else if (mqField) {
            var mqBlock = child.querySelector('.mq-root-block');
            parts.push({type: 'input', value: mqBlock ? mqBlock.textContent.trim() : ''});
          } else {
            parts.push({type: 'widget', text: child.textContent.trim().substring(0, 100)});
          }
        } else if (cls.indexOf('hints-area') !== -1) {
          // Skip hints area — not part of stem
        } else if (['P','DIV','SPAN','STRONG','EM','B','I'].indexOf(tag) !== -1) {
          parts.push.apply(parts, extractContent(child));
        } else if (tag === 'BR') {
          parts.push({type: 'break'});
        } else {
          var text = child.textContent.trim();
          if (text) parts.push({type: 'other', tag: tag, value: text.substring(0, 100)});
        }
      }
    }
    return parts;
  }

  var questionArea = document.querySelector('.question-area');
  return JSON.stringify({
    parts: extractContent(questionArea || workarea),
    fullText: (questionArea || workarea).textContent.trim().substring(0, 500)
  });
})()
```

## Snapshot Comparison
- In snapshot: appears as series of `text:` and `math:` nodes inside `article` section
- Example: `text: 利用分配律完成下列式子（依降冪表示。）`
- Math: `math: a ( b − c ) =`

## Known Gotchas
- The `.question-area` may include widgets (images, inputs) interspersed with text
- Some questions have images from S3 (`junyiexerciseimg.s3.ap-southeast-1.amazonaws.com`)
- Must skip `.hints-area` when extracting stem (it's a sibling of question-area inside workarea)
- Math text from `math` MathML element may have spaces between characters (e.g., `a ( b − c )`)
- `data-perseus-paragraph-index` attributes mark paragraph order

## Raw HTML Sample
```html
<div class="question-area MuiBox-root css-0" data-speech-synthesis-id="question-area">
  <div class="MuiBox-root css-bk9fzy">
    <div class="perseus-renderer perseus-renderer-responsive">
      <div class="paragraph" data-perseus-paragraph-index="0">
        <div class="paragraph">利用分配律完成下列式子（依降冪表示。）</div>
      </div>
      <div class="paragraph" data-perseus-paragraph-index="1">
        <div class="paragraph">
          <div class="perseus-widget-container widget-nohighlight" style="display: block;">
            <div class="MuiBox-root css-1kuy7z7">
              <img class="MuiBox-root css-rzjjhl"
                   src="https://junyiexerciseimg.s3.ap-southeast-1.amazonaws.com/..."
                   alt="image widget">
            </div>
          </div>
        </div>
      </div>
      <div class="paragraph" data-perseus-paragraph-index="2">
        <div class="paragraph">
          <span style="white-space: nowrap;">
            <div class="MuiBox-root css-1fy0vcc">
              <mjx-container class="MathJax" jax="CHTML">
                <mjx-math class="MJX-TEX" aria-hidden="true">...</mjx-math>
                <mjx-assistive-mml>
                  <math xmlns="http://www.w3.org/1998/Math/MathML">
                    <mi>a</mi><mo>(</mo><mi>b</mi><mo>−</mo><mi>c</mi><mo>)</mo><mo>=</mo>
                  </math>
                </mjx-assistive-mml>
              </mjx-container>
            </div>
          </span>
          <div class="perseus-widget-container widget-nohighlight" style="display: inline-block;">
            <!-- MathQuill input field -->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```
