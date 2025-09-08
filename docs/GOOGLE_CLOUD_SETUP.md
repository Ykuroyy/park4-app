# Google Cloud Vision API 設定ガイド

## 1. JSONファイルの準備

ダウンロードしたJSONファイルを開くと、以下のような内容になっています：

```json
{
  "type": "service_account",
  "project_id": "park4-app-xxxxx",
  "private_key_id": "xxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "park4-ocr@park4-app-xxxxx.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/xxxxx"
}
```

## 2. Railway での環境変数設定

### 方法A: JSON全体を環境変数として設定（推奨）

1. **Railwayダッシュボードを開く**
   - https://railway.app でログイン
   - プロジェクトを選択

2. **Variables タブを開く**
   - 右側の「Variables」をクリック

3. **環境変数を追加**
   
   ```
   変数名: GOOGLE_CLOUD_PROJECT_ID
   値: park4-app-xxxxx （JSONファイルのproject_idの値）
   ```

4. **認証情報を追加**
   
   ```
   変数名: GOOGLE_APPLICATION_CREDENTIALS
   値: JSONファイルの内容全体をコピー＆ペースト
   ```

   **重要**: JSONを1行にする必要があります。以下のツールで変換：
   - https://www.text-utils.com/json-minifier/
   - または、JSONファイルの改行を削除

### 方法B: Base64エンコード方式（改行が多い場合）

1. **JSONをBase64エンコード**

   macOSの場合（ターミナル）:
   ```bash
   base64 -i ~/Downloads/park4-app-xxxxx.json | pbcopy
   ```

   Windowsの場合（PowerShell）:
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("C:\Downloads\park4-app-xxxxx.json")) | Set-Clipboard
   ```

2. **Railway環境変数に設定**
   ```
   変数名: GOOGLE_APPLICATION_CREDENTIALS_BASE64
   値: [Base64エンコードされた文字列を貼り付け]
   ```

## 3. アプリケーションコードの修正

Base64方式を使用する場合は、以下のコードを追加：

```javascript
// server.js の先頭に追加
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
  const credentials = Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 
    'base64'
  ).toString('utf-8');
  
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials;
}
```

## 4. 設定確認

Railway のログで以下を確認：
- ✅ "Google Cloud Vision API initialized"
- ❌ エラーが出る場合は環境変数を再確認

## トラブルシューティング

### よくあるエラーと対処法

1. **"The request is missing a valid API key"**
   - 環境変数が正しく設定されていない
   - JSONの形式が崩れている

2. **"Permission denied"**
   - サービスアカウントのロールを確認
   - Vision API が有効化されているか確認

3. **"Invalid JSON"**
   - JSONの改行・エスケープを確認
   - Base64エンコード方式を試す

## セキュリティ注意事項

⚠️ **重要**:
- JSONキーファイルは機密情報です
- GitHubにコミットしない
- ローカルで保管する場合は安全な場所に
- 不要になったキーは Google Cloud Console で削除

## 料金確認

Google Cloud Console で使用量を確認：
1. 「お支払い」→「予算とアラート」
2. 月1,000件の無料枠を超えないよう監視
3. アラート設定で通知を受け取る