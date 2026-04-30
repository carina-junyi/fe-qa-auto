---
name: probe-page
description: Probe Page (頁面探測)
---

# Probe Page (頁面探測)

開啟頁面後，探測頁面結構與題組資訊。

**前置條件：** 頁面已透過 `agent-browser open` 開啟。

---

## Step 1: Snapshot

取得 accessibility tree 與元素 ref：

```bash
/opt/homebrew/bin/agent-browser snapshot
```

## Step 2: DOM 探測

用 eval 取得頁面骨架、題目數量與題組類型：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/probe_page.js)"
```

**題組類型說明：**

| `exerciseMode` | 說明 | QA 策略 |
|----------------|------|---------|
| `sequential_quiz` | 依序型題組：固定 N 題，全部做完 | 逐題依序操作 |
| `exercise` | 累積型練習：從題目池隨機出題，累積答對 N 題完成 | 使用 hint-first 策略 + qid 覆蓋追蹤 |

## Step 3: 異常處理

若 `hasWorkarea: false` 或 `hasPerseusRenderer: false`：

1. 截圖視覺確認頁面狀態：
   ```bash
   /opt/homebrew/bin/agent-browser screenshot
   ```

2. 執行 DOM 探索尋找替代結構：
   ```bash
   /opt/homebrew/bin/agent-browser eval "$(cat scripts/dom_explore.js)"
   ```

3. 更新 `page_structures/shared/exercise-layout.md`

## Step 4: API 偵察

取得 exercise ID 後，呼叫 API 拿到完整題目池清單：

```bash
/opt/homebrew/bin/agent-browser eval "$(cat scripts/api_recon.js)"
```

API 回傳的資料**僅供以下用途**：
1. **追蹤覆蓋進度**：知道有幾題、哪些 qid 還沒驗證到
2. **備援參考**：browser 操作遇到困難時，可參考 API 的題目內容做 double check

> **注意**：不可直接使用 API 的答案提交。答案必須由 agent 獨立計算。
> 若使用了 API 資料做 double check，必須在 QA_result.txt 的 Notes 中標註遇到什麼困難。

## 輸出

```
頁面探測結果：
- exerciseMode: exercise / sequential_quiz
- exerciseId: <exercise ID>
- passCondition: <累積型需答對幾題，僅 exercise 模式有值>
- totalQuestions: <頁面上顯示的題目數>
- totalInPool: <API 回傳的題目池總數>
- answered: <已作答數>
- qids: <所有題目的 qid 列表>
- hasWorkarea: true/false
- hasPerseusRenderer: true/false
- snapshotRefs: <關鍵元素的 ref 列表>
```
