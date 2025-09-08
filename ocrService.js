// OCR依存関係を安全にインポート
let vision = null;
try {
  vision = require('@google-cloud/vision');
} catch (error) {
  console.warn('⚠️ Google Cloud Vision not installed:', error.message);
}

const OCROptimizer = require('./ocrOptimizer');

class OCRService {
  constructor() {
    // OCR最適化モジュール
    this.optimizer = new OCROptimizer();
    
    // Base64エンコードされた認証情報をデコード
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
      try {
        const credentials = Buffer.from(
          process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
          'base64'
        ).toString('utf-8');
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials;
      } catch (error) {
        console.error('Failed to decode Google credentials:', error);
      }
    }

    // Google Cloud Vision API client（設定されている場合のみ）
    if (vision && (process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        const clientConfig = {};
        
        // JSON文字列として環境変数に設定されている場合
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          try {
            const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
            clientConfig.credentials = credentials;
            clientConfig.projectId = credentials.project_id || process.env.GOOGLE_CLOUD_PROJECT_ID;
          } catch (e) {
            // JSON文字列でない場合はファイルパスとして扱う
            clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            clientConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
          }
        }
        
        this.visionClient = new vision.ImageAnnotatorClient(clientConfig);
        console.log('✅ Google Cloud Vision API initialized successfully');
      } catch (error) {
        console.warn('⚠️ Google Cloud Vision API initialization failed:', error.message);
        this.visionClient = null;
      }
    } else {
      console.log('ℹ️ Google Cloud Vision API not available - using fallback mode');
      console.log('🔍 Debug info:');
      console.log('  - vision package:', vision ? 'Available' : 'Not available');
      console.log('  - GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID ? 'Set' : 'Not set');
      console.log('  - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? `Set (${process.env.GOOGLE_APPLICATION_CREDENTIALS.length} chars)` : 'Not set');
      this.visionClient = null;
    }
  }

  // メイン画像認識メソッド
  async recognizeLicensePlate(imageBuffer) {
    try {
      // キャッシュチェック
      const imageHash = this.optimizer.generateImageHash(imageBuffer);
      const cachedResult = await this.optimizer.checkCache(imageHash);
      
      if (cachedResult) {
        console.log('Using cached OCR result');
        return cachedResult;
      }

      // 画像の事前検証
      const validation = await this.optimizer.preValidateImage(imageBuffer);
      if (!validation.valid) {
        console.log('Image pre-validation failed:', validation.reason);
        return null;
      }

      // ぼけ検出
      const isBlurred = await this.optimizer.detectMotionBlur(imageBuffer);
      if (isBlurred) {
        console.log('Image is too blurry for OCR');
        return null;
      }

      // クォータチェック
      const quota = this.optimizer.checkDailyQuota();
      console.log(`OCR Quota: ${quota.remaining}/${quota.quota} remaining today`);

      // Vision APIが利用できない場合はフォールバック
      if (!this.visionClient) {
        return this.fallbackOCR(imageBuffer);
      }

      // Google Cloud Vision APIでテキスト検出
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;
      
      // API使用を記録
      this.optimizer.incrementUsage();
      
      if (!detections || detections.length === 0) {
        return null;
      }

      // 検出されたテキストから日本のナンバープレートを抽出
      const fullText = detections[0].description;
      const plateNumber = this.extractJapaneseLicensePlate(fullText);
      
      if (plateNumber) {
        // 信頼度スコアを計算
        const confidence = this.calculateConfidence(plateNumber, detections);
        
        const result = {
          plateNumber,
          confidence,
          rawText: fullText,
          boundingBoxes: detections.slice(1).map(detection => detection.boundingPoly)
        };

        // キャッシュに保存
        this.optimizer.saveToCache(imageHash, result);
        
        return result;
      }

      return null;

    } catch (error) {
      console.error('OCR API Error:', error);
      throw new Error('ナンバープレート認識に失敗しました');
    }
  }

  // 日本のナンバープレートパターンを抽出
  extractJapaneseLicensePlate(text) {
    // 改行と余分なスペースを削除
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 日本のナンバープレートパターン
    const patterns = [
      // 標準的なパターン: 地名 分類番号 ひらがな 一連番号
      /([^0-9]+)\s*(\d{3})\s*([あ-ん])\s*(\d{1,4})/g,
      // 軽自動車など: 地名 分類番号 ひらがな 一連番号
      /([^0-9]+)\s*(\d{2,3})\s*([あ-ん])\s*(\d{1,4})/g,
      // 希望番号制対応
      /([^0-9]+)\s*(\d{3})\s*([あ-ん])\s*(\d{1,4})/g
    ];

    for (const pattern of patterns) {
      const matches = [...cleanText.matchAll(pattern)];
      
      for (const match of matches) {
        const [, region, classification, hiragana, serialNumber] = match;
        
        // 地名の妥当性チェック
        if (this.isValidRegion(region.trim()) && 
            this.isValidHiragana(hiragana) &&
            serialNumber.length >= 1 && serialNumber.length <= 4) {
          
          return `${region.trim()} ${classification} ${hiragana} ${serialNumber}`;
        }
      }
    }

    // より柔軟なパターンマッチング
    const flexiblePattern = /([あ-ん])\s*(\d{4})/g;
    const flexibleMatch = cleanText.match(flexiblePattern);
    
    if (flexibleMatch) {
      return flexibleMatch[0].replace(/\s+/g, ' ');
    }

    return null;
  }

  // 日本の地域名検証
  isValidRegion(region) {
    const validRegions = [
      // 関東
      '品川', '練馬', '足立', '多摩', '八王子', '横浜', '川崎', '相模', '湘南',
      '千葉', '習志野', '野田', '袖ヶ浦', '成田', '柏', '大宮', '所沢', '春日部',
      '熊谷', '川越', '越谷', '宇都宮', 'とちぎ', '那須', '前橋', '高崎', '水戸',
      
      // 関西
      '大阪', 'なにわ', '和泉', '京都', '神戸', '姫路', '奈良', '和歌山',
      
      // その他主要都市
      '札幌', '青森', '盛岡', '仙台', '秋田', '山形', '福島', 'いわき',
      '新潟', '長岡', '富山', '金沢', '福井', '甲府', '長野', '松本',
      '岐阜', '飛騨', '静岡', '浜松', '沼津', '名古屋', '尾張小牧', '三河',
      '津', '四日市', '鈴鹿', '大津', '滋賀', '和歌山', '鳥取', '島根',
      '岡山', '倉敷', '広島', '福山', '下関', '山口', '徳島', '香川',
      '愛媛', '高知', '福岡', '北九州', '筑豊', '久留米', '佐賀', '長崎',
      '佐世保', '熊本', '大分', '宮崎', '鹿児島', '沖縄'
    ];

    return validRegions.includes(region);
  }

  // ひらがな検証
  isValidHiragana(char) {
    // 自動車に使用されるひらがな（「お」「し」「へ」「ん」は除く）
    const validHiragana = [
      'あ', 'い', 'う', 'え', 'か', 'き', 'く', 'け', 'こ',
      'さ', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と',
      'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'ほ',
      'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ',
      'ら', 'り', 'る', 'れ', 'ろ', 'わ'
    ];

    return validHiragana.includes(char);
  }

  // 信頼度スコア計算
  calculateConfidence(plateNumber, detections) {
    let confidence = 50; // ベーススコア

    // パターンマッチング精度
    if (plateNumber.match(/^[^0-9]+\s*\d{3}\s*[あ-ん]\s*\d{1,4}$/)) {
      confidence += 30;
    }

    // 検出された文字数
    if (detections.length >= 6) {
      confidence += 10;
    }

    // OCR API側の信頼度がある場合は考慮
    if (detections[0].confidence) {
      confidence = Math.min(confidence + (detections[0].confidence * 10), 100);
    }

    return Math.min(confidence, 100);
  }

  // AWS Rekognitionを使用する場合の代替実装
  async recognizeWithAWS(imageBuffer) {
    let AWS = null;
    try {
      AWS = require('aws-sdk');
    } catch (error) {
      console.warn('⚠️ AWS SDK not available:', error.message);
      return null;
    }
    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION || 'ap-northeast-1'
    });

    try {
      const params = {
        Image: {
          Bytes: imageBuffer
        }
      };

      const result = await rekognition.detectText(params).promise();
      const textDetections = result.TextDetections;

      if (!textDetections || textDetections.length === 0) {
        return null;
      }

      // 検出されたテキストを結合
      const fullText = textDetections
        .filter(detection => detection.Type === 'LINE')
        .map(detection => detection.DetectedText)
        .join(' ');

      const plateNumber = this.extractJapaneseLicensePlate(fullText);
      
      if (plateNumber) {
        const confidence = this.calculateAWSConfidence(textDetections);
        
        return {
          plateNumber,
          confidence,
          rawText: fullText,
          detections: textDetections
        };
      }

      return null;

    } catch (error) {
      console.error('AWS Rekognition Error:', error);
      throw new Error('AWS OCR認識に失敗しました');
    }
  }

  calculateAWSConfidence(detections) {
    if (detections.length === 0) return 0;
    
    const avgConfidence = detections
      .filter(d => d.Confidence)
      .reduce((sum, d) => sum + d.Confidence, 0) / detections.length;
    
    return Math.round(avgConfidence);
  }

  // 画像前処理（精度向上のため）
  preprocessImage(imageBuffer) {
    const sharp = require('sharp');
    
    return sharp(imageBuffer)
      .resize(1280, 720, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();
  }

  // フォールバックOCR（Vision API未設定時）
  async fallbackOCR(imageBuffer) {
    console.log('Using fallback OCR (demo mode)');
    
    // デモ用のランダムナンバープレート生成
    const regions = ['品川', '練馬', '横浜', '千葉', '大阪'];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const classification = String(300 + Math.floor(Math.random() * 40));
    const hiragana = ['あ', 'か', 'さ', 'た', 'な'][Math.floor(Math.random() * 5)];
    const number = String(Math.floor(Math.random() * 9000) + 1000);
    
    const plateNumber = `${region} ${classification} ${hiragana} ${number}`;
    
    return {
      plateNumber,
      confidence: 75 + Math.floor(Math.random() * 20),
      rawText: plateNumber,
      demo: true
    };
  }

  // コスト統計取得
  getCostStatistics() {
    const dailyImages = 100; // 想定される1日の処理枚数
    return this.optimizer.estimateMonthlyCost(dailyImages);
  }
}

module.exports = OCRService;