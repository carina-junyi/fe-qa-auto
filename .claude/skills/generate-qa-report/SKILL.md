---
name: generate-qa-report
description: Generate QA Report (產生 QA 報告)
---

# Generate QA Report (產生 QA 報告)

收集所有 URL 的 QA 結果，依照 `references/qa-report-format.md` 的格式產生 `QA_result.txt`。

**何時呼叫：** 所有 `url_list.txt` 中的 URL 皆已處理完畢（狀態為 `DonePass`、`DoneFail` 或 `SKIPPED`）後呼叫。

---

## Step 1: 收集結果

從本次 QA 執行過程中收集每個 URL 的結果資料：

- URL
- Status（PASS / FAIL / SKIPPED）
- Duration（該 URL 從開始到完成的耗時，格式 mm:ss）
- 每題的：
  - qid（題目識別碼，從 `Exercises.PerseusBridge.getSeedInfo().problem_type` 取得）
  - 題型（單選/多選/填充/拖曳排序）
  - 重建題幹
  - 自己計算的答案
  - 平台的正確答案
  - 正確/錯誤判定
  - 若正確：為何正確的推理步驟
  - 若錯誤：錯誤位置、錯誤內容、正確值、修正建議
  - Notes（降級紀錄、額外觀察）

## Step 2: 產生報告

讀取 `references/qa-report-format.md` 中的範本格式，將收集到的結果填入，寫入專案根目錄的 `QA_result.txt`。

**報告內容包含：**
- Header：生成日期、檢查的 URL 數量
- 每個 URL 的詳細結果（含 Duration 耗時，逐題列出）
- Summary：passed / failed / skipped 各幾個，以及總耗時

## Step 3: 驗證報告

產生後確認：

1. 檔案已成功寫入 `QA_result.txt`
2. URL 數量與 `url_list.txt` 中已處理的數量一致
3. Summary 數字正確（passed + failed + skipped = 總數）

## 注意事項

- 若 `QA_result.txt` 已存在，覆寫之
- SKIPPED 的 URL 也要列出，附上原因（如 `requires login`、`非支援題型，請使用者手動 QA`）
- 每題無論正確或錯誤，都必須列出完整的判斷原因或錯誤描述
