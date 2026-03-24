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
| 9 | `eval` 長 JS 會有 shell quoting 問題 | 寫入 `/tmp/*.js` 再用 `eval "$(cat /tmp/*.js)"` |
| 10 | 答錯不會跳題，只有答對才顯示「下一題」 | 用 hints 取得正確答案後提交；若無法輸入則用 JS 強制跳題 |

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

長 JS 寫入暫存檔，用 heredoc 避免 shell 衝突：
```bash
cat > /tmp/my_script.js << 'JSEOF'
(function(){ /* ... */ })()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/my_script.js)"
```

`'JSEOF'` 加單引號防止 shell interpolation。

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
