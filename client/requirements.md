## Packages
(none needed)

## Notes
- 介面全中文；預設深色（黑橘科技感），提供亮色模式（藍白）切換
- 所有 API 走同專案 /api/*（React Query），以便後端再轉接 Google Apps Script Web App
- GitHub Pages base path：已在前端加上 Hash-based 路由（/#/path）以避免 refresh 404；並避免任何以 / 開頭的靜態資源引用
- 離線暫存：localStorage 作為「緩衝」，可在設定頁手動同步（呼叫 /api/sheets/export）
