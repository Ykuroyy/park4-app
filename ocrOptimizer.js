// OCR APIコスト最適化モジュール
class OCROptimizer {
  constructor() {
    this.processedCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分間のキャッシュ
    this.dailyQuota = 33; // 1日あたりの無料枠（1000/30日）
    this.dailyCount = 0;
    this.lastResetDate = new Date().toDateString();
  }

  // 重複検出を防ぐキャッシュ機能
  async checkCache(imageHash) {
    const cached = this.processedCache.get(imageHash);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Cache hit - returning cached result');
      return cached.result;
    }
    
    return null;
  }

  // 画像ハッシュ生成（重複検出用）
  generateImageHash(imageBuffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
  }

  // キャッシュに保存
  saveToCache(imageHash, result) {
    this.processedCache.set(imageHash, {
      result,
      timestamp: Date.now()
    });

    // 古いエントリを削除
    this.cleanupCache();
  }

  // 古いキャッシュエントリを削除
  cleanupCache() {
    const now = Date.now();
    for (const [hash, data] of this.processedCache.entries()) {
      if (now - data.timestamp > this.cacheTimeout) {
        this.processedCache.delete(hash);
      }
    }
  }

  // 日次クォータチェック
  checkDailyQuota() {
    const today = new Date().toDateString();
    
    // 日付が変わったらカウントリセット
    if (today !== this.lastResetDate) {
      this.dailyCount = 0;
      this.lastResetDate = today;
    }

    return {
      remaining: Math.max(0, this.dailyQuota - this.dailyCount),
      used: this.dailyCount,
      quota: this.dailyQuota
    };
  }

  // API使用を記録
  incrementUsage() {
    this.dailyCount++;
  }

  // ローカル前処理で明らかに無効な画像を除外
  async preValidateImage(imageBuffer) {
    const sharp = require('sharp');
    
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // 画像サイズチェック
      if (metadata.width < 200 || metadata.height < 100) {
        return { valid: false, reason: '画像が小さすぎます' };
      }

      // 画像の明るさチェック
      const stats = await sharp(imageBuffer).stats();
      const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
      
      if (avgBrightness < 30) {
        return { valid: false, reason: '画像が暗すぎます' };
      }
      
      if (avgBrightness > 240) {
        return { valid: false, reason: '画像が明るすぎます' };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Image validation error:', error);
      return { valid: false, reason: 'Image validation failed' };
    }
  }

  // 動きぼけ検出
  async detectMotionBlur(imageBuffer) {
    const sharp = require('sharp');
    
    try {
      // エッジ検出でぼけを判定
      const edges = await sharp(imageBuffer)
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();

      // エッジの強度を計算
      let edgeStrength = 0;
      for (let i = 0; i < edges.length; i++) {
        edgeStrength += edges[i];
      }
      
      const avgEdgeStrength = edgeStrength / edges.length;
      
      // しきい値以下はぼけていると判定
      return avgEdgeStrength < 10;
      
    } catch (error) {
      console.error('Blur detection error:', error);
      return false;
    }
  }

  // バッチ処理用のキュー管理
  createBatchQueue(maxBatchSize = 10) {
    return {
      queue: [],
      maxSize: maxBatchSize,
      
      add(item) {
        this.queue.push(item);
        if (this.queue.length >= this.maxSize) {
          return this.flush();
        }
        return null;
      },
      
      flush() {
        if (this.queue.length === 0) return null;
        const batch = this.queue.splice(0, this.maxSize);
        return batch;
      },
      
      size() {
        return this.queue.length;
      }
    };
  }

  // コスト見積もり
  estimateMonthlyCost(dailyImages) {
    const monthlyImages = dailyImages * 30;
    const freeQuota = 1000;
    const pricePerImage = 5.18; // JPY
    
    if (monthlyImages <= freeQuota) {
      return {
        totalImages: monthlyImages,
        freeImages: monthlyImages,
        paidImages: 0,
        estimatedCost: 0,
        currency: 'JPY'
      };
    }
    
    const paidImages = monthlyImages - freeQuota;
    const estimatedCost = paidImages * pricePerImage;
    
    return {
      totalImages: monthlyImages,
      freeImages: freeQuota,
      paidImages: paidImages,
      estimatedCost: Math.round(estimatedCost),
      currency: 'JPY',
      costSaving: this.calculateSavings(monthlyImages)
    };
  }

  // 最適化による節約額を計算
  calculateSavings(monthlyImages) {
    // キャッシュによる重複削減（推定30%）
    const duplicateReduction = monthlyImages * 0.3;
    
    // 前処理による無効画像除外（推定10%）
    const invalidReduction = monthlyImages * 0.1;
    
    // バッチ処理による効率化（推定5%）
    const batchReduction = monthlyImages * 0.05;
    
    const totalReduction = duplicateReduction + invalidReduction + batchReduction;
    const savedCost = Math.max(0, (totalReduction - 1000)) * 5.18;
    
    return {
      reducedImages: Math.round(totalReduction),
      savedAmount: Math.round(savedCost),
      reductionPercentage: Math.round((totalReduction / monthlyImages) * 100)
    };
  }
}

module.exports = OCROptimizer;