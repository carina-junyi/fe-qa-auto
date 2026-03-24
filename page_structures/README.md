# Page Structures — DOM Reference for Junyi Academy Exercise Pages

## Purpose

This folder documents the DOM structure of each element type on Junyi Academy exercise pages. The agent should consult these files to extract data via `eval` JS instead of relying on screenshots.

## Data Extraction Priority

1. **`eval` (DOM query)** — fastest, structured, most reliable
2. **`snapshot`** — accessibility tree, good for text + refs
3. **`screenshot`** — visual fallback, only when DOM/snapshot fails

## Folder Structure

```
page_structures/
├── README.md              ← 本檔案
├── shared/                ← 所有題型共用的 DOM 結構
│   ├── exercise-layout.md     整體頁面骨架
│   ├── question-stem.md       題幹（文字 + 數學式）
│   ├── mathjax-latex.md       MathJax 渲染與 LaTeX 擷取
│   ├── progress-dots.md       題組進度圓點
│   ├── badge-popup.md         徽章彈窗
│   ├── submit-result.md       提交按鈕 + 結果回饋
│   └── explanation-hints.md   解題說明步驟
├── choice/                ← 選擇題（單選 / 多選）專屬
│   └── answer-options.md      選項按鈕
└── fill-in/               ← 填充題專屬
    └── answer-input.md        填充輸入框
```

## File Index

### shared/ — 共用元素

| File | Element |
|------|---------|
| `shared/exercise-layout.md` | Overall page skeleton |
| `shared/question-stem.md` | Question stem (題幹) text + math |
| `shared/mathjax-latex.md` | MathJax rendering & LaTeX extraction |
| `shared/progress-dots.md` | Question group progress dots |
| `shared/badge-popup.md` | Badge popup after first correct answer |
| `shared/submit-result.md` | Submit button + correct/incorrect feedback |
| `shared/explanation-hints.md` | Explanation steps (解題說明) |

### choice/ — 選擇題專屬

| File | Element |
|------|---------|
| `choice/answer-options.md` | Multiple-choice option buttons |

### fill-in/ — 填充題專屬

| File | Element |
|------|---------|
| `fill-in/answer-input.md` | Fill-in text input fields |

## File Format

Each file follows this structure:

```
# <Element Name>

## Last Verified
- Date: YYYY-MM-DD
- URL: <test URL used>

## CSS Selectors

| Purpose | Selector | Notes |
|---------|----------|-------|
| ... | ... | ... |

## JavaScript Extraction

\`\`\`js
// eval-ready JS code
\`\`\`

## Snapshot Comparison
- What it looks like in `agent-browser snapshot` output

## Known Gotchas
- Pitfalls, edge cases

## Raw HTML Sample
\`\`\`html
<!-- actual HTML from page -->
\`\`\`
```

## Maintenance — 自動維護規則

這些檔案不是一次性文件，agent 在每次 QA 執行過程中必須自動維護。

### 觸發更新的時機

| 觸發條件 | 必要動作 |
|----------|---------|
| **eval 失敗**（selector 找不到元素） | 用 snapshot + screenshot 探索新結構，更新對應的 `*.md` |
| **發現新的元素類型** | 新增或更新對應的架構檔案 |
| **HTML 結構有變但 selector 仍有效** | 更新 `Raw HTML Sample` 和 `Last Verified` |
| **成功完成 QA 且結構一致** | 僅更新 `Last Verified` 日期 |

### 更新時必須修改的欄位

1. `Last Verified` — 日期與測試 URL
2. `CSS Selectors` — 如果 selector 變了
3. `JavaScript Extraction` — 如果 JS 程式碼需要調整
4. `Raw HTML Sample` — 如果 HTML 結構有變
5. `Known Gotchas` — 記錄新發現的問題

### 降級流程

```
eval (DOM) ──失敗──► snapshot ──失敗──► screenshot
     │                 │                   │
     成功→繼續          成功→繼續            成功→繼續
     │                 │                   │
     更新 Last         更新檔案 +           更新檔案 +
     Verified          記錄降級             記錄降級
```

任何降級都必須記錄到 QA_result.txt 的 Notes 欄位。
