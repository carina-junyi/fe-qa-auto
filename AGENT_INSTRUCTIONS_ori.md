# Agent-Browser QA Workflow Instructions

## Overview

This document instructs an AI agent to perform QA (Quality Assurance) validation on math exercise pages from the Junyi Academy platform. The agent uses `agent-browser` CLI commands to interact with the browser.

## Source Data

- **URL list**: `urls/url_list.txt` — one URL per line
- **Source PDF**: `source/stems.pdf` — contains reference question stems and answers

---

## Platform-Specific Gotchas (Junyi Academy)

These were discovered during trial runs and are critical for reliable automation:

### 1. Answer options have NO `[ref]` tags

The answer option buttons (e.g., `(1) 20`, `(2) 21`) render as `math` elements in the
accessibility tree and do **not** get `[ref=eN]` references. They will NOT appear in
`agent-browser snapshot -i`.

**Solution:** Use `find text` with the full option text:
```bash
agent-browser find text "(2) 21" click
```

### 2. "解題說明" button must be targeted by CSS id `#hint`

The text "解題說明" appears in TWO places on the page:
- The heading label inside the explanation panel
- The orange button on the right sidebar

Using `find text "解題說明" click` will fail with a **strict mode violation** (2 matches).

**Solution:** Always use the CSS id selector:
```bash
agent-browser click "#hint"
```

### 3. Explanation steps are sequential (N/M pattern)

Clicking `#hint` reveals explanations one step at a time, labeled `1/3`, `2/3`, `3/3`, etc.
You must click `#hint` **repeatedly** until all steps are revealed. The typical structure:
- **Step 1/N**: The mathematical solution/calculation
- **Step 2/N**: Recommended video with time markers table
- **Step N/N**: Final answer confirmation (e.g., "答案選 (2)")

### 4. Badge popup appears after first correct answer

After submitting a correct answer, a modal popup appears ("獲得全新的徽章 — 牛刀小試").
This blocks further interaction.

**Solution:** Dismiss with Escape key:
```bash
agent-browser press Escape
```

