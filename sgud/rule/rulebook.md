# 規則帳本(rulebook)

> 藍圖:以規則為單位記程式碼須長成什麼樣.現況(做到哪)見 `sgud/state/state.md`.規則狀態:已做／部分／未做.
> 本帳本自 2026-11-12 起建立,先收本輪確立之規則;既有行為之規則於後續輪次補入.

## 索引

| 編號 | 規則 | 狀態 |
|---|---|---|
| R-01 | `funGetNew`、`funGetCurrent` 之回傳(`await` 後)須為陣列;非陣列取消本輪並記錄錯誤 | 已做 |
| R-02 | 呼叫 wsemi 列舉函數(`fsTreeFolder` 等)須以設定物件明寫層數意圖,不用舊式數字或省略第 2 參數 | 已做 |
| R-03 | 逐項處理(`funRemove`、`funAdd`、`funModify`)之單項失敗不中止本輪;失敗項記錄並下輪重試;本輪結果交 `funBeforeEnd` 與 `end` | 已做(防抖補掃不在範圍,見狀態) |

## R-01 `funGetNew`／`funGetCurrent` 回傳須為陣列

**規則**
1. `src/WDataScheduler.mjs` 之主階段(`stageMain`)於呼叫 `funGetNew()`、`funGetCurrent()` 並 `await` 後,回傳值須通過 `isarr`(`wsemi/src/isarr.mjs`)檢查,在該函數自己的 `try` 內檢查,不合即 `throw new Error('funGetNew must return an array')`／`'funGetCurrent must return an array'`,沿用該階段既有之錯誤路徑(`console.log(err)`〔`useShowLog`〕＋`srLogError({ event, msg })`＋`msgExit = 'error at <event>'`＋`cancel-stage-main`),不進入比對,`funAdd`／`funModify`／`funRemove` 皆不被呼叫.
2. 訊息固定,**不帶回傳值**.
3. 不把非陣列視同 `[]`(自有套件不留相容路徑).`undefined`、`null`、字串、數字、物件(含空物件與單一筆資料物件)一律視為非陣列.
4. 合法輸入之既有行為不變:`funGetCurrent` 回 `[]`(首次執行)→ 全數新增;`funGetNew` 回 `[]` → 既有之 `cancel-stage-main`(`msg: 'no data'`),非錯誤.
5. JSDoc 之 `opt.funGetNew`、`opt.funGetCurrent` 須寫明須回傳陣列(首次執行無資料回 `[]`)與非陣列之處置;README 〈Breaking changes〉須載明.

**why**:wsemi 新版 `ltdtDiffByKey` 對非陣列亦非物件之輸入回空結果 `{ del: [], add: [], same: [], diff: [] }`(修前視同 `[]` 照常比對);若本套件不檢查,使用端 `funGetCurrent` 回 `undefined`／`null`(例如首次執行未回 `[]`)時,本輪會靜默不做任何同步.`funGetNew` 非陣列時原訊息「無數據」亦與實情不符.

**站點全集**(盤點指令:Grep `funGetNew\(\)|funGetCurrent\(\)` 於 `src/`)
- `src/WDataScheduler.mjs` `stageMain` 內 `funGetNew()` 呼叫處之後(`isarr` 檢查 1 處)
- `src/WDataScheduler.mjs` `stageMain` 內 `funGetCurrent()` 呼叫處之後(`isarr` 檢查 1 處)
- 共 2 站,無其他呼叫站(`funAfterStart`、`funBeforeEnd` 之回傳值不在本規則範圍)

**判準**:`test/unit-funGetReturn.test.mjs` 全綠;植入「移除任一檢查／弱化為 `!q`、僅 `undefined/null`、`typeof !== 'object'`／訊息帶值／訊息互換／非陣列視同 `[]`／`[]` 誤判為錯誤」皆須轉紅(變異證據見 `sgud/exp/experience.md`).

