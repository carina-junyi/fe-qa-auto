---
name: resolve-urls
description: Resolve URLs (展開資料夾連結)
---

# Resolve URLs (展開資料夾連結)

掃描 `urls/url_list.txt`，將資料夾 URL 展開為底下的題目 URL。

**何時呼叫：** QA 流程開始前（Step 0），或使用者新增資料夾 URL 到 `url_list.txt` 後。

---

## Step 1: 執行展開 script

```bash
python3 scripts/resolve_urls.py
```

展開是**決定性 script**（直接打均一的 topicpage API），不需開瀏覽器：

- 資料夾 URL（junyiacademy URL 且不含 `/exercises/`）→ 換成
  `# [Expanded] <原URL>` ＋ 底下每題一行 `<題目URL> ToDo`
- 已展開（`# [Expanded]`）不重複展開（冪等）；已存在的題目 URL 不重複新增（去重）
- 巢狀子資料夾自動遞迴；`#topic-page-anchor-...` 連結先試小節、退回整頁
- 展不出題目 → 該行標 `# [Error: no exercises found]`；API 掛掉 → `# [Error: api failed]`
- script 結束時自行印出展開摘要（資料夾數／展開題數／略過／錯誤）

**把 script 印出的摘要原樣轉述，不要重算。**

> **隱藏題（[hidden]）：** topicpage API 對任何權限都過濾隱藏題，但 script 若讀得到
> `JUNYI_EMAIL` / `JUNYI_PASSWORD`（環境變數或 `.env`），會先純 HTTP 登入取得開發者
> 權限的 KAID cookie，展開時自動補上 API 看不到的隱藏題，並在摘要多印一行
> `- 其中隱藏題: <N>`。摘要出現該行＝隱藏題已含在展開結果裡，**不必**再請使用者貼單題
> URL。讀不到帳密時退回匿名展開（不含隱藏題），摘要會註明。

## Step 2: 失敗時的 fallback（僅當 script 整體失敗）

僅在 `resolve_urls.py` 本身無法執行（例如 python3 缺失、script 損毀）時，
退回舊的瀏覽器展開法：

```bash
/opt/homebrew/bin/agent-browser open "<folder_url>"
/opt/homebrew/bin/agent-browser wait 5000
/opt/homebrew/bin/agent-browser eval "$(cat scripts/extract_exercise_links.js)"
```

取得連結後依 Step 1 相同的格式規則更新 `url_list.txt`。
個別資料夾的 `# [Error: ...]` 標記**不是** fallback 的觸發條件——那是正常結果，照實回報即可。

## Step 3: 輸出摘要

```
URL 展開結果：
- 資料夾 URL 數量: <N>
- 展開的題目 URL 總數: <N>
- 略過（已展開）: <N>
- 錯誤: <N>
- url_list.txt 已更新
```
