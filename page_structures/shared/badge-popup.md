# Badge Popup (徽章彈窗)

## Last Verified
- Date: 2026-03-17
- URL: `https://www.junyiacademy.org/exercises/j-m-basic-c-1-1-1`
- Note: Badge popup did NOT appear on this test run (may only trigger on first-ever correct answer)

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| Related video modal | `.modal.fade` | Pre-existing modal (for "建議課程") |
| Modal dialog | `.modal-dialog` | Inside modal |
| Modal content | `.modal-content` | |
| Points badge | `.points-badge-hover` | Badge hover element |
| Video overlay | `.video-overlay` | |
| Login overlay | `.login-overlay` | |

## JavaScript Extraction

```js
// Detect if any popup/modal is blocking interaction
(function(){
  // Check for visible modals
  var modals = document.querySelectorAll('.modal');
  var visibleModals = Array.from(modals).filter(function(m) {
    return m.classList.contains('in') || m.classList.contains('show') ||
           getComputedStyle(m).display !== 'none';
  });

  // Check for badge-specific elements
  var badge = document.querySelector('.points-badge-hover');
  var badgeVisible = badge && badge.offsetParent !== null;

  // Check for any overlay blocking the page
  var overlays = document.querySelectorAll('[class*="overlay"]');
  var visibleOverlays = Array.from(overlays).filter(function(o) {
    return o.offsetParent !== null;
  });

  return JSON.stringify({
    hasVisibleModal: visibleModals.length > 0,
    modalCount: visibleModals.length,
    modalTexts: visibleModals.map(function(m) { return m.textContent.substring(0, 100); }),
    badgeVisible: badgeVisible,
    visibleOverlays: visibleOverlays.map(function(o) { return o.className.toString().substring(0, 80); })
  });
})()
```

## Known Modals on Page

| Modal | Selector | Trigger |
|-------|----------|---------|
| "建議課程" | `.modal.fade` with `.modal-title` = "建議課程" | Related video button |
| Badge popup | (not directly observed — uses "獲得全新的徽章" text) | First correct answer |

## Snapshot Comparison
- When a modal is visible, it blocks all other interaction
- Badge popup shows "獲得全新的徽章 — 牛刀小試" text

## Known Gotchas
- Badge popup only appears after FIRST correct answer (may not appear in subsequent sessions)
- Dismiss with `press Escape` — this is the ONLY reliable method
- `find text "✕" click` fails (daemon resource error)
- `click "button:has-text('✕')"` fails (daemon resource error)
- `dialog accept` does not work (it's not a browser dialog)
- The `.modal.fade` on the page is for "建議課程" (related videos), NOT the badge popup
- Badge popup may use a different DOM structure — needs to be captured when it actually appears

## Raw HTML Sample
```html
<!-- Badge popup was not observed during this DOM exploration session.
     The following modals exist on the page but are hidden: -->
<div class="modal fade" id="related-video-content">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <span>×</span>
        <div class="h4 modal-title">建議課程</div>
      </div>
      <div class="modal-body">
        <!-- video suggestions -->
      </div>
    </div>
  </div>
</div>
```