**測試對照**:`test/unit-funGetReturn.test.mjs`——兩函數 × 六種非陣列值(`undefined`、`null`、`'x'`、`1`、`{}`、單筆資料物件)、非 async 函數各一、`useShowLog` 預設為 true 之 console 輸出與訊息不帶值、`funGetCurrent` 回 `[]` 全數新增、`funGetNew` 回 `[]` 維持 `no data`.

## R-02 wsemi 列舉函數須以設定物件明寫層數意圖

**規則**
1. wsemi 1.9.80 起,`fsTreeFolder`、`fsTreeFolderWithHash`、`fsGetFilesInFolder`、`fsGetFilesWithHashInFolder`、`fsGetFoldersInFolder`(及各 `*Core`)之第 2 參數為設定物件 `opt = {}`:`opt.levelLimit` 為有效正整數才限層,**未給即窮舉全部層級**(舊版第 2 參數為層數、預設 1 層);第 2 參數給了而非物件(舊寫法之數字)拋 `invalid opt: must be an object`,第 3 個引數有給拋 `invalid arguments: must be fd and opt only`.
2. 本套件呼叫這類函數時,第 2 參數一律為物件且**明寫層數意圖**:要第 1 層者寫 `{ levelLimit: 1 }`;本意窮舉者可省略第 2 參數,但須在呼叫處註明為刻意窮舉.不寫舊式數字,不依賴省略即第 1 層.
3. 刪除 tag 皆平放於 `fdTagRemove` 下(`addTagCore` 以 `${fdTag}/${fn}` 寫入),防抖補掃(`coreRetake`)只需第 1 層,故為 `{ levelLimit: 1 }`;不得改為窮舉(會多讀子夾,子層之檔名亦會被帶入 `checkTagRemove(v.name)` 而與第 1 層之 tag 同名者重複處理).

**why**:省略第 2 參數之舊寫法於新版**靜默**由第 1 層變窮舉(無從以錯誤攔截),數字寫法則於補掃階段才拋錯(以 `proc-coreRetake` 之 error 事件呈現,不影響主流程,補掃卻靜默失效、刪除 tag 不再釋放).

**站點全集**(盤點指令:`git grep -nE "\b(fsTreeFolder|fsTreeFolderWithHash|fsGetFilesInFolder|fsGetFilesWithHashInFolder|fsGetFoldersInFolder)(Core)?\s*\(" -- . ':!dist' ':!docs'`)
- `src/WDataScheduler.mjs` `coreRetake` 之 `fsTreeFolder(fdTagRemove, { levelLimit: 1 })`:1 站,已套(第 1 層)
- 同檔註解內之 `fsTreeFolder(fdTagModify, { levelLimit: 1 })`(已停用之變更 tag 掃描):1 處,已改寫為新寫法,不計站
- 共 1 站(src);根目錄範例 `g*.mjs`、README、JSDoc 無此類呼叫

**判準**:盤點指令之每一處第 2 參數皆為物件;`test/unit-retakeLevel.test.mjs` 全綠;植入「改回舊式數字／省略／`levelLimit: 2`／`null`／`0`／空物件」皆須轉紅(變異證據見 `sgud/exp/experience.md`).

**測試對照**:`test/unit-retakeLevel.test.mjs`——①自檢:`fsTreeFolder` 窮舉會讀子夾(`fs.readdirSync` 呼叫路徑)、`{ levelLimit: 1 }` 不讀;②`coreRetake` 之補掃:`fdTagRemove` 內另放 `sub/`、`sub/deeper/` 之檔,補掃期間 `readdirSync` 讀了 `fdTagRemove` 本身而不讀其子夾,第 1 層之超時 tag 仍被釋放(`proc-retake-remove` 之 `release-tag`、`done`),且無 error 事件.行為層無法分辨第 1 層與窮舉(子層之檔名不對應任何 tag),故以 `readdirSync` 之呼叫路徑為可觀察量.

## R-03 逐項處理之單項失敗不中止本輪

