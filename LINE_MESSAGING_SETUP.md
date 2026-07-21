# ZEN FLOW LINE 預約通知設定

## 重要安全處理

曾經貼在對話、郵件或公開檔案中的 Channel Access Token 應立即撤銷並重新簽發。所有正式憑證只能設定在 Cloudflare Worker Secrets，不可放進 `src`、`.env.example`、GitHub 或 ZIP。

Messaging API 的 `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` 與 LINE Pay 的 `LINE_PAY_CHANNEL_SECRET` / `LINE_PAY_CHANNEL_ID` 是兩套不同憑證，不可混用。

LINE Login 也有自己獨立的 `LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET`。請在 LINE Developers 的同一個 Provider 下建立 LINE Login channel，並將它連結到 ZEN FLOW 官方帳號，這樣同一位使用者在 Login 與 Messaging API 才能使用相同的 User ID。

## Firestore 結構

### 1. 顧客會員：`members/{手機號碼}`

```json
{
  "name": "王小美",
  "lineUserId": "U0123456789abcdef0123456789abcdef"
}
```

既有會員文件只需要新增 `lineUserId`。LINE User ID 必須透過 LINE Login 或經簽章驗證的 Messaging API webhook 綁定，不能讓使用者任意輸入別人的 ID。

### 2. 服務人員索引：`staffDirectory/{人員識別碼}`

建議文件 ID 使用預約訂單目前保存的 `therapistPreference`，例如 `Kelly`、`阿翰`。

```json
{
  "displayName": "Kelly",
  "role": "therapist",
  "memberId": "0912345678",
  "lineUserId": "Uabcdef0123456789abcdef0123456789",
  "enabled": true
}
```

### 3. 櫃檯設定：`settings/lineNotifications`

單一櫃檯：

```json
{
  "receptionistLineUserId": "Ufedcba9876543210fedcba9876543210"
}
```

多位櫃檯也可使用：

```json
{
  "receptionistLineUserIds": [
    "Ufedcba9876543210fedcba9876543210",
    "U11111111111111111111111111111111"
  ]
}
```

### 4. 訂單：`orders/{orderId}`

既有訂單至少要有：

```json
{
  "memberId": "0911222333",
  "therapistPreference": "Kelly",
  "date": "2026-07-25",
  "time": "14:00",
  "finalPrice": 1200,
  "status": "pending",
  "isFitness": false
}
```

若未來人員名稱可能重複，建議同時保存固定識別碼：

```json
{
  "therapistMemberId": "staff_kelly"
}
```

後端會依序取得：

1. 顧客：`orders.memberId` → `members/{memberId}.lineUserId`
2. 按摩師／教練：`orders.therapistMemberId` 或 `orders.therapistPreference` → `staffDirectory/{識別碼}.lineUserId`
3. 櫃檯：`settings/lineNotifications`

推播成功後，訂單會自動增加：

```json
{
  "lineNotificationSentPhases": ["payment"],
  "lineNotificationSentAt": "2026-07-21T10:00:00.000Z",
  "lineNotificationRecipientCount": 3,
  "lineNotificationStatus": "sent"
}
```

`lineNotificationSentPhases` 用於防止付款回呼重試時重複推播。

## Firebase 服務帳戶

1. Firebase Console → 專案設定 → 服務帳戶。
2. 建立專用服務帳戶金鑰。
3. 僅授予 Cloud Datastore User（或實際所需的最小 Firestore IAM 權限）。
4. 將 `client_email` 與 `private_key` 分別存入 Cloudflare Secrets。
5. JSON 金鑰檔不可上傳 GitHub，設定完成後應安全保管或刪除本機副本。

後端使用 Google OAuth 2.0 與 `datastore` scope 呼叫 Firestore REST API；服務帳戶請求由 IAM 控制，不依賴前台 Firestore Rules。

## Cloudflare Worker Secrets

在 Cloudflare：Workers 和 Pages → `zenflow` → 設定 → 變數與秘密，將以下項目全部設定為 **Secret**：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `INTERNAL_WEBHOOK_SECRET`（自行產生至少 32 bytes 的隨機字串）
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `LINE_LOGIN_CHANNEL_SECRET`
- `SESSION_SIGNING_SECRET`（自行產生至少 32 bytes 的隨機字串）

一般環境變數：

- `FIREBASE_PROJECT_ID` = `project-09054e85-fe75-4f73-a3d`
- `FIREBASE_DATABASE_ID` = `ai-studio-ab68fdae-75a1-4c4e-b55e-fc65b5115e63`
- `LINE_LOGIN_CHANNEL_ID`
- `APP_ORIGIN` = `https://zenflow.com.tw`

取得 LINE Pay 商家憑證後再設定：

- `LINE_PAY_CHANNEL_ID`
- `LINE_PAY_CHANNEL_SECRET`
- `LINE_PAY_API_URL`（測試：`https://sandbox-api-pay.line.me`；正式：`https://api-pay.line.me`）

## API 與觸發方式

### LINE 快捷登入

在 LINE Developers → LINE Login channel 設定 Callback URL：

```text
https://zenflow.com.tw/api/auth/line/callback
```

登入流程使用 OAuth 2.1、`state`、`nonce` 與 PKCE。前端只需導向：

```ts
window.location.assign('/api/auth/line/start?returnTo=/');
```

回到網站後可取得目前登入會員：

```ts
const session = await fetch('/api/auth/session', {
  credentials: 'same-origin'
}).then(response => response.json());
```

新 LINE 使用者會自動建立：

```text
members/line_{LINE_USER_ID}
lineIdentities/{LINE_USER_ID}
```

其中 `members` 文件會保存 `lineUserId`；`lineIdentities` 只負責將 LINE User ID 索引到會員文件。既有手機會員若要與 LINE 身分合併，應由已驗證的會員操作或管理員確認，不可只憑瀏覽器傳入的手機號碼自動合併。

### LINE Pay 成功

前台確認付款時會將 `orderId` 送到 `/api/linepay/confirm`。後端確認 LINE Pay 回覆 `returnCode: "0000"` 後會：

1. 從 Firestore 重新讀取訂單金額。
2. 更新付款狀態與交易編號。
3. 取得顧客、服務人員與櫃檯 LINE User ID。
4. 呼叫 LINE multicast API。
5. 寫回防重複推播紀錄。

### 現場付款或其他可信任後端流程

可信任的後端可呼叫：

```http
POST /api/notifications/booking-success
Content-Type: application/json
X-Zenflow-Webhook-Secret: <INTERNAL_WEBHOOK_SECRET>

{
  "orderId": "order_document_id",
  "phase": "booking"
}
```

請勿把 `INTERNAL_WEBHOOK_SECRET` 放在瀏覽器前端。若預約目前完全由前端直接寫入 Firestore，應先將建立訂單流程移到 Worker，才能安全地在建立後自動呼叫此通知。

## LINE Developers Webhook

Webhook URL 設為：

```text
https://zenflow.com.tw/api/line/webhook
```

並開啟 Use webhook。後端會驗證 `x-line-signature`。顧客、按摩師與櫃檯都必須加入同一個 LINE 官方帳號，且 LINE User ID 必須屬於同一個 Provider；否則 LINE 可能回傳成功但使用者不會收到訊息。

## 通知內容

```text
【Loves | ZEN FLOW】預約成功通知

您好，系統提醒您在 2026-07-25 14:00 有一筆運動按摩預約，請準時出席 / 準備接待。
```
