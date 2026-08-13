# Platform-Specific Gotchas (Junyi Academy)

QA 自動化過程中發現的平台特殊行為與解法。

## Gotchas 一覽

| # | 問題 | 解法 |
|---|------|------|
| 1 | 選項無 `[ref]` 標籤，`snapshot -i` 看不到 | 用 mouse 座標點擊，先截圖辨識位置 |
| 2 | `find text "解題說明"` 會匹配兩個元素 | 用 `click "#hint"` |
| 3 | 解題說明需重複點擊 `#hint` 逐步展開 (N/M) | 重複點擊直到最後一步 (N/N) |
| 4 | 首次答對後出現徽章彈窗 | `press Escape` 關閉 |
| 5 | 提交後按鈕從「提交答案」變「下一題」 | 用 `find text "下一題" click` 或同一個 ref |
| 6 | 題組頁含多題，上方有進度圓點 | 逐題做完後點「下一題」 |
| 7 | MathQuill 輸入框不能用 `fill` | 用 mouse 點擊 + `press` 逐字輸入 |
| 8 | agent-browser 路徑 | 一律用 `/opt/homebrew/bin/agent-browser` |
| 9 | `eval` 長 JS 會有 shell quoting 問題 | 放在 `scripts/` 目錄下，用 `eval "$(cat scripts/*.js)"` |
| 10 | 答錯不會跳題，只有答對才顯示「下一題」 | 用 hints 取得正確答案後提交；若無法輸入則用 JS 強制跳題 |
| 11 | 「提交答案」按鈕 `find text` 找不到、CSS click 沒反應 | 用 mouse 座標三連擊（move → down → up） |
| 12 | Perseus 文字輸入框（input-number widget）打字進不了 React state | JS native setter + dispatch `input`/`change` events |
| 13 | 欄位沒填齊時提交**靜默失敗**（無錯誤訊息、無 feedback） | 提交前確認所有欄位（含組合算式列）都已填值 |

## 詳細說明

### 1. 選項無 [ref] 標籤

選項按鈕（如 `(1) 20`）渲染為 `math` 元素，不會取得 `[ref=eN]` 參照。MathJax 也會攔截 `find text` 的點擊。

**必須用 mouse 座標：**
```bash
/opt/homebrew/bin/agent-browser mouse move <x> <y> && /opt/homebrew/bin/agent-browser mouse down && /opt/homebrew/bin/agent-browser mouse up
```

### 2. 解題說明按鈕

「解題說明」文字出現在兩處（面板標題 + 側欄按鈕），`find text` 會觸發 strict mode violation。

**永遠用 CSS id：** `/opt/homebrew/bin/agent-browser click "#hint"`

### 3. 解題說明逐步展開

每次點 `#hint` 顯示一步（1/3 → 2/3 → 3/3）。典型結構：
- Step 1/N：數學解法
- Step 2/N：推薦影片
- Step N/N：最終答案確認（「答案選 (X)」）

### 4. 徽章彈窗

首次答對出現「獲得全新的徽章 — 牛刀小試」modal。

**只有 `press Escape` 有效。** 以下方式都不行：
- `find text "✕" click`
- `click "button:has-text('✕')"`
- `dialog accept`

### 5. 提交 → 下一題按鈕

按鈕 ref 不變（通常是 `@e9`），也可用 `find text "下一題" click`。

### 6. 題組 (Question Groups)

「請完成這個題組」頁面含多題，進度圓點顯示數量（灰點 = 未答）。

### 7. MathQuill 輸入

React-controlled，`fill` 會 timeout。必須 mouse click + `press` 逐字：
- 分數：`"1", "0", "/", "7"` → `10/7`
- 負數：`"-", "1", "/", "3", "2"` → `-1/32`

### 8. agent-browser 路徑

永遠使用完整路徑：`/opt/homebrew/bin/agent-browser`

### 9. Shell Quoting for eval

長 JS 放在 `scripts/` 目錄下，用 file-based eval 避免 shell quoting 問題：
```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/my_script.js)"
```

含參數的 JS 檔（如 `set_mq.js`、`set_select.js`、`focus_drag_item.js`）以函數呼叫方式傳參：
```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/set_mq.js)('\\frac{3}{7}', 0)"
```

### 10. 答錯不會自動跳題

平台行為：答錯後 `#check-answer-button` 保持顯示（供重試），`#next-question-button` 維持 `display: none`。**只有答對才會出現「下一題」按鈕。**

提交錯誤答案 N 次都不會觸發跳題，所以不能靠「故意答錯」來前進。

**跳題方案（依優先順序）：**

1. **用 hints 取得答案**：重複點擊 `#hint` 展開所有步驟，最後一步通常含正確答案（如「答案選 (2)」），用該答案提交即可跳題。
2. **Reload 頁面**：若題型無法透過 UI 輸入（拖曳、畫圖等），先展開 hints 擷取內容供 QA 報告，再 `reload` 頁面。平台 reload 後會自動載入下一個 unanswered 題目。
   ```bash
   /opt/homebrew/bin/agent-browser reload
   /opt/homebrew/bin/agent-browser wait 5000
   ```

**注意：JS 強制跳題無效。** 答錯時 `#next-question-button` 帶有 `disabled` 屬性和 `buttonDisabled` class。即使用 JS 移除 disabled 並觸發 click / jQuery trigger，React 框架的事件處理仍會攔截，頁面不會切換。

### 11. 「提交答案」按鈕的點擊方式

（2026-08-13 headless Linux 環境驗證發現）

按鈕是 `<input type="button" value="提交答案">`——文字在 `value` 屬性不是 text node，所以 `find text "提交答案"` 會失敗。而 `click "#check-answer-button"` 雖回報成功（按鈕會拿到 focus 外框），但不觸發 React 的 handler，提交不會發生。

**必須用 mouse 座標三連擊**（同 gotcha #1 的手法）：

```bash
# 先用 JS 取得按鈕座標
agent-browser eval "(function(){var b=document.getElementById('check-answer-button');var r=b.getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()"
# 再點座標中心
agent-browser mouse move <x> <y> && agent-browser mouse down && agent-browser mouse up
```

### 12. Perseus 文字輸入框（input-number widget）

`[data-testid="perseus-input-number-widget"]` 的 `<input type="text">` 是 React controlled。`fill` 有時可以，但 mouse click + `keyboard type` 可能點不到 focus、值進不了 React state（畫面看起來沒變）。

**穩定做法：JS native setter + dispatch events：**

```js
(function(){
  var els = document.querySelectorAll('[data-testid=perseus-input-number-widget]');
  var el = els[INDEX];
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'VALUE');
  el.dispatchEvent(new Event('input', {bubbles: true}));
  el.dispatchEvent(new Event('change', {bubbles: true}));
  return el.value;
})()
```

### 13. 欄位沒填齊時提交靜默失敗

若題目含多個作答欄位（例如組合算式列「算式：[輸入框][運算符下拉][輸入框] = [MathQuill]」＋答案欄），只填部分欄位就按「提交答案」會**完全沒有反應**——無錯誤訊息、無 feedback、`check_result.js` 各欄位維持 false，看起來像點擊失敗，實際是前端驗證靜默擋下。

**提交前先用 `extract_inputs.js` / `extract_dropdown.js` 確認所有欄位（mathquill、text-input、select）都已填值。** 除錯時若「提交沒反應」，先懷疑有欄位漏填，再懷疑點擊方式。
