---
name: resolve-urls
description: Resolve URLs (展開資料夾連結)
---

# Resolve URLs (展開資料夾連結)

掃描 `urls/url_list.txt`，將資料夾 URL 展開為底下的題目 URL。

**何時呼叫：** QA 流程開始前（Step 0），或使用者新增資料夾 URL 到 `url_list.txt` 後。

---

## Step 1: 讀取 url_list.txt

讀取 `urls/url_list.txt`，逐行判斷 URL 類型：

| 特徵 | 類型 | 處理方式 |
|------|------|----------|
| URL 含 `/exercises/` | 題目 URL | 保留不動 |
| URL 不含 `/exercises/`（如 `/course-compare/...`） | 資料夾 URL | 需要展開 |
| 以 `#` 開頭 | 註解 | 跳過 |

**若沒有資料夾 URL，直接結束，不做任何變更。**

## Step 2: 展開資料夾 URL

對每個資料夾 URL：

### 2a. 開啟頁面

```bash
/opt/homebrew/bin/agent-browser open "<folder_url>"
/opt/homebrew/bin/agent-browser wait 5000
```

### 2b. 擷取題目連結

```bash
cat > /tmp/extract_exercise_links.js << 'JSEOF'
(function(){
  var links = document.querySelectorAll('a[href*="/exercises/"]');
  var exercises = [];
  links.forEach(function(a){
    var href = a.href;
    var text = a.textContent.trim().substring(0, 100);
    if (exercises.findIndex(function(e){ return e.href === href; }) === -1) {
      exercises.push({href: href, text: text});
    }
  });
  return JSON.stringify({count: exercises.length, exercises: exercises});
})()
JSEOF
/opt/homebrew/bin/agent-browser eval "$(cat /tmp/extract_exercise_links.js)"
```

### 2c. 處理失敗

若 `count` 為 0 或 eval 報錯：

1. 截圖確認頁面狀態
2. 若為登入牆，標記為 `# [Error: requires login] <url>`
3. 若頁面載入失敗，重試一次（`reload` + `wait 5000`）
4. 仍無法取得連結，標記為 `# [Error: no exercises found] <url>`

## Step 3: 更新 url_list.txt

將資料夾 URL 行替換為展開後的題目 URL：

**替換前：**
```
https://www.junyiacademy.org/course-compare/math-elem/math-5/k-m5a/k-m5a-c02 ToDo
```

**替換後：**
```
# [Expanded] https://www.junyiacademy.org/course-compare/math-elem/math-5/k-m5a/k-m5a-c02
https://www.junyiacademy.org/exercises/menzs5ba?topic=course-compare/math-elem/math-5/k-m5a/k-m5a-c02 ToDo
https://www.junyiacademy.org/exercises/m3ayb-aa?topic=course-compare/math-elem/math-5/k-m5a/k-m5a-c02 ToDo
...
```

### 規則

- 展開後的題目 URL 狀態一律設為 `ToDo`
- 原資料夾 URL 變成 `# [Expanded]` 註解（保留來源追溯）
- 已有 `# [Expanded]` 標記的資料夾不重複展開（冪等性）
- 已存在於 `url_list.txt` 的題目 URL 不重複新增（去重）

## Step 4: 輸出摘要

```
URL 展開結果：
- 資料夾 URL 數量: <N>
- 展開的題目 URL 總數: <N>
- 略過（已展開）: <N>
- 錯誤: <N>
- url_list.txt 已更新
```
