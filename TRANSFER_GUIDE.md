# ZEN FLOW 開發專案轉移說明

## 在新電腦繼續開發

1. 將完整開發專案 ZIP 解壓縮到固定資料夾。
2. 使用 Codex 開啟解壓縮後的 `zen-flow-app` 資料夾。
3. 安裝 Node.js 20 以上版本與 pnpm。
4. 在專案資料夾執行 `pnpm install --frozen-lockfile`。
5. 執行 `pnpm run dev`，再開啟本機預覽網址。

## 雲端資料

- 專案已包含目前的 Firebase 前端連線設定與 Firestore 規則檔案。
- 會員、預約與訂單資料仍位於原 Firebase 專案，不會被存進 ZIP。
- 新電腦需能連線至網路，才能讀取相同的 Firebase 雲端資料。

## 部署

- Cloudflare 建置指令：`pnpm run build`
- Cloudflare 部署指令：`npx wrangler deploy`
- 輸出目錄：`dist`
- Cloudflare 專案類型：Workers Builds（不是純靜態 Pages）
- Production branch：GitHub 的 `main`
- Root directory：留白（專案檔案位於儲存庫根目錄）
- Worker 名稱必須維持 `zenflow`，以保留現有固定網域與 Dashboard secrets。

## 注意事項

- 請勿把 `node_modules` 從舊電腦直接搬到新電腦，應在新電腦重新安裝。
- `public/ahan-profile.jpg` 與 `public/kelly-profile.jpg` 是目前使用的人員照片。
- 每次重新打包前，應先執行正式建置並比對 ZIP 內外的最新原始碼。
