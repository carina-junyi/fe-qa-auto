# Dropdown Select (下拉式選單)

## Last Verified
- Date: 2026-03-23
- URL: `https://www.junyiacademy.org/exercises/jfc-9-02-1-2a`

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Select element | `select.MuiBox-root` | Native `<select>` inside `.perseus-widget-container` |
| Select (test ID) | `[data-testid="perseus-input-number-widget"]` | Text inputs that often appear alongside dropdowns |
| Widget container | `.perseus-widget-container.widget-nohighlight` | Parent wrapper (display: inline-block) |
| MUI wrapper | `.MuiBox-root.css-1kuy7z7` | Intermediate wrapper |
| Option inner wrapper | `.MuiBox-root.css-g99td1` | Direct parent of `<select>` |

## JavaScript Extraction

```js
// Extract all dropdown selects with options and positions
(function(){
  var workarea = document.getElementById('workarea');
  if (!workarea) return JSON.stringify({error: 'no workarea'});

  var selects = workarea.querySelectorAll('select');
  if (selects.length === 0) return JSON.stringify({error: 'no select elements', count: 0});

  var result = Array.from(selects).map(function(s, i){
    var rect = s.getBoundingClientRect();
    var opts = Array.from(s.options).map(function(o){
      return {value: o.value, text: o.textContent.trim(), selected: o.selected, disabled: o.disabled};
    });

    // Get surrounding context (paragraph text)
    var para = s.closest('[data-perseus-paragraph-index]') || s.closest('.paragraph') || s.parentElement;
    var context = para ? para.textContent.trim().substring(0, 200) : '';

    return {
      idx: i,
      className: s.className,
      optionCount: opts.length,
      options: opts,
      defaultText: opts.length > 0 ? opts[0].text : '',
      rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)},
      center: {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)},
      context: context
    };
  });

  return JSON.stringify({count: selects.length, selects: result});
})()
```

## Interaction Method

Use `agent-browser select` command with the select element's CSS selector or ref:

```bash
# By CSS selector (if select has unique position)
/opt/homebrew/bin/agent-browser select "select.MuiBox-root" "<value>"

# By ref (from snapshot)
/opt/homebrew/bin/agent-browser select @eN "<value>"

# Multiple selects: use nth-child or JS to target specific one
/opt/homebrew/bin/agent-browser eval "document.querySelectorAll('select')[0].value = '2'; document.querySelectorAll('select')[0].dispatchEvent(new Event('change', {bubbles: true}));"
```

**Note:** The `value` parameter is the option's `value` attribute (e.g., `"1"`, `"2"`), NOT the display text (e.g., `"向上"`, `"向下"`).

## Mixed Question Pattern

Dropdown questions often appear alongside text input fields (`input[type="text"]` with `data-testid="perseus-input-number-widget"`). These are NOT MathQuill fields — they are plain text inputs that accept `agent-browser fill` or click + type.

Typical mixed structure:
```
(1) 開口方向：[dropdown: 向上/向下]
(2) 對稱軸：x= [text input]
(3) 最高點或最低點坐標：([text input], [text input])
```

## Snapshot Comparison
- In snapshot: `<select>` appears as `combobox [ref=eN]`
- Options appear as text within the combobox
- Text inputs appear as `textbox [ref=eN]`

## Known Gotchas
- First option (value `"0"`) is typically the placeholder/label (e.g., "向上/向下") and is `disabled`
- Actual options start from value `"1"`
- The `<select>` has MUI class names (`css-dfbug0`) that may change between builds
- Use `select.MuiBox-root` or the widget container as a more stable selector
- When multiple `<select>` elements exist, use index-based JS selection or snapshot refs

## Raw HTML Sample
```html
<div class="perseus-widget-container widget-nohighlight" style="display: inline-block;">
  <div class="MuiBox-root css-1kuy7z7">
    <div class="MuiBox-root css-g99td1">
      <select class="MuiBox-root css-dfbug0">
        <option value="0" disabled="">向上/向下</option>
        <option value="1">向上</option>
        <option value="2">向下</option>
      </select>
    </div>
  </div>
</div>
```