**規則**
1. `src/WDataScheduler.mjs` `stageMain` 之三個逐項處理迴圈(`r.del`、`r.add`、`r.diff`):任一項之使用端函數同步拋錯或其 Promise 被 reject,或其後之任務狀態更新(`otkActualSrc`、`otkSrc`、刪除 tag)拋錯,只記該項失敗;不設 `msgExit`、不中止本輪,其餘項與其後階段照常處理.各項回呼不得向 `pmSeries` 拋錯(`pmSeries` 遇 reject 即停).
2. 失敗以單一出口 `failItem(mode, event, id, msg, err)` 記錄:列入結果 `failed`(`{ id, mode, event, msg }`,`msg` 固定詞彙 `funRemove failed`／`funAdd failed`／`funModify failed`／`failed to update task state`,不含原錯誤訊息)、`console.log(err)`(`useShowLog`)、`srLogError({ event, [keyId]: id, msg: 原錯誤訊息 })`;呼叫後立即 `return`(不更新任務狀態、不列入 `success`).
3. 兩段皆未拋錯才列入 `success[mode]`;`id` 取自呼叫使用端函數前之 `v[keyId]`.未給予 `funAdd` 等函數者視為成功.
4. 逐項處理之紀錄與輸出各自隔離(`safeCall`、`srLogInfoItem`),通道(srLog、change 監聽函數、console)同步拋錯不影響各項結果與其餘項.
5. 有失敗項時,三迴圈後發 1 筆 warn 事件 `fail-items-stage-main`(`numFail`、`items`〔失敗項副本〕、`msg: 'some items failed'`);全部成功時不發.
6. 本輪結果 `{ success: { add, modify, remove }, failed, msgCancel }` 一律經 `getResRound()` 取副本交付:`funBeforeEnd(結果)` 與 `end` 事件各一份.`msgCancel` 於主階段每一取消站點(`cancelStageMain`)與開始前階段錯誤處設定,完成逐項處理者為 `''`.使用端以 `success` 判定已完成項.
7. 階段層級(`funAfterStart`、`funGetNew`、`funGetCurrent`、比對、`no data`、`no difference`)之取消行為與事件不變.
8. 失敗項之任務狀態不更新,重試由下輪比對達成;`funAdd`、`funModify`、`funRemove` 須可重複執行.JSDoc 與 README〈Breaking changes〉須載明.

**why**:舊行為遇錯即停(`msgExit` 一經設定,其後各項與階段全部略過),一個永遠處理失敗之壞項使其後各項每輪被略過(Gitea #216 §2).

**站點全集**(盤點指令:Grep `failItem\(|resRound\.success\.(add|modify|remove)\.push|cancelStageMain\(|msgCancel = |getResRound\(\)` 於 `src/`)
- `failItem` 呼叫 6 站(三迴圈 × 使用端函數段與任務狀態段),已套
- `success[mode].push` 3 站,已套
- `cancelStageMain` 呼叫 6 站(getNew、getCurrent、無數據、比對、無法計算、無差異)＋開始前階段 `msgCancel` 1 站,已套
- `getResRound()` 交付 3 站(warn 事件、`funBeforeEnd`、`end`),已套
- 未套:`coreRetake` 之逐 tag 處理(刪除防抖補掃)遇錯仍中止其餘 tag(非 add／modify／remove 之逐項處理,見狀態〈已知缺口〉)

**判準**:`test/unit-itemFail.test.mjs`、`test/unit-srLog.test.mjs` 全綠;單點變異(中止迴圈、漏記或誤記、固定訊息互換、缺 `return`、副本改為參照、缺傳結果、缺設 `msgCancel`、通道不隔離)皆須轉紅(變異證據見 `sgud/exp/experience.md`).

**測試對照**:`test/unit-itemFail.test.mjs`——三階段 × 壞項在前／中／後、多個與全部失敗、同步拋錯／reject／非 Error 值／await 後拋錯、任務狀態更新失敗(三階段)、刪除防抖、紀錄與輸出通道失效、下輪重試至成功、結果之副本與 `keyId`、階段層級取消之結果;`test/unit-srLog.test.mjs`——失敗時之事件序列、warn 紀錄與 console 輸出.
