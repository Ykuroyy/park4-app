# 🚀 Railway本番デプロイガイド

## 1. Railway環境変数設定

Railwayダッシュボードで以下の環境変数を設定してください：

### Google Cloud Vision API
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
```

### データベース（Railwayが自動設定）
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### その他
```bash
NODE_ENV=production
PORT=3000
```

## 2. デプロイコマンド

```bash
# GitHubリポジトリをRailwayに接続
# または
railway login
railway link
railway up
```

## 3. 本番動作確認

✅ カメラ機能（HTTPS必須）
✅ OCR認識（Google Cloud Vision API）
✅ GPS位置情報取得
✅ データベース保存
✅ Excelエクスポート

## 4. コスト管理

- Google Cloud Vision API: 月間1,000リクエスト無料
- 画像最適化により無駄なAPI呼び出しを削減
- PostgreSQL: Railwayの無料枠内で十分

## 5. エラー監視

本番環境のログは Railway ダッシュボードで確認可能：
- API呼び出し状況
- データベース接続状態
- OCR処理結果

## 6. セキュリティ

✅ HTTPS強制（Railway自動設定）
✅ セキュリティヘッダー設定済み
✅ API キー環境変数保護
✅ 入力値検証・サニタイゼーション