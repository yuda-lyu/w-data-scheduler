# 狀態(state)

> 現況:當前已開發功能之最新狀態.只記現況,不寫過程(過程見 `sgud/exp/experience.md`).藍圖見 `sgud/rule/rulebook.md`.
> 更新:2026-11-12.

## 基本資料
- 入口:`src/WDataScheduler.mjs`(`WDataScheduler(opt)`,回傳事件物件);發布檔 `dist/`、文件 `docs/` 於發布時自動產製,不手改.
- `package.json` 版本 1.0.51(本輪未改);依賴 `wsemi ^1.9.57`.
- 測試:`npm test`(mocha,`test/*.test.mjs`);`unit-once`(1)、`unit-srLog`(14)、`unit-timer`(1)、`unit-funGetReturn`(17),共 33 案;最近一次全綠 33 passing／0 failing(2026-11-12,以 wsemi 新版打包檔實測).

## 功能現況
| 功能 | 狀態 | 規則帳本 | 測試 |
|---|---|---|---|
| 偵測數據變更並連動 `funAdd`／`funModify`／`funRemove`(含防抖、srLog、事件名自訂) | 既有,運作 | (尚未入帳本) | `unit-once`、`unit-srLog`、`unit-timer` |
| `funGetNew`／`funGetCurrent` 回傳須為陣列,非陣列取消本輪並記錄錯誤(2026-11-12) | 已做 | R-01 | `unit-funGetReturn` |

## 待發布
- R-01 之行為改變(README〈Breaking changes〉已載明)須與 wsemi 下一版(`ltdtDiffByKey` 對非陣列輸入回空結果)同一發布窗發布;發布由使用者／主控處理.本檢查不依賴 wsemi 版本(新舊版皆可運作).

## 已知缺口
- JSDoc 之 `opt.keyId` 寫預設 `'keyId'`,程式實際預設為 `'id'`(`src/WDataScheduler.mjs` `keyId` 初始化處);文件與程式不一致,本輪未動(範圍外).
- `g_timer.mjs`、`test/unit-timer.test.mjs` 之 `funGetNew` 回傳 `itemsNow`,初值 `null`,靠 `setInterval` 1000ms 晚於設值(`delay(0)`)才不踩 R-01;時序倚賴,現況穩定,未改.
