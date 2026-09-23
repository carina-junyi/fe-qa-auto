# Agent-Browser QA Workflow Instructions

## Overview

對均一教育平台的練習頁面（**各科目**：數學、英文、國文、自然、社會…）進行 QA 驗證，檢查題幹、選項、答案與解題說明是否有**內容錯誤**。各科的驗證準則見 `references/subagent-prompt-template.md`「科目判定與驗證準則」；**不得因為科目不是數學而 SKIPPED**。

## Source Data

- **URL list**: `urls/url_list.txt` — 每行格式 `<目標> <status>`

  目標有四種（狀態欄同一套）：

  | 目標類型 | 特徵 | 處理方式 |
  |----------|------|----------|
  | **題目 URL** | 含 `/exercises/` | 直接進入 QA 流程；帶 `?qid=<n>` 時只驗那一題 |
  | **資料夾 URL** | junyiacademy URL 且不含 `/exercises/`（如 `/course-compare/...`） | Step 1 自動展開為底下的題目 URL |
  | **`qid:<n>`** | 無 URL，單題 | **上架前 QA**：題目資料由落地方預先寫在 `questions/qid-<n>/raw.json`（Compass worker 直讀 Datastore），Step 1.5 只讀檔；無作答頁可抽查 |
  | **`cr:<cover_range>`** | 無 URL，整個題目池（含未上架題） | 同上，`questions/cr-<cover_range>/raw.json` |

  > 為什麼有無 URL 目標：`get_question` 只回**上架後**內容；內容組要的是「後台存檔、還沒上架就先 QA」。
  > 上架前資料只在 Datastore，本 repo **不碰任何 GCP 憑證**——落地是外部的事，這裡只認 `raw.json`
  > （合約見 `scripts/fetch_questions.py` docstring）。單機使用者也可以自己把後台 export 的題目 JSON 包成 raw.json。

  > 2026-09-19 起 `/exercises/<id>` 在主站會 307 到新版作答頁 `/new-exercise/<id>`，
  > 本工具只支援舊版 DOM。Subagent 開頁前會種 cookie `content_ux_version_v2=old`
  > 切回舊版（見 `references/subagent-prompt-template.md` Step 1）；`/new-exercise/`
  > 形式的 URL **不要**直接放進 url_list.txt，先改成 `/exercises/<id>`。

  | 狀態 | 說明 | 何時標記 |
  |------|------|----------|
  | `ToDo` | 尚未開始（可省略） | URL 加入時 |
  | `InProgress` | 正在 QA | Subagent 開始時 |
  | `Pass` | 無內容錯誤 | Subagent 完成後 |
  | `Fail` | 有內容錯誤 | Subagent 完成後 |
  | `Warn` | 內容正確，但瀏覽器抽查沒做成（新版 UI、要登入、頁面開不起來、抽查題未上架…任何前端狀況）或抽到輕微渲染問題——頁面未完整驗證。`qid:`／`cr:` 目標沒有作答頁，不因此 Warn | Subagent 完成後 |

  **只處理 `ToDo`（或無狀態）的 URL。** 以 `#` 開頭的行為註解，會被略過。

## Reference Files

| 檔案 | 內容 |
|------|------|
| `references/platform-gotchas.md` | 平台特殊行為與解法 |
| `references/command-reference.md` | agent-browser 指令速查 |
| `references/qa-report-format.md` | QA_result.txt 格式規範 |
| `references/subagent-prompt-template.md` | Subagent prompt 模板 |
| `references/subagent-return-format.json` | Subagent 回傳 JSON 格式 |
| `scripts/` | JS 工具檔（直接 `cat scripts/xxx.js` 使用） |
| `page_structures/` | DOM 結構、CSS selectors |

---

## Workflow

### Step 0: Pre-flight Check（前置檢查）

在開始 QA 之前，必須逐一檢查以下項目。**任何一項不通過就停下來提示使用者，不繼續執行後續步驟。**

