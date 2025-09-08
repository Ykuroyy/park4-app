# Park4 - 駐車場管理アプリ

ホテルスタッフ向けのスマートフォンカメラを使った駐車場ナンバープレート認識アプリです。

## 機能

- 📱 **スマートフォンカメラ対応**: リアカメラを使った動画撮影
- 🔍 **自動ナンバープレート認識**: 2秒間隔での自動キャプチャと認識
- 📍 **GPS位置情報取得**: 各車両の駐車位置を記録
- 📊 **Excelエクスポート**: 検出データをExcel形式でダウンロード
- 💾 **データ管理**: 最大100台まで記録可能
- 📲 **PWA対応**: スマートフォンのホーム画面に追加可能
- 🔄 **オフライン対応**: ネットワークなしでも基本機能が利用可能

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発環境での実行

```bash
npm run dev
```

### 本番環境での実行

```bash
npm start
```

アプリは `http://localhost:3000` でアクセスできます。

## デプロイ

### Railway でのデプロイ

1. [Railway](https://railway.app) にアカウントを作成
2. GitHubリポジトリを接続
3. 自動的に `railway.toml` 設定が適用されデプロイされます

### Render でのデプロイ

1. [Render](https://render.com) にアカウントを作成
2. GitHubリポジトリを接続
3. `render.yaml` 設定を使用して Web Service を作成

## 使用方法

1. **カメラ許可**: アプリを開いて、カメラとGPSの使用を許可
2. **撮影開始**: "📹 撮影開始" ボタンをタップ
3. **自動認識**: カメラでナンバープレートを映すと自動的に認識・保存
4. **データ確認**: 検出されたナンバープレート一覧で結果を確認
5. **データ出力**: "📊 Excel出力" でデータをダウンロード

## 技術仕様

- **フロントエンド**: Vanilla JavaScript, HTML5, CSS3
- **バックエンド**: Node.js, Express
- **PWA**: Service Worker, Web App Manifest
- **APIs**: MediaDevices (Camera), Geolocation (GPS)
- **データ形式**: Excel (.xlsx)
- **対応デバイス**: スマートフォン、タブレット

## ディレクトリ構造

```
park4-app/
├── public/                 # 静的ファイル
│   ├── css/               # スタイルシート
│   ├── js/                # JavaScript ファイル
│   ├── index.html         # メインHTML
│   ├── manifest.json      # PWA マニフェスト
│   └── sw.js             # Service Worker
├── server.js             # サーバーメイン
├── package.json          # 依存関係
├── railway.toml          # Railway 設定
├── render.yaml           # Render 設定
└── README.md            # このファイル
```

## API エンドポイント

- `GET /` - メインページ
- `POST /api/save-plate` - ナンバープレートデータ保存
- `GET /api/plates` - 全ナンバープレートデータ取得
- `DELETE /api/plates` - 全データ削除
- `GET /api/export/excel` - Excel形式でデータエクスポート

## ライセンス

ISC License

## 注意事項

- カメラとGPS機能を使用するため、HTTPS環境が必要です
- **本格的なOCR API統合済み**: Google Cloud Vision API とAWS Rekognitionに対応
- APIが設定されていない場合は自動的にフォールバックモードで動作
- サポートブラウザ: Chrome, Safari, Edge (最新版)

## OCR API設定方法

### Google Cloud Vision API（推奨）

1. **Google Cloud Consoleでプロジェクト作成**
2. **Vision APIを有効化**
3. **サービスアカウント作成**
4. **Railway環境変数設定**:
   ```
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
   ```

### AWS Rekognition（代替案）

1. **AWS アカウント作成**
2. **Rekognitionアクセス許可**
3. **Railway環境変数設定**:
   ```
   AWS_REGION=ap-northeast-1
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   ```

### API料金（参考）
- **Google Cloud Vision**: 
  - 月1,000枚まで**無料**
  - 1,001枚目から: ¥5.18/枚
  - 100台×30日の場合: 約¥10,360/月
  
- **AWS Rekognition**: 
  - 月5,000枚まで**無料**
  - 5,001枚目から: $0.001/枚（約¥0.15/枚）
  - 100台×30日の場合: **無料**（5,000枚以内）

### 💰 コスト最適化機能
アプリには以下のコスト削減機能を実装済み：
- **キャッシュ機能**: 5分間の重複検出防止（約30%削減）
- **画像前処理**: ぼけ・暗すぎる画像を事前除外（約10%削減）
- **クォータ管理**: 1日の使用量を監視
- **バッチ処理**: 効率的なAPI呼び出し（約5%削減）

**推定削減率: 約45%** → 実質約¥5,700/月

## 今後の改善予定

- より高精度な前処理アルゴリズム
- ユーザー認証機能
- 複数言語対応
- リアルタイム映像解析