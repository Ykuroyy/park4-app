#!/bin/bash

# Google Cloud Vision API セットアップスクリプト

echo "🔧 Google Cloud Vision API セットアップツール"
echo "==========================================="
echo ""

# JSONファイルの確認
echo "📁 サービスアカウントのJSONファイルを準備してください"
echo "   (Google Cloud Consoleからダウンロードしたファイル)"
echo ""
read -p "JSONファイルのパス: " json_path

if [ ! -f "$json_path" ]; then
    echo "❌ ファイルが見つかりません: $json_path"
    exit 1
fi

# JSONファイルの内容を読み込み
json_content=$(cat "$json_path")

# プロジェクトIDを抽出
project_id=$(echo "$json_content" | grep -o '"project_id": *"[^"]*"' | sed 's/"project_id": *"\([^"]*\)"/\1/')

echo ""
echo "✅ プロジェクトID: $project_id"
echo ""

# 設定方法を選択
echo "Railway環境変数の設定方法を選んでください:"
echo "1) JSON全体を環境変数として設定（推奨）"
echo "2) Base64エンコード方式"
echo "3) 手動で設定する"
echo ""
read -p "選択 (1-3): " choice

case $choice in
    1)
        # JSONを1行に圧縮
        minified_json=$(echo "$json_content" | jq -c .)
        
        echo ""
        echo "📋 以下の環境変数をRailwayに設定してください:"
        echo "==========================================="
        echo ""
        echo "GOOGLE_CLOUD_PROJECT_ID=$project_id"
        echo ""
        echo "GOOGLE_APPLICATION_CREDENTIALS=$minified_json"
        echo ""
        echo "==========================================="
        echo ""
        echo "💡 ヒント: この内容をコピーしてRailwayの環境変数に貼り付けてください"
        
        # クリップボードにコピー（macOS）
        if command -v pbcopy &> /dev/null; then
            echo "GOOGLE_CLOUD_PROJECT_ID=$project_id" | pbcopy
            echo "✅ プロジェクトIDをクリップボードにコピーしました"
        fi
        ;;
        
    2)
        # Base64エンコード
        base64_content=$(base64 < "$json_path" | tr -d '\n')
        
        echo ""
        echo "📋 以下の環境変数をRailwayに設定してください:"
        echo "==========================================="
        echo ""
        echo "GOOGLE_CLOUD_PROJECT_ID=$project_id"
        echo ""
        echo "GOOGLE_APPLICATION_CREDENTIALS_BASE64=$base64_content"
        echo ""
        echo "==========================================="
        echo ""
        
        # クリップボードにコピー（macOS）
        if command -v pbcopy &> /dev/null; then
            echo "$base64_content" | pbcopy
            echo "✅ Base64エンコードされた認証情報をクリップボードにコピーしました"
        fi
        ;;
        
    3)
        echo ""
        echo "📝 手動設定の手順:"
        echo "1. Railwayダッシュボードを開く"
        echo "2. Variables タブをクリック"
        echo "3. 以下の変数を追加:"
        echo "   - GOOGLE_CLOUD_PROJECT_ID = $project_id"
        echo "   - GOOGLE_APPLICATION_CREDENTIALS = [JSONファイルの内容]"
        echo ""
        ;;
esac

echo ""
echo "🔍 設定確認方法:"
echo "1. Railwayにデプロイ"
echo "2. ログで '✅ Google Cloud Vision API initialized successfully' を確認"
echo ""
echo "📊 料金について:"
echo "- 月1,000件まで無料"
echo "- 100台×30日 = 3,000件の場合、約¥10,360/月"
echo "- AWS Rekognitionの方が安価（月5,000件まで無料）"
echo ""
echo "✅ セットアップ手順完了！"