| # | 檢查項目 | 檢查方式 | 失敗時提示 |
|---|---------|---------|----------|
| 1 | `agent-browser` 是否已安裝 | `bin/agent-browser --version`（shim 會依序找 `$AGENT_BROWSER_BIN` → brew → PATH → repo 內 npm） | 依 shim 的錯誤訊息安裝：Mac `brew install agent-browser`、Linux `npm install agent-browser`，或設 `AGENT_BROWSER_BIN` |
| 2 | `urls/url_list.txt` 是否存在 | 檢查檔案是否存在 | 請先建立：`cp urls/url_list.txt.example urls/url_list.txt` 並填入要 QA 的 URL |
| 3 | `url_list.txt` 中是否有 ToDo 的目標 | 讀取檔案，篩選 ToDo 或無狀態的行 | 沒有待處理的目標，請在 url_list.txt 中加入 URL 或 `qid:`／`cr:`（狀態設為 ToDo 或留空） |
| 4 | `scripts/` 目錄的 JS 檔案是否完整 | 檢查是否有 18 個 .js 檔案 | 缺少 JS 工具檔，請確認 scripts/ 目錄完整（應有 18 個 .js 檔案） |
| 5 | `.env` 是否存在（選填） | 檢查 `.env` 檔案是否存在 | 若 URL 需要登入，請建立：`cp .env.example .env` 並填入帳密。無 `.env` 時隱藏題拿不到、需登入頁面的瀏覽器抽查會跳過 |
| 6 | `python3` 可用 | `python3 --version` | `scripts/resolve_urls.py` 與 `scripts/fetch_questions.py` 需要 Python 3.9+ |

全部通過後才進入 Step 1。

---

### Step 1: Resolve URLs（展開資料夾連結）

```
/resolve-urls
```

掃描 `url_list.txt`，將資料夾 URL（不含 `/exercises/`）展開為底下的題目 URL。已展開或純題目 URL 的檔案不受影響。

---

### Step 1.5: Fetch Questions（把題目池落地成檔案）

```bash
python3 scripts/fetch_questions.py --from-url-list
```

對 `url_list.txt` 裡每個 `ToDo` 目標落地題目檔到 `questions/<dir>/`（`index.json`、`all.md`、`q-<qid>.md`）：
- 題目 URL → 打 `/api/v2/perseus/<exerciseId>/get_question`，`<dir>` = `<exerciseId>`。
  URL 帶 `?qid=<n>` 時只驗那一題（`all.md` 只含目標題）。有 `.env` 帳密會先登入拿 KAID，隱藏題才拿得到。
- `qid:<n>`／`cr:<x>` → 讀**已存在的** `questions/qid-<n>/raw.json`／`questions/cr-<x>/raw.json`，
  不打網路。`index.json` 多 `hidden_count`、每題 `is_hidden`；`all.md` 每題有「上架狀態」行。

輸出每行一個目標：`✓ <目標>：<mode>，N 題[，K 題未上架][，題組流程 ✓／⚠️ 題組流程設定錯誤 K 項]，M 題含需開頁的 widget`。
依序型（講義題組）會順帶做流程設定檢查（起點唯一、答對鏈走得到 `end`、無迴圈、分支都在池內），
結果寫在 `index.json` 的 `sequence`；有 errors 的目標由 subagent 直接判 Fail（location `Sequence`）。
- `✗ SCHEMA ...`（exit 2）：API／raw 回傳形狀不符合預期——**停下來回報使用者**，該目標標
  `SKIPPED (schema drift)`，不要自己猜著繼續。這是刻意設計：形狀漂移要看得到。
- `✗ FETCH ...`：網路／端點錯誤，重跑一次；仍失敗標 `SKIPPED (fetch failed)`。
- `✗ RAW ...`：無 URL 目標的 `raw.json` 不存在——不是你能補的（要憑證），該目標標
  `SKIPPED (raw.json 不存在)`，其餘目標照跑。

> 為什麼走 API：2026-09-19 起 `/exercises/` 轉新版作答頁，舊版 DOM 隨時會消失；內容 QA 要的
> 題幹、選項、正解、解說全在這支 API（主站「列印練習卷」的資料來源）。Perseus 是 client-side
> 批改，widget 自帶正解，公開題不需登入。

### Step 2: 讀取待處理目標

讀取 `urls/url_list.txt`，篩選出所有 `ToDo`（或無狀態）的目標（URL 或 `qid:`／`cr:`）。
Step 1.5 標成 `SKIPPED (...)` 的不算。

### Step 3: 對每個目標 spawn Subagent

讀取 `references/subagent-prompt-template.md` 中的 prompt 模板，將 `{url}`（目標原文）、`{questions_dir}`
和 `{session}` 替換為實際值後，spawn subagent。`{questions_dir}` 就是 Step 1.5 每行輸出箭頭後的路徑：
URL → `questions/<exerciseId>`；`qid:<n>` → `questions/qid-<n>`；`cr:<x>` → `questions/cr-<x>`。

每個目標使用獨立的 agent-browser session（如 `qa-1`、`qa-2`...），避免 browser 衝突。

