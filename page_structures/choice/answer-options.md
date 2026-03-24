# Answer Options (選擇題選項)

## Last Verified
- Date: 2026-03-17
- URL: (fill-in question observed; choice question structure pending verification with 2nd URL)

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Widget container | `.perseus-widget-container` | Wraps each option group |
| Radio group (expected) | `[role="radiogroup"]`, `.perseus-radio-group` | To be confirmed |
| Individual option | `[role="radio"]`, `.choice-option` | To be confirmed |
| Selected option | `[aria-checked="true"]` | To be confirmed |
| Option text/math | Option > `mjx-container math` | MathML for math options |

## JavaScript Extraction

```js
// Extract choice options (for single/multiple choice questions)
(function(){
  // Look for radio groups or choice containers
  var radioGroups = document.querySelectorAll('[role="radiogroup"]');
  if (radioGroups.length === 0) {
    // Try alternative selectors
    var widgets = document.querySelectorAll('.perseus-widget-container');
    var choices = [];
    widgets.forEach(function(w) {
      var radios = w.querySelectorAll('[role="radio"], [role="checkbox"], input[type="radio"]');
      if (radios.length > 0) {
        choices.push({
          type: 'choice-group',
          options: Array.from(radios).map(function(r, i) {
            return {
              idx: i,
              checked: r.checked || r.getAttribute('aria-checked') === 'true',
              text: r.textContent.trim().substring(0, 200),
              rect: r.getBoundingClientRect()
            };
          })
        });
      }
    });
    return JSON.stringify({type: 'widget-based', choices: choices});
  }

  return JSON.stringify(Array.from(radioGroups).map(function(rg) {
    var options = rg.querySelectorAll('[role="radio"]');
    return {
      options: Array.from(options).map(function(opt, i) {
        var math = opt.querySelector('math');
        return {
          idx: i,
          label: opt.textContent.trim().substring(0, 200),
          mathML: math ? math.textContent.trim() : null,
          checked: opt.getAttribute('aria-checked') === 'true',
          rect: opt.getBoundingClientRect()
        };
      })
    };
  }));
})()
```

## Snapshot Comparison
- Options render as `math` elements in accessibility tree
- They do NOT get `[ref=eN]` references
- Will NOT appear in `snapshot -i`

## Known Gotchas
- MathJax intercepts `find text` clicks — must use mouse coordinates
- Options have no `[ref]` tags in snapshot
- For choice questions, need screenshot or `getBoundingClientRect()` for click coordinates
- First URL observed was fill-in type; choice-specific selectors need confirmation

## Raw HTML Sample
```html
<!-- To be captured from a choice-type question -->
```