**What does NOT work for closing this popup:**
- `find text "✕" click` — fails (daemon resource error)
- `click "button:has-text('✕')"` — fails (daemon resource error)
- `dialog accept` — does not apply (it's not a browser dialog)

### 5. After submission, "提交答案" becomes "下一題"

The green button changes from "提交答案" (Submit Answer) to "下一題" (Next Question)
after a successful submission. Its ref stays the same (typically `@e9`), but you can also
use:
```bash
agent-browser find text "下一題" click
```

### 6. Question groups (題組)

Pages with "請完成這個題組" contain multiple questions. Progress dots at the top show
how many questions exist in the group (e.g., 3 grey dots = 3 questions). After answering
one, click "下一題" to advance. Repeat the full QA flow for each question.

---

## Workflow Per URL

### Step 1: Open the Page

```bash
agent-browser open "<url>"
```

### Step 2: Snapshot the Page

Take a snapshot to get the accessibility tree with element references:

```bash
agent-browser snapshot
```

This returns the page structure with `[ref=eN]` references for interactive elements.
Also take a screenshot for visual verification:

```bash
agent-browser screenshot
```

### Step 3: Identify the Question Stem

From the snapshot output, extract the question text (題幹). The stem typically appears as
a series of `text` and `math` nodes inside the `article` section. Reconstruct the full
question by concatenating these nodes in order.

**Example snapshot fragment:**
```
- text: 從
- math: "1"
- text: 到
- math: "400"
- text: 的正整數中，將
- math: "19"
- text: 的倍數由小到大形成一個有限數列，試求此數列的項數為下列哪一個選項？
```

Reconstructed stem: `從 1 到 400 的正整數中，將 19 的倍數由小到大形成一個有限數列，試求此數列的項數為下列哪一個選項？`

### Step 4: Compare Stem with Source PDF

Check if the reconstructed stem matches (or is a close variant of) any question in
`source/stems.pdf`. Stems may differ by parameter values (e.g., "17" vs "19") but share
the same structure. Record the matching question ID (e.g., `2-1-1-1-I-1`).

### Step 5: Identify Question Type

Determine the question type from the snapshot:

| Type | How to Identify | Interaction Method |
|------|----------------|-------------------|
| **Single choice** (單選) | Numbered math options `(1)`, `(2)`, ... | `find text "(N) value" click` |
| **Multiple choice** (多選) | Instructions saying "選出正確的選項" | `find text` + click each correct option |
| **Fill-in** (填充) | Text input fields (`textbox` role) | `fill @eN "answer_value"` |

### Step 6: Answer the Question

Based on the matching question from the PDF, determine the correct answer.

#### For Single Choice Questions

Options do NOT have `[ref]` tags. Use `find text` with the full option label:

```bash
# Example: select option (2) 21
agent-browser find text "(2) 21" click
```

Verify selection with a screenshot (selected option turns blue):
```bash
agent-browser screenshot
```

#### For Multiple Choice Questions

Click each correct option individually:
```bash
agent-browser find text "(1) ..." click
agent-browser find text "(3) ..." click
```

#### For Fill-in Questions

Find the input field ref from the snapshot and fill it:
```bash
agent-browser fill @eN "answer_value"
```

### Step 7: Submit the Answer

The submit button is labeled "提交答案" and typically has a ref (e.g., `@e9`):

```bash
agent-browser click @e9
```

Then wait for the page to update:

```bash
agent-browser wait 2000
```

### Step 8: Dismiss Popup & Check Result

A badge popup may appear after a correct answer. Dismiss it first:

```bash
agent-browser press Escape
agent-browser wait 500
```

Then take a screenshot to verify the result:

```bash
agent-browser screenshot
```

Check for:
- Option highlighted in blue = selected answer
- Progress dot turned gold = correct
- Green button changed to "下一題" = submission accepted

### Step 9: Toggle All "解題說明" Steps

The explanation is revealed incrementally. Click `#hint` repeatedly to show all steps.

**Procedure:**

```bash
# Scroll down to see the explanation area
agent-browser scroll down 300

# Click to reveal step 1/N
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # verify step 1/N content

# Click to reveal step 2/N
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # verify step 2/N content

# Continue until step N/N is shown (look for "答案選 (X)" in the last step)
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # verify final step
```

**How to know you've seen all steps:** The last step (N/N) typically contains the text
"答案選 (X)" confirming the correct answer choice.

### Step 10: Verify & Record QA Results

Compare the following between the **webpage** and the **source PDF**:

| Check Item | What to Verify |
|-----------|----------------|
| **Stem text** | Does the question stem match (structurally) a question in the PDF? |
| **Options** | Are all answer options present and correctly displayed? |
| **Correct answer** | Does the platform's correct answer match the PDF's answer? |
| **Explanation** | Is the solution explanation consistent with the PDF's reference solution? |

### Step 11: Update url_list.txt

If the stem is found in the PDF and everything checks out:

```
https://example.com/exercise/abc ✓
```

If QA issues are found, append a note:

```
https://example.com/exercise/abc ✓ [answer mismatch: web=(2), pdf=(3)]
```

### Step 12: Next Question (if in a question group)

If the page is a question group ("請完成這個題組"), advance to the next question:

```bash
agent-browser find text "下一題" click
agent-browser wait 2000
agent-browser snapshot
```

Then repeat from Step 3 for the new question.

---

## Handling Edge Cases

### Page Requires Login

If the snapshot shows a login wall:
```bash
agent-browser snapshot
# If login required, note it and skip
```
Mark the URL with: `[requires login]`

### Question Not Loaded / JavaScript-Heavy

If the question content doesn't appear:
```bash
agent-browser wait --load networkidle
agent-browser wait 3000
agent-browser snapshot
```

### Elements Not Visible (Need Scrolling)

```bash
agent-browser scrollintoview @eN
# or
agent-browser scroll down 300
agent-browser snapshot
```

### Strict Mode Violation (Multiple Element Matches)

If `find text` fails because multiple elements match, use a more specific selector:
```bash
# Instead of: agent-browser find text "解題說明" click
# Use CSS id: agent-browser click "#hint"

# Or scope with locator chaining:
# agent-browser click "#workarea >> text=解題說明"
```

---

## Command Quick Reference

| Action | Command |
|--------|---------|
| Open URL | `agent-browser open "<url>"` |
| Take snapshot | `agent-browser snapshot` |
| Compact snapshot | `agent-browser snapshot -c` |
| Interactive-only snapshot | `agent-browser snapshot -i` |
| Screenshot | `agent-browser screenshot` |
| Full page screenshot | `agent-browser screenshot --full` |
| Click by ref | `agent-browser click @eN` |
| Click by CSS id | `agent-browser click "#hint"` |
| Click by text | `agent-browser find text "text" click` |
| Fill input | `agent-browser fill @eN "value"` |
| Check checkbox | `agent-browser check @eN` |
| Select dropdown | `agent-browser select @eN "value"` |
| Press key | `agent-browser press Enter` |
| Dismiss popup | `agent-browser press Escape` |
| Scroll down | `agent-browser scroll down 500` |
| Scroll to element | `agent-browser scrollintoview @eN` |
| Wait (ms) | `agent-browser wait 2000` |
| Wait for element | `agent-browser wait @eN` |
| Wait for network | `agent-browser wait --load networkidle` |
| Get element text | `agent-browser get text @eN` |

---

## Example: Full QA Flow (Verified Working)

This example was tested against a real Junyi Academy exercise page.

```bash
# 1. Open the page
agent-browser open "https://www.junyiacademy.org/course-compare/math-high/math-10/j-m10a/j-m10a-c04/new-topic-7a56a1/e/mcenter-n-10-6-2-1"

# 2. Snapshot + screenshot to see the question
agent-browser snapshot
agent-browser screenshot

# 3. (Agent reads stem, matches to PDF question 2-1-1-1-I-1, answer is (2))

# 4. Click the correct answer option using find text
agent-browser find text "(2) 21" click

# 5. Verify selection (option should turn blue)
agent-browser screenshot

# 6. Submit the answer
agent-browser click @e9    # "提交答案" button

# 7. Wait for result
agent-browser wait 2000

# 8. Dismiss badge popup
agent-browser press Escape
agent-browser wait 500

# 9. Screenshot to verify correct answer
agent-browser screenshot

# 10. Toggle explanation step 1/3
agent-browser scroll down 300
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # Shows: "1/3  400 ÷ 19 = 21...1"

# 11. Toggle explanation step 2/3
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # Shows: recommended video table

# 12. Toggle explanation step 3/3
agent-browser click "#hint"
agent-browser wait 1000
agent-browser screenshot    # Shows: "3/3  答案選 (2)"

# 13. (Agent verifies answer and explanation match PDF)
# 14. Record result in url_list.txt: append ✓
```