```
for i, target in enumerate(todo_targets):
    session = f"qa-{i+1}"
    qdir = questions_dir_of(target)   # 見上一段的對應規則
    prompt = (template.replace("{url}", target).replace("{session}", session)
                      .replace("{questions_dir}", qdir))
    spawn subagent(prompt, session)
```

#### 執行模式

- **並行模式**（預設）：subagent 同時執行（各用不同 session），用 `run_in_background: true`
  - **並行上限：5 個**。超過 5 個 URL 時分批執行，每批最多 5 個，前一批全部完成後再 spawn 下一批。
- **序列模式**：一個 subagent 完成後再 spawn 下一個（除錯時使用）

### Step 4: 收集結果

每個 subagent 完成後回傳 JSON（格式見 `references/subagent-return-format.json`）。

主 Agent 負責：

1. **解析 JSON**：從 subagent 回傳中提取 status、questions、errors
2. **驗證嚴謹度**：檢查每題的 `hintsVerification` 欄位，確認 subagent 有逐步驗算：
   - 每題都必須有 `hintsVerification` 陣列，若缺少則視為驗證不完整
   - 陣列長度必須等於 `hintsSteps`（每一步都有驗算記錄）
   - 每筆記錄都必須有 `myCalculation`（有自己重算）
   - `match: false` 的必須附 `error` 欄位
   - 若 subagent 未提供完整的 `hintsVerification`，主 agent 應標註該 URL 為驗證不完整，要求重新執行
3. **更新 url_list.txt**：根據 `status` 欄位更新對應目標的狀態（Pass/Fail/Warn）
4. **落檔（每次都做，不分 Pass／Fail）**：每收到一個 subagent 回傳，**立刻**把它的 JSON 原樣寫到
   `results/<n>-<questions_dir 的最後一段>.json`（例如 `results/1-n-m6ach9-3a.json`、`results/2-cr-s-eng-s-g12-b5-6-b.json`），
   不改寫、不摘要。全批結束後再把全部合成一個陣列寫到 `results/run.json`。
   > 為什麼：全 Pass 不產 QA_result.txt，subagent 的 `hintsVerification` 是事後稽核「驗證深度夠不夠」的唯一證據；
   > 中途死掉也要留得住已完成的部分，所以是逐個落、不是最後一起落。`results/` 由呼叫方（Compass worker）每 job 清空。
5. **記錄結果**：暫存每個目標的 JSON 結果，供 Step 5 組裝報告

### Step 5: Generate QA Report

檢查是否有任何 URL 的狀態為 `Fail` 或 `Warn`。**若有，產生 `QA_result.txt`**：

根據 `references/qa-report-format.md` 的格式，將所有 subagent 回傳的 JSON 組裝成報告。

若全部 Pass（無 Fail 也無 Warn），則不需要產生報告。

#### 組裝規則（JSON → QA_result.txt 欄位對應）

```
Header:
  Generated    ← 當前日期時間
  URLs checked ← subagent 回傳 JSON 的數量

Per URL:
  Status       ← json.status（Pass→✓ PASS, Fail→✗ FAIL, Warn→⚠ WARN）
  Duration     ← json.duration
  Questions    ← json.coveredQids / json.totalInPool (json.browserCount browser, json.apiCount API)

Per Question（僅 Fail 或 Warn 的 URL 需要逐題列出）:
  type         ← json.questions[].type
  qid          ← json.questions[].qid
  Result       ← json.questions[].hintsValid（true→✓ 正確, false→✗ 錯誤）
  Stem         ← json.questions[].stem
  Answer       ← json.questions[].myAnswer
  Platform     ← json.questions[].platformAnswer

  若 hintsValid=true:
    判斷原因   ← 從 json.questions[].hintsVerification 中摘要每步驗算結果

  若 hintsValid=false:
    錯誤位置   ← json.questions[].errors[].location
    錯誤內容   ← json.questions[].errors[].content
    正確應為   ← json.questions[].errors[].correctValue
    建議修正   ← json.questions[].errors[].suggestion

  Notes        ← json.questions[].notes（空字串則寫 "none"）

Footer:
  Summary      ← 統計 passed / failed / warned / skipped 數量
```

**Pass 的 URL 只需列出 Status 和 Questions 數量，不需逐題展開。**

---

## Subagent 內部流程（參考用）

Subagent 的詳細執行流程定義在 `references/subagent-prompt-template.md`，包含：

