# Answer Input (填充題輸入框)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| MathQuill field | `.mq-editable-field.mq-math-mode` | The styled input container |
| Textarea (internal) | `.mq-editable-field .mq-textarea textarea` | Hidden textarea for keyboard input |
| Value display | `.mq-root-block` | Shows current typed content |
| Empty indicator | `.mq-root-block.mq-empty` | Class present when field is empty |
| Widget wrapper | `.perseus-widget-container` containing `.mq-editable-field` | |
| MathQuill block ID | `[mathquill-block-id]` | Unique per input field |

## JavaScript Extraction

```js
// Extract fill-in input fields: positions and current values
(function(){
  var fields = document.querySelectorAll('.mq-editable-field.mq-math-mode');
  return JSON.stringify(Array.from(fields).map(function(f, i) {
    var block = f.querySelector('.mq-root-block');
    var rect = f.getBoundingClientRect();
    return {
      idx: i,
      value: block ? block.textContent.trim() : '',
      isEmpty: block ? block.classList.contains('mq-empty') : true,
      blockId: block ? block.getAttribute('mathquill-block-id') : null,
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }));
})()
```

## Snapshot Comparison
- Appears as `textbox [ref=eN]` in snapshot
- Current text content shown after ref

## Known Gotchas
- `agent-browser fill @eN` will TIME OUT — these are React-controlled MathQuill fields
- Must use mouse click to focus, then `press` for each character
- For fractions like 10/7: press "1", "0", "/", "7"
- For negatives like -1/32: press "-", "1", "/", "3", "2"
- Each input has a `mathquill-block-id` attribute for unique identification
- Input style: `min-width: 100px; padding: 2px; border: 1px solid rgb(164, 164, 164); border-radius: 4px; background: white`

## Raw HTML Sample
```html
<div class="perseus-widget-container widget-nohighlight" style="display: inline-block;">
  <div class="MuiBox-root css-1kuy7z7">
    <div class="MuiBox-root css-79elbk">
      <span class="mq-editable-field mq-math-mode"
            style="min-width: 100px; padding: 2px; border: 1px solid rgb(164, 164, 164); border-radius: 4px; background: white;">
        <span class="mq-textarea">
          <textarea autocapitalize="off" autocomplete="off" autocorrect="off"
                    spellcheck="false" x-palm-disable-ste-all="true"></textarea>
        </span>
        <span class="mq-root-block mq-empty" mathquill-block-id="1"></span>
      </span>
    </div>
  </div>
</div>
```
