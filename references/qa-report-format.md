# QA_result.txt Format

產生於專案根目錄，所有 URL 處理完後生成。

## 範本

```
QA Report
Generated: <YYYY-MM-DD HH:MM>
URLs checked: <N>
================================================================================

[1] <url>
    Status   : ✓ PASS  |  ✗ FAIL  |  ⚠ WARN  |  - SKIPPED (<reason>)
    Duration : <mm:ss>
    Questions: <total count>

    Q1 (<type: 單選/多選/填充>) [qid: <question id>]
      Result  : ✓ 正確  |  ✗ 錯誤
      Stem    : <reconstructed question text>
      Answer  : <my calculated answer>
      Platform: <platform's accepted answer>

      若正確 — 判斷原因：
        <逐步說明為什麼題幹、選項、答案、解題說明在內容上正確（數學：驗算；語文／知識：語法、事實、選項唯一性）>

      若錯誤 — 錯誤描述與建議修正：
        錯誤位置: <Stem / Options / Answer / Explain step N/M>
        錯誤內容: <具體描述>
        正確應為: <正確結果>
        建議修正: <如何調整>

      若 WARN — API 備援紀錄：
        困難描述: <browser 操作遇到什麼困難>
        備援方式: <使用了 API 的什麼資料做 double check>
        驗證結果: <透過 API 資料確認內容正確>

    Q2 ...
    Notes: <extra observations, or "none">

--------------------------------------------------------------------------------
[2] <url> ...

================================================================================
Summary: <N> passed, <N> failed, <N> warned, <N> skipped
Total Duration: <hh:mm:ss>
```

## 填寫規則

- `✓ PASS`：所有題目無內容錯誤
- `✗ FAIL`：任一題有內容錯誤，逐題描述
- `⚠ WARN`：內容正確（題目檔驗過），但瀏覽器抽查沒做成（新版 UI、要登入、頁面開不起來、抽查題未上架…）或抽到輕微渲染問題——頁面未完整驗證。困難描述寫 notes 裡的 `browser_spotcheck: …` 原因；`qid:`／`cr:` 目標沒有作答頁，不算 WARN。
- `- SKIPPED`：附原因（如 `requires login`、`非支援題型，請使用者手動 QA`）。**科目不是理由**——英文、國文、自然、社會題一律照驗。
- 每題必須列出：重建題幹、自己的計算答案、平台答案
- 正確題：說明**為何正確**的推理步驟
- 錯誤題：指出**確切錯誤位置**並提供**具體修正建議**
- WARN 題：標註 browser 遇到的困難、使用了 API 的什麼資料做 double check
