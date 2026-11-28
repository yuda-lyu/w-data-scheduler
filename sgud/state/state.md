# 狀態(state)

> 現況:當前已開發功能之最新狀態.只記現況,不寫過程(過程見 `sgud/exp/experience.md`).藍圖見 `sgud/rule/rulebook.md`.
> 更新:2026-11-28.

## 基本資料
- 入口:`src/WDataScheduler.mjs`(`WDataScheduler(opt)`,回傳事件物件);發布檔 `dist/`、文件 `docs/` 於發布時自動產製,不手改.
- `package.json` 版本 1.0.76(本輪未改);依賴 `wsemi ^1.9.83`(已裝 1.9.83).
- 測試:`npm test`(mocha,`test/*.test.mjs`);`unit-once`(1)、`unit-srLog`(16)、`unit-timer`(1)、`unit-funGetReturn`(17)、`unit-retakeLevel`(2)、`unit-itemFail`(43),共 80 案;最近一次全綠見下〈驗證〉.

## 功能現況
| 功能 | 狀態 | 規則帳本 | 測試 |
|---|---|---|---|
| 偵測數據變更並連動 `funAdd`／`funModify`／`funRemove`(含防抖、srLog、事件名自訂) | 既有,運作 | (尚未入帳本) | `unit-once`、`unit-srLog`、`unit-timer` |
| `funGetNew`／`funGetCurrent` 回傳須為陣列,非陣列取消本輪並記錄錯誤(2026-11-12) | 已做 | R-01 | `unit-funGetReturn` |
| 防抖補掃(`coreRetake`)列舉[刪除tag]資料夾:wsemi 1.9.80 起第 2 參數為設定物件,改為 `fsTreeFolder(fdTagRemove, { levelLimit: 1 })` 保持僅第 1 層(2026-11-26) | 已做 | R-02 | `unit-retakeLevel`(另 `unit-timer` 走完整防抖流程) |
| 逐項處理單項失敗不中止本輪;失敗項列入結果、下輪重試;結果 `{ success, failed, msgCancel }` 交 `funBeforeEnd` 與 `end`;有失敗項時發 `fail-items-stage-main`(warn)(2026-11-28) | 已做 | R-03 | `unit-itemFail`、`unit-srLog` |

## 待發布
- R-01 之行為改變(README〈Breaking changes〉已載明)須與 wsemi 下一版(`ltdtDiffByKey` 對非陣列輸入回空結果)同一發布窗發布;發布由使用者／主控處理.本檢查不依賴 wsemi 版本(新舊版皆可運作).
- R-03 之行為改變(README〈Breaking changes〉已載明):下游套件中斷言舊事件序列(單項失敗後出現 `cancel-stage-main`／`cancel-stage-beforeEnd`、或失敗後只有第 1 筆錯誤)之測試,升級時須同步改寫;下游要只搬入成功者,須改用 `funBeforeEnd` 收到之結果.發布由使用者／主控處理.

## 驗證
- 2026-11-28(wsemi 1.9.83):全套 80 passing／0 failing;`unit-itemFail`、`unit-srLog` 對修前版 48 紅(`unit-itemFail` 當時 42 案全紅、`unit-srLog` 6 紅);`unit-itemFail` 單檔連跑 20 次皆綠(43 案版);單點變異 42 項皆轉紅;發布包解開目錄跑受影響兩檔 58 passing;`.jsdoc` 實跑無 ERROR;eslint 0 problems;private-guard CLEAN.
- 2026-11-26(wsemi 1.9.80):全套 35 passing／0 failing(含 `unit-retakeLevel` 2 案);`unit-retakeLevel` 連跑 10 次皆綠;植入 6 項變異(舊式數字、省略、`levelLimit: 2`／`null`／`0`、空物件)皆轉紅,對照(原碼)綠;eslint 0 problems;private-guard CLEAN.

## 已知缺口
- 刪除防抖之補掃(`coreRetake`)逐 tag 處理仍遇錯即停:任一 tag 檔不可解析使其後 tag 每輪不處理(R-03 不含此段).
- 各 `error` 事件與 `srLog.error` 之 `msg` 為使用端函數之原錯誤訊息(`console.log(err)` 亦同),未經 `maskDiagText`;R-03 新增之結果與 warn 事件只用固定詞彙.
- 紀錄函數回傳被 reject 之 Promise 時未接住(既有行為,各階段皆同);R-03 之隔離只及同步拋錯.
- JSDoc 之 `opt.keyId` 寫預設 `'keyId'`,程式實際預設為 `'id'`(`src/WDataScheduler.mjs` `keyId` 初始化處);文件與程式不一致,未動(範圍外).
- `g_timer.mjs`、`test/unit-timer.test.mjs` 之 `funGetNew` 回傳 `itemsNow`,初值 `null`,靠 `setInterval` 1000ms 晚於設值(`delay(0)`)才不踩 R-01;時序倚賴,現況穩定,未改.
