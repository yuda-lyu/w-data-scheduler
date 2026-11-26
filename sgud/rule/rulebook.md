# 規則帳本(rulebook)

> 藍圖:以規則為單位記程式碼須長成什麼樣.現況(做到哪)見 `sgud/state/state.md`.規則狀態:已做／部分／未做.
> 本帳本自 2026-11-12 起建立,先收本輪確立之規則;既有行為之規則於後續輪次補入.

## 索引

| 編號 | 規則 | 狀態 |
|---|---|---|
| R-01 | `funGetNew`、`funGetCurrent` 之回傳(`await` 後)須為陣列;非陣列取消本輪並記錄錯誤 | 已做 |
| R-02 | 呼叫 wsemi 列舉函數(`fsTreeFolder` 等)須以設定物件明寫層數意圖,不用舊式數字或省略第 2 參數 | 已做 |

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
