# 回饋(feedback)

> 任務中發現之自有套件、全域技能、全域設定之調整與抽提提案.一條一列,只增不改;處置結果另記一列並寫明承接哪一列.
> 欄位:日期｜類別｜對象｜內容｜依據

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-12 | 全域技能 | role-command-windows | 建議補一條:Git Bash 的 GNU tar 對 `C:/…` 形式路徑會把 `C` 當遠端主機而失敗,解壓 `.tgz` 須加 `--force-local`(或改用相對路徑);派工常要求解壓/安裝 npm 打包檔,此坑易重複. | 指令 `tar -xzf C:/…/wsemi-1.9.57.tgz` 輸出 `tar (child): Cannot connect to C: resolve failed`;加 `--force-local` 後成功 |
