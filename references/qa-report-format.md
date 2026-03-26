# QA_result.txt Format

產生於專案根目錄，所有 URL 處理完後生成。

## 範本

```
QA Report
Generated: <YYYY-MM-DD HH:MM>
URLs checked: <N>
================================================================================

[1] <url>
    Status   : ✓ PASS  |  ✗ FAIL  |  - SKIPPED (<reason>)
    Duration : <mm:ss>
    Questions: <total count>

    Q1 (<type: 單選/多選/填充>) [qid: <question id>]
      Result  : ✓ 正確  |  ✗ 錯誤
      Stem    : <reconstructed question text>
      Answer  : <my calculated answer>
      Platform: <platform's accepted answer>

      若正確 — 判斷原因：
        <逐步說明為什麼題幹、選項、答案、解題說明在數學上正確>

      若錯誤 — 錯誤描述與建議修正：
        錯誤位置: <Stem / Options / Answer / Explain step N/M>
        錯誤內容: <具體描述>
        正確應為: <正確結果>
        建議修正: <如何調整>

    Q2 ...
    Notes: <extra observations, or "none">

--------------------------------------------------------------------------------
[2] <url> ...

================================================================================
Summary: <N> passed, <N> failed, <N> skipped
Total Duration: <hh:mm:ss>
```

## 填寫規則

- `✓ PASS`：所有題目無數學錯誤
- `✗ FAIL`：任一題有錯誤，逐題描述
- `- SKIPPED`：附原因（如 `requires login`、`非支援題型，請使用者手動 QA`）
- 每題必須列出：重建題幹、自己的計算答案、平台答案
- 正確題：說明**為何正確**的推理步驟
- 錯誤題：指出**確切錯誤位置**並提供**具體修正建議**