- **Step 1 內容驗證**（主路徑）：讀 `questions/<exerciseId>/all.md`，全部題目逐題：蓋住正解獨立判斷 → 比對 → 逐步驗解說 → 圖文一致 → 選項逐一判對錯。不開瀏覽器。
- **Step 2 瀏覽器抽查**（1 題）：種 cookie 開舊版頁，看渲染、提交 Step 1 判定的正解看平台是否接受。任何前端狀況讓抽查做不成就記 notes 跳過，URL 目標內容全對時降為 Warn（`qid:`／`cr:` 目標沒有作答頁，仍 Pass）。
- 依序型（sequential_quiz）與累積型（exercise）都走同一條路；依序型多檢查分支 qid 是否存在。
- 結構化 JSON 回傳

### 關鍵規則（Subagent 必須遵守）

- **嚴格模式**：每一題都必須展開所有 hints，逐步驗證內容正確性（數學題逐步驗算；語文／知識題逐句核對說明與答案、選項是否一致）
- **先蓋住正解再判**：題目檔已標平台正解（✓），必須先獨立判斷再比對，不可反過來替平台答案找理由
- **瀏覲器只抽查不驗內容**：Step 2 只做一題、只看渲染與提交；累積型不做到 passCondition
- **圖文一致性**：圖片中的數值（角度、邊長等）必須與題幹及計算過程交叉比對，不一致即為 error
- **選項完整驗證**：選擇題必須獨立驗證每一個選項的正確性，不可只驗證平台標記的答案
- **題幹用語一致性**：檢查題幹前後的命名、符號是否一致（如不可前半用甲乙丙、後半用 ABC）
- **填空符號可輸入性**：填空題答案含根號（√）、π 等特殊符號時，從題目檔答案規格 raw 讀取 expression 的 `buttonSets` 欄位判斷（包含 `"prealgebra"` 才算可輸入）；不可用 `check_mq_config.js` runtime 結果判斷（易誤報）；`set_mq.js` 能注入 ≠ 平台設定正確

---

## Edge Cases

| 情況 | 處理 |
|------|------|
| `fetch_questions.py` 回 `✗ SCHEMA` | `SKIPPED (schema drift)`，**停下來回報使用者** |
| `fetch_questions.py` 回 `✗ FETCH`（重跑仍失敗） | `SKIPPED (fetch failed)` |
| `fetch_questions.py` 回 `✗ RAW`（`qid:`／`cr:` 目標沒有 raw.json） | `SKIPPED (raw.json 不存在)`；其餘目標照跑 |
| 目標是 `qid:`／`cr:`（無 URL） | 只做 Step 1 內容驗證，瀏覽器抽查跳過，notes 記 `browser_spotcheck: unavailable (no URL)`；status 由內容決定（上架前本來就沒有作答頁，是唯一不因抽查缺席降級的情況） |
| URL 目標但抽查題 `is_hidden: true` | 抽查跳過，notes 記 `browser_spotcheck: unavailable (unpublished)`；內容全對時 **Warn** |
| 依序型 `index.json` 的 `sequence.errors` 非空（起點不唯一、答對指自己、迴圈、分支指向池外） | 該目標 **Fail**，errors 記 `location: "Sequence"`——這是 `fetch_questions.py` 決定性算出的題組流程設定錯誤，取代舊版「瀏覽器全程走題組」 |
| 單題 `qid:` 目標、mode 是 sequential_quiz、`sequence` 為 `null` | 題目池只是題組的一片，流程檢查略過（`fetch_questions.py` 不算）；nxt 指到池外不是錯。要驗整組用 `cr:` 或題組 URL |
| 題目池是空的（習題不存在／下架／全隱藏題未登入） | `SKIPPED (empty pool)`，訊息裡註明是否有登入 |
| `?qid=` 目標不在題目池 | `SKIPPED (目標 qid 不在題目池)` |
| 瀏覽器抽查需要登入而無 `.env`，或登入失敗 | 抽查跳過，notes 記 `browser_spotcheck: requires login`／`login failed`；內容全對時 **Warn** |
| 頁面未載入 | `wait --load networkidle` + `wait 3000` 重試 |
| 元素不在畫面內 | `scrollintoview @eN` 或 `scroll down 300` |
| `find text` 多重匹配 | 改用 CSS selector |
| diagnostic-exam 類型 | `SKIPPED (非 exercises 類型)` |
| 種了 `content_ux_version_v2=old` 仍落在 `/new-exercise/` | 瀏覽器抽查跳過，notes 記 `browser_spotcheck: unavailable (new UI)`；內容驗證照常，內容全對時 **Warn**。不要在新版 DOM 上硬跑腳本 |
| 其他任何前端狀況讓抽查做不完（頁面開不起來、逾時、元素抓不到） | 抽查跳過，notes 記 `browser_spotcheck: unavailable (<原因>)`；內容全對時 **Warn**。前端沒驗到就不能叫 Pass |
