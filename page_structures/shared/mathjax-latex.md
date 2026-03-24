# MathJax / LaTeX Extraction (數學式)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`

## MathJax Version
- **MathJax v3.2.2** (CHTML output)
- Input jax: TeX
- No `script[type="math/tex"]` tags (v3 does not use them)
- No KaTeX

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| MathJax container | `mjx-container` | Top-level math element |
| Visual rendering | `mjx-math.MJX-TEX` | `aria-hidden="true"` |
| Assistive MathML | `mjx-assistive-mml` | Contains readable `<math>` element |
| MathML element | `mjx-assistive-mml math` | Human-readable math text |
| Block math | `.perseus-block-math mjx-container` | Display-mode math |
| Inline math | `.MuiBox-root.css-1fy0vcc mjx-container` | Inline math wrapper |

## JavaScript Extraction

```js
// Extract all math expressions on the page as readable text
(function(){
  var containers = document.querySelectorAll('mjx-container');
  return JSON.stringify(Array.from(containers).map(function(c, i) {
    var mathEl = c.querySelector('math');
    var parent = c.closest('.question-area, .hints-area');
    var context = parent ? (parent.classList.contains('hints-area') ? 'hint' : 'question') : 'other';
    return {
      idx: i,
      text: mathEl ? mathEl.textContent.trim() : '',
      context: context,
      isBlock: !!c.closest('.perseus-block-math')
    };
  }));
})()
```

## LaTeX Source Recovery

MathJax v3 does NOT store original TeX source in an easily accessible way:
- No `script[type="math/tex"]` tags
- `MathJax.startup.document.math` linked list is a sentinel node with `next/prev/data` but yields no items
- **Best approach**: Read MathML from `mjx-assistive-mml > math` — gives human-readable math text

```js
// Read MathML text from all containers
(function(){
  return Array.from(document.querySelectorAll('mjx-container')).map(function(c) {
    var math = c.querySelector('math');
    return math ? math.textContent.trim() : '';
  });
})()
```

## MathML Output Examples

| LaTeX Source (estimated) | MathML `textContent` |
|--------------------------|---------------------|
| `a(b-c)=` | `a(b−c)=` |
| `-` | `−` |
| `\textcolor{blue}{分配律}` | `分配律` |
| `a(b-c) = ab - ac` | `a(b−c)=ab−ac` |

## Snapshot Comparison
- Math appears as `math:` nodes in snapshot: `math: a ( b − c ) =`
- Contains human-readable text (like MathML), not LaTeX source
- Snapshot math text has spaces between characters

## Known Gotchas
- MathJax v3, NOT v2 — no `MathJax.Hub`, uses `MathJax.typesetPromise`
- No `script[type="math/tex"]` tags exist
- MathML `textContent` may have Unicode minus `−` (U+2212) instead of ASCII hyphen `-`
- `mjx-math` has `aria-hidden="true"` — the visual rendering is NOT accessible
- `mjx-assistive-mml` is the accessible version with `<math>` MathML
- Some math is colored (e.g., `\textcolor{blue}{分配律}`) — MathML loses the color info
- MathJax renders asynchronously — may need `MathJax.typesetPromise()` to wait

## Raw HTML Sample
```html
<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0"
               ctxtmenu_counter="0" style="font-size: 122.9%; position: relative;">
  <mjx-math class="MJX-TEX" aria-hidden="true">
    <mjx-mi class="mjx-i"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi>
    <mjx-mo class="mjx-n"><mjx-c class="mjx-c28"></mjx-c></mjx-mo>
    <mjx-mi class="mjx-i"><mjx-c class="mjx-c1D44F TEX-I"></mjx-c></mjx-mi>
    <mjx-mo class="mjx-n" space="3"><mjx-c class="mjx-c2212"></mjx-c></mjx-mo>
    <mjx-mi class="mjx-i" space="3"><mjx-c class="mjx-c1D450 TEX-I"></mjx-c></mjx-mi>
    <mjx-mo class="mjx-n"><mjx-c class="mjx-c29"></mjx-c></mjx-mo>
    <mjx-mo class="mjx-n" space="4"><mjx-c class="mjx-c3D"></mjx-c></mjx-mo>
  </mjx-math>
  <mjx-assistive-mml unselectable="on" display="inline">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <mi>a</mi>
      <mo stretchy="false">(</mo>
      <mi>b</mi>
      <mo>−</mo>
      <mi>c</mi>
      <mo stretchy="false">)</mo>
      <mo>=</mo>
    </math>
  </mjx-assistive-mml>
</mjx-container>
```
