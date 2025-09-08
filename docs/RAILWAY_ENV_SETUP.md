# Railway 環境変数設定ガイド

## 📍 Railway ダッシュボードへのアクセス

### 1. Railway にログイン
- URL: https://railway.app
- GitHubアカウントでログイン

### 2. プロジェクト画面を開く
![Variables location](https://railway.app/images/docs/variables.png)

- プロジェクトカードをクリック
- 右側のメニューから「Variables」をクリック

## 🔧 環境変数の追加方法

### 方法1: GUI で1つずつ追加

1. **「+ New Variable」ボタンをクリック**

2. **変数名と値を入力**
   ```
   GOOGLE_CLOUD_PROJECT_ID = park4-app-12345
   ```

3. **「Add」をクリック**

### 方法2: Raw Editor で一括追加（推奨）

1. **「RAW Editor」タブをクリック**

2. **以下の形式で貼り付け**
   ```
   GOOGLE_CLOUD_PROJECT_ID=park4-app-12345
   GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"park4-app-12345","private_key_id":"xxx","private_key":"-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n","client_email":"xxx@xxx.iam.gserviceaccount.com","client_id":"xxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/xxx"}
   ```

3. **「Update Variables」をクリック**

## 📝 Google Cloud JSONファイルの処理

### JSONファイルを1行に変換する方法

#### オプション1: オンラインツール
1. https://www.text-utils.com/json-minifier/ にアクセス
2. JSONファイルの内容をペースト
3. 「Minify」をクリック
4. 結果をコピー

#### オプション2: コマンドライン（Mac/Linux）
```bash
# JSONファイルを1行に圧縮
cat ~/Downloads/park4-key.json | jq -c . | pbcopy
# クリップボードにコピーされます
```

#### オプション3: コマンドライン（Windows）
```powershell
# PowerShellで実行
Get-Content C:\Downloads\park4-key.json | ConvertFrom-Json | ConvertTo-Json -Compress | Set-Clipboard
```

## ⚠️ 重要な注意事項

### JSONの改行処理
- **改行（\n）はそのまま残す**
- private_key内の`\n`は変更しない
- 全体を1行にするだけ

### 間違った例 ❌
```
GOOGLE_APPLICATION_CREDENTIALS={
  "type": "service_account",
  "project_id": "park4-app-12345",
  ...
}
```

### 正しい例 ✅
```
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"park4-app-12345",...}
```

## 🔍 設定の確認方法

### 1. 環境変数が正しく設定されているか確認

Railway の Variables タブで：
- 変数名が表示されている
- 値が「•••••」で隠されている（セキュリティ）

### 2. デプロイログを確認

Deployments タブ → View Logs で確認：

**成功の場合** ✅
```
✅ Google Cloud Vision API initialized successfully
```

**失敗の場合** ❌
```
⚠️ Google Cloud Vision API initialization failed
```

## 🚨 トラブルシューティング

### エラー: "Invalid JSON"
**原因**: JSONが正しくパースできない
**解決策**: 
- JSONを1行に圧縮し直す
- ダブルクォートが正しいか確認

### エラー: "Permission denied"
**原因**: サービスアカウントの権限不足
**解決策**: 
- Google Cloud ConsoleでVision APIが有効か確認
- サービスアカウントに「Cloud Vision API User」ロールがあるか確認

### エラー: "API key not valid"
**原因**: 環境変数が正しく設定されていない
**解決策**: 
- 変数名のスペルミスがないか確認
- JSONの内容が完全にコピーされているか確認

## 💡 ベストプラクティス

1. **環境変数はRAW Editorで一括設定**
   - 手動入力よりエラーが少ない

2. **デプロイ前にローカルでテスト**
   ```bash
   # .env.localファイルでテスト
   GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account",...}'
   npm run dev
   ```

3. **変更後は再デプロイ**
   - 環境変数を変更したら必ず再デプロイ
   - Railway は自動的に再デプロイされる場合もある

## 📊 その他の重要な環境変数

```bash
# データベース（Railway が自動設定）
DATABASE_URL=postgresql://...
DATABASE_PRIVATE_URL=postgresql://...

# アプリ設定
NODE_ENV=production
PORT=3000

# OCR API選択（オプション）
OCR_PROVIDER=google  # または 'aws'
```