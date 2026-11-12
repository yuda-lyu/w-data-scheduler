# 規則帳本(rulebook)

> 藍圖:以規則為單位記程式碼須長成什麼樣.現況(做到哪)見 `sgud/state/state.md`.規則狀態:已做／部分／未做.
> 本帳本自 2026-11-12 起建立,先收本輪確立之規則;既有行為之規則於後續輪次補入.

## 索引

| 編號 | 規則 | 狀態 |
|---|---|---|
| R-01 | `funGetNew`、`funGetCurrent` 之回傳(`await` 後)須為陣列;非陣列取消本輪並記錄錯誤 | 已做 |

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
