# 新版作答頁（/exercise、/sequential-quiz）

## Last Verified
- Date: 2026-11-11（主站 release prod-2026-11-09）
- URLs: `/exercise/jnc-3-10-1-1a`（選擇、下拉）、`/exercise/jnc-7-03-3-1c`（數字輸入）、`/exercise/jfc-9-02-1-2a`（下拉＋數字輸入混合）、
  `/exercise/jfc-9-02-1-1e`（拖曳排序、iframe）、`/sequential-quiz/j-m-basic-c-1-1-1`（數學式輸入）、`/sequential-quiz/mcenter-f-10-2-1-1`（選擇）

## 為什麼有這一份

主站 release `prod-2026-09-21`（「舊內容頁一律轉導新版，移除 cookie 版本判斷」）之後，`/exercises/<id>` 一律轉導：

| 題組類型 | 轉到 | `probe_page.js` 的 `route` |
|----------|------|-----------------------------|
| 一般習題（累積型） | `/exercise/<id>` | `exercise` |
| 講義題組（依序型） | `/sequential-quiz/<id>` | `sequential-quiz` |

cookie `content_ux_version_v2=old` 不再有作用，舊版 DOM（`#workarea`、`window.Exercises`、`#check-answer-button`）已經開不出來。
本資料夾其餘檔案描述的是**舊版** DOM，留作歷史對照；`scripts/` 新舊兩版都認得，現行頁面以這一份為準。

## 與舊版的差異一覽

| 項目 | 舊版 | 新版 | 對應腳本 |
|------|------|------|----------|
| 題目區根節點 | `#workarea`／`#problemarea` | `.question-area`（底下 `.perseus-renderer`） | 全部 |
| 目前是哪一題 | `window.Exercises.PerseusBridge` | 無全域物件。頁面每顯示一題就 XHR 一次 `/api/v2/perseus/<qid>`（不預抓下一題），取最近一次 | `extract_qid.js` |
| 指定題目 `?qid=` | 所有人有效 | **只有管理員帳號**有效；`/sequential-quiz/` 不支援；`/exercises/<id>?qid=` 轉導時 qid 會被丟掉 | `extract_qid.js` 回 `urlQidHonored` |
| 選項（單選／多選） | `[role=radio]`／`[role=checkbox]` | `[data-testid="perseus-radio-widget"] > label`，沒有 role、沒有 input，選中狀態沒有屬性可讀 | `extract_choices.js`、`pick_choice.js` |
| 下拉 | 原生 `<select>` | 兩種並存：選項是純文字 → 原生 `<select>`；選項含數學式 → MUI Select（`[role=combobox]`，選項打開才在 DOM：`[role=listbox] [role=option][data-value]`，`0` 是佔位項） | `extract_dropdown.js`、`set_select.js` |
| 數字輸入 | `input[data-testid="perseus-input-number-widget"]` | 同左（`fill` 可用，多個用 `>> nth=N`） | `extract_inputs.js` |
| 數學式輸入 | MathQuill `.mq-editable-field.mq-math-mode` | 同左（`window.MathQuill` 還在） | `set_mq.js` |
| 拖曳排序 | react-beautiful-dnd（`data-rfd-*`，可用鍵盤） | 主站自己寫的 pointer 拖曳，卡片沒有任何屬性，**只能用滑鼠拖** | `extract_drag_items.js`，見 `drag-sort/answer-drag-sort.md` |
| 提交鈕 | `#check-answer-button`（`<input type=button>`） | `<button>` 文字「提交答案」，沒有 id | `submit_answer.js` |
| 答對後 | `#next-question-button` 出現 | 同一顆按鈕文字換成「下一題」（只有答對才會換） | `check_result.js` |
| 回饋 | `#answer-feedback` | 彈出框，文字只顯示 **5 秒**：答對「答對了，很棒喔！」／「太棒了，你做到了！」（先答錯過）；答錯「再想一下，你越來越接近了！」 | `check_result.js` |
| 進度圓點 | `.problem-history-icon` | 畫面上有一排圓點（「練習 N 題（第 M 題）」），但不是這個 class，腳本沒有讀 | `probe_page.js` 的 `totalQuestions`／`answered` 一律是 0 |

## 目前是哪一題

新版顯示哪一題由平台決定：一般習題是 `shuffledIndices[totalDone % 題數]`（依帳號或匿名 session 的作答進度），講義題組是目前走到的那一題。
同一個 session 重開頁面會看到同一題；題目檔的第一題不一定是畫面上那一題，所以抽查一律先跑 `extract_qid.js`。

```js
// extract_qid.js 新版分支的核心
performance.getEntriesByType('resource')
  .filter(e => e.initiatorType === 'xmlhttprequest' && /\/api\/v2\/perseus\/\d+(\?|$)/.test(e.name))
  .sort((a, b) => b.startTime - a.startTime)[0]
```

`?qid=` 為什麼不可靠：主站 `frontend/components/exercise/DoExercise.tsx` 傳給題目區的是
`pinnedQuestionId={isModerator ? questionIdFromQuery : undefined}`——不是管理員就當作沒帶。

## 判定作答結果

```
答對 = 「下一題」按鈕在、「提交答案」不在          ← 不會消失的訊號（主站 AttemptBar 的 isAwaitingNext）
答錯 = 「提交答案」還在 ＋ 回饋文字「再想一下…」     ← 只有提交後 5 秒內看得到
```

所以提交後等 1～2 秒就跑 `check_result.js`。等太久的話答錯會變成 `isCorrect: false, isWrong: false`（跟還沒提交一樣）。

答對幾題之後可能跳出蓋住題目的視窗（「獲得新徽章」、「技能升級囉～」→「打開寶箱」→「繼續」→「開始挑戰」會離開這個習題）。
抽查只做一題，通常碰不到；碰到時重開習題網址即可回到題目。

## 截圖

題目區在頁面內部的捲動容器裡（`document` 本身不捲動），所以 `screenshot --full` 只會拍到第一屏，長題目下半部的選項、下拉拍不到。
開頁後先 `agent-browser set viewport 1280 1800` 把視窗拉高，整題就會進到同一張截圖；座標類操作（`mouse move`）不受影響。

## 其他

- 解題說明：按鈕文字「解題說明」（沒有 `#hint`）。內容 QA 的解說來自題目檔，抽查不需要展開它；`extract_hints.js` 目前只認舊版 DOM。
- 登入：`check_login.js` 在新版頁面可用（未登入也能作答公開習題，`needsLogin: false`）。
