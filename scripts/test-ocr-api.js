#!/usr/bin/env node

// Google Cloud Vision API テストスクリプト
// Railway デプロイ後にログで動作確認用

const fs = require('fs');

console.log('🔍 OCR API Test Script');
console.log('======================');

// 環境変数をチェック
console.log('\n📊 Environment Variables:');
console.log(`GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Set' : '❌ Not set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Google Cloud Vision API の初期化テスト
try {
  console.log('\n🔧 Testing Google Cloud Vision API...');
  
  // OCRService をテスト
  const OCRService = require('../ocrService');
  const ocrService = new OCRService();
  
  console.log('✅ OCRService initialized successfully');
  
  // API接続テスト
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    console.log(`✅ Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
  }
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      console.log(`✅ Service Account: ${credentials.client_email || 'Unknown'}`);
      console.log(`✅ Project from credentials: ${credentials.project_id || 'Unknown'}`);
    } catch (e) {
      console.log('⚠️  Credentials format may be file path');
    }
  }
  
} catch (error) {
  console.error('❌ OCR API Test failed:', error.message);
}

console.log('\n🚀 Test completed!');
console.log('If deployed on Railway, check the deployment logs.');