# 經驗(experience)

> 執行時之累積經驗,留給後續嘗試、執行、判斷.最新在前.

## 2026-11-12 `funGetNew`／`funGetCurrent` 回傳型別檢查(R-01)

- **新舊 wsemi 的差異要實測,不憑文件**:以 `npm i <wsemi 打包檔>.tgz --no-save` 裝新版後,直接呼叫 `ltdtDiffByKey(undefined|null|'x'|1, [...], 'id', { withInfor: false })` 兩個方向皆回 `{ del: [], add: [], same: [], diff: [] }`;但 `{}` 與單筆資料物件**不是**空結果(物件視為單筆,經 `haskey` 濾除後,`{}` 當作舊者→新者全列 add、當作新者→舊者全列 del).故本套件改以 `isarr` 擋(物件一律拒收),不依賴 wsemi 的判斷.
- **修前實測**:`funGetCurrent` 回 `undefined` 時(新 wsemi)事件為 `proc-compare … numAdd: 0` 後 `cancel-stage-main: no difference`,即靜默不同步;`funGetNew` 回 `undefined` 時為 `cancel-stage-main: no data`(訊息與實情不符).
- **檢查位置**:放在各函數自己的 `try` 內、`save` 之前並 `throw`,即可沿用既有 `catch`(`console.log(err)`〔`useShowLog`〕＋`srLogError`＋`msgExit`)與後續 `cancel-stage-main`／`cancel-stage-beforeEnd`／`end` 事件序列,不新增分支.
- **測試設計**:事件序列以整段 `deepEqual`(去除時間欄位)比對,同時比 srLog.error／srLog.info;`calls` 計數確認 `funGetCurrent` 於 `funGetNew` 非陣列時未被呼叫、三個連動函數皆 0 次;臨時資料夾放 `test/_tmp/funGetReturn/<案>/`,`after` 刪除.
- **變異驗證**:不動 repo 內 `src`——把 `src/WDataScheduler.mjs` 與測試檔複製到 `tmp/ds-sched/mut/{src,test}`(`wsemi` 由上層 `node_modules` 解析),在副本字串取代後以 mocha 跑,結果 15/15 被抓(含兩處檢查皆移除＝修前,15 failing／2 passing).變異項:移除任一檢查、弱化為 `!q`／僅 `undefined/null`／`typeof !== 'object'`、訊息帶值、訊息互換、非陣列視同 `[]`、`[]` 誤判為錯誤.
- **Windows 解壓**:Git Bash 的 GNU tar 對 `C:/...` 當遠端主機(`Cannot connect to C: resolve failed`),須加 `--force-local`.
- **下游盤點結論(2026-11-12)**:直接消費本套件者只有 `w-dwdata-builder`(`funDownload` 當 `funGetNew`、`funGetCurrent` 原樣轉交);`w-dwdata-tweq`／`tweqod`／`ftp`／`tweqmp` 之預設 `funDownloadDef`／`funGetCurrentDef` 皆回陣列(lodash `map`／`values`、`[]` 初值累加).
