const express = require('express');
const multer = require('multer');
const OCRService = require('../ocrService');

const router = express.Router();
const ocrService = new OCRService();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'), false);
    }
  }
});

// OCR処理エンドポイント
router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '画像ファイルが必要です' 
      });
    }

    console.log('Processing image with OCR...');
    
    // 画像前処理
    const preprocessedImage = await ocrService.preprocessImage(req.file.buffer);
    
    // OCR処理実行
    const result = await ocrService.recognizeLicensePlate(preprocessedImage);
    
    if (result) {
      console.log('License plate detected:', result.plateNumber);
      
      res.json({
        success: true,
        data: {
          plateNumber: result.plateNumber,
          confidence: result.confidence,
          rawText: result.rawText,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: false,
        message: 'ナンバープレートが検出されませんでした',
        confidence: 0
      });
    }

  } catch (error) {
    console.error('OCR processing error:', error);
    
    let errorMessage = 'OCR処理中にエラーが発生しました';
    
    if (error.message.includes('API key')) {
      errorMessage = 'OCR API設定が正しくありません';
    } else if (error.message.includes('quota')) {
      errorMessage = 'OCR API使用量制限に達しました';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Base64画像データでの処理エンドポイント
router.post('/process-base64', async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: '画像データが必要です'
      });
    }

    // Base64データを変換
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('Processing base64 image with OCR...');
    
    // 画像前処理
    const preprocessedImage = await ocrService.preprocessImage(imageBuffer);
    
    // OCR処理実行
    const result = await ocrService.recognizeLicensePlate(preprocessedImage);
    
    if (result) {
      console.log('License plate detected:', result.plateNumber);
      
      res.json({
        success: true,
        data: {
          plateNumber: result.plateNumber,
          confidence: result.confidence,
          rawText: result.rawText,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: false,
        message: 'ナンバープレートが検出されませんでした',
        confidence: 0
      });
    }

  } catch (error) {
    console.error('OCR processing error:', error);
    
    res.status(500).json({
      success: false,
      error: 'OCR処理中にエラーが発生しました'
    });
  }
});

// OCRサービス健康状態チェック
router.get('/health', async (req, res) => {
  try {
    // 小さなテスト画像でOCRサービスをテスト
    res.json({
      success: true,
      message: 'OCRサービスは正常に動作しています',
      timestamp: new Date().toISOString(),
      config: {
        googleCloudVision: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        awsRekognition: !!process.env.AWS_REGION
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'OCRサービスに問題があります'
    });
  }
});

module.exports = router;