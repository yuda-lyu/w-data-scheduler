# 回饋(feedback)

> 任務中發現之自有套件、全域技能、全域設定之調整與抽提提案.一條一列,只增不改;處置結果另記一列並寫明承接哪一列.
> 欄位:日期｜類別｜對象｜內容｜依據

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-12 | 全域技能 | role-command-windows | 建議補一條:Git Bash 的 GNU tar 對 `C:/…` 形式路徑會把 `C` 當遠端主機而失敗,解壓 `.tgz` 須加 `--force-local`(或改用相對路徑);派工常要求解壓/安裝 npm 打包檔,此坑易重複. | 指令 `tar -xzf C:/…/wsemi-1.9.57.tgz` 輸出 `tar (child): Cannot connect to C: resolve failed`;加 `--force-local` 後成功 |
| 2026-11-26 | 全域技能 | update-pks | 建議於「升級自有套件後檢查使用端」補一條:使用端若含 worker 打包產物(如 `src/*.wk.umd.js`,base64 內嵌打包當時之 wsemi 程式),升 wsemi 後須依該庫之建置腳本重建產物,否則產物仍帶舊版 wsemi 之預設行為,測試全綠、下次發布重建時才現形;核對「上游預設改變」類遷移時,測試須對 `.mjs` 與產物各一案. | w-converhp m667b2 輪:升至 wsemi 1.9.80 未改 src 時,`test/unit-checkTotalHashLevel.test.mjs` 之 `.mjs` 案紅、`.wk.umd.js` 案綠;重建後只有 `checkTotalHash.wk.umd.js` 變動(`git status`) |
| 2026-11-26 | 全域設定 | 派工共通守則(quiet-run) | 以 `--cwd <他庫>` 跑他庫之指令時,quiet-run 之 log 與 summary 落在呼叫者工作目錄之 `tmp/quiet-run/`,不在目標庫;一次跨五庫之派工使本庫 `tmp/` 混入四庫之 log,結案清理須由呼叫者統一處理.建議於守則註明此行為(或提供落在目標庫 `tmp/` 之選項),使派工書之「暫存放各庫 `./tmp/`」與實況一致. | 本輪 `quiet-run --cwd <他庫>` 之輸出行 `log=…` 皆指向本庫 `tmp/quiet-run/` |
