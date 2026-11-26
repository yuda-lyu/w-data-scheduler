# 經驗(experience)

> 執行時之累積經驗,留給後續嘗試、執行、判斷.最新在前.

## 2026-11-26 wsemi 1.9.80 列舉函數第 2 參數改為 opt(R-02)

- **行為層分不出第 1 層與窮舉時,以 I/O 為可觀察量**:`coreRetake` 掃的是平放 tag 之資料夾,子層之檔名不對應任何 tag,故第 1 層與窮舉之補掃結果(釋放哪些 tag、發哪些事件)完全相同,既有 `unit-timer`(走完整防抖流程)兩者皆綠.改以 `fs.readdirSync` 之呼叫路徑區分:wsemi 以 Node 內建 `fs` 物件注入,測試端 `import fs from 'fs'` 為同一物件,暫時換掉 `fs.readdirSync`(記錄路徑後轉呼叫原函數,`finally` 還原)即可,不必替身化 `fsTreeFolder`.另加「spy 自檢」案:同一個 spy 對 wsemi `fsTreeFolder` 之窮舉與 `{ levelLimit: 1 }` 各量一次,證明該可觀察量有鑑別力.
- **修前紅形狀**:舊寫法(第 2 參數為數字 1)於 wsemi 1.9.80 下不是主流程報錯,而是補掃階段拋 `invalid opt`,以 `type: 'error'`、`event: 'proc-coreRetake'` 之 change 事件呈現,刪除 tag 靜默不再釋放;`useShowLog: false` 可避免修前紅時之 console 噪音.
- **防抖容許值取太短,新增之 tag 於同一輪就被釋放**:實測容許值取 1000ms 時,第 2 輪(新增 tag 之該輪)結束後 tag 檔已不存在(修後版本才出現;修前版本補掃拋錯而掩蓋).推測原因:tag 檔之 `time` 以 `now2str()` 寫入(格式至秒),`checkTagCore` 以 `timeNow.diff(ts)` 與容許值比較,時間被向下取整至秒,最多多出近 1 秒(未單獨實測確認).測試改取長容許值(60 秒),並於第 3 輪前把 tag 檔之 `time` 改寫為過去之固定時間,不以延時等待;另斷言第 2 輪無 `proc-retake-remove` 事件.
- **變異驗證**(鏡像根 `tmp/<案名>/mirror/{src,test}`,只複製檔案,裸名匯入向上解析至 repo 根 `node_modules`;腳本於鏡像注入後以 `quiet-run --lock --cwd <鏡像根>` 跑 mocha):對照(原碼)綠;改回舊式數字、省略、`{ levelLimit: 2 }`、`{ levelLimit: null }`、`{}`、`{ levelLimit: 0 }` 共 6 項皆轉紅(數字者因 `proc-coreRetake` error 事件,其餘因補掃讀了子夾).

## 2026-11-12 `funGetNew`／`funGetCurrent` 回傳型別檢查(R-01)

- **新舊 wsemi 的差異要實測,不憑文件**:以 `npm i <wsemi 打包檔>.tgz --no-save` 裝新版後,直接呼叫 `ltdtDiffByKey(undefined|null|'x'|1, [...], 'id', { withInfor: false })` 兩個方向皆回 `{ del: [], add: [], same: [], diff: [] }`;但 `{}` 與單筆資料物件**不是**空結果(物件視為單筆,經 `haskey` 濾除後,`{}` 當作舊者→新者全列 add、當作新者→舊者全列 del).故本套件改以 `isarr` 擋(物件一律拒收),不依賴 wsemi 的判斷.
- **修前實測**:`funGetCurrent` 回 `undefined` 時(新 wsemi)事件為 `proc-compare … numAdd: 0` 後 `cancel-stage-main: no difference`,即靜默不同步;`funGetNew` 回 `undefined` 時為 `cancel-stage-main: no data`(訊息與實情不符).
- **檢查位置**:放在各函數自己的 `try` 內、`save` 之前並 `throw`,即可沿用既有 `catch`(`console.log(err)`〔`useShowLog`〕＋`srLogError`＋`msgExit`)與後續 `cancel-stage-main`／`cancel-stage-beforeEnd`／`end` 事件序列,不新增分支.
- **測試設計**:事件序列以整段 `deepEqual`(去除時間欄位)比對,同時比 srLog.error／srLog.info;`calls` 計數確認 `funGetCurrent` 於 `funGetNew` 非陣列時未被呼叫、三個連動函數皆 0 次;臨時資料夾放 `test/_tmp/funGetReturn/<案>/`,`after` 刪除.
- **變異驗證**:不動 repo 內 `src`——把 `src/WDataScheduler.mjs` 與測試檔複製到 `tmp/ds-sched/mut/{src,test}`(`wsemi` 由上層 `node_modules` 解析),在副本字串取代後以 mocha 跑,結果 15/15 被抓(含兩處檢查皆移除＝修前,15 failing／2 passing).變異項:移除任一檢查、弱化為 `!q`／僅 `undefined/null`／`typeof !== 'object'`、訊息帶值、訊息互換、非陣列視同 `[]`、`[]` 誤判為錯誤.
- **Windows 解壓**:Git Bash 的 GNU tar 對 `C:/...` 當遠端主機(`Cannot connect to C: resolve failed`),須加 `--force-local`.
- **下游盤點結論(2026-11-12)**:直接消費本套件者只有 `w-dwdata-builder`(`funDownload` 當 `funGetNew`、`funGetCurrent` 原樣轉交);`w-dwdata-tweq`／`tweqod`／`ftp`／`tweqmp` 之預設 `funDownloadDef`／`funGetCurrentDef` 皆回陣列(lodash `map`／`values`、`[]` 初值累加).
