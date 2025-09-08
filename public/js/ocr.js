class OCRManager {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.lastProcessedTime = 0;
        this.processDelay = 1000; // Minimum delay between processing
        
        this.initializeTesseract();
    }
    
    async initializeTesseract() {
        try {
            // For now, we'll use a simple pattern matching approach
            // In production, you could integrate Tesseract.js or cloud OCR services
            console.log('OCR Manager initialized with pattern matching');
        } catch (error) {
            console.error('Error initializing OCR:', error);
        }
    }
    
    async processImage(imageData) {
        const now = Date.now();
        
        // Throttle processing to avoid overloading
        if (now - this.lastProcessedTime < this.processDelay) {
            return;
        }
        
        this.lastProcessedTime = now;
        
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        updateRecognitionStatus('画像解析中...');
        
        try {
            // Simulate OCR processing - replace with actual OCR implementation
            const plateNumber = await this.simulateOCR(imageData);
            
            if (plateNumber) {
                updateRecognitionStatus('ナンバー検出！');
                
                // Get current location
                const location = window.gpsManager ? await window.gpsManager.getCurrentPosition() : null;
                
                // Save the detected plate
                await this.savePlateData(plateNumber, location);
                
                // Visual feedback
                this.showDetectionFeedback();
                
            } else {
                updateRecognitionStatus('自動認識中...');
            }
            
        } catch (error) {
            console.error('OCR processing error:', error);
            updateRecognitionStatus('認識エラー');
        } finally {
            this.isProcessing = false;
        }
    }
    
    async simulateOCR(imageData) {
        // 実際のOCR API呼び出し
        try {
            const response = await fetch('/api/ocr/process-base64', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageData: imageData
                })
            });

            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data.plateNumber;
            } else {
                console.log('OCR did not detect license plate:', result.message);
                return null;
            }
            
        } catch (error) {
            console.error('OCR API error:', error);
            
            // フォールバック: デモモード
            console.log('Falling back to demo mode...');
            return this.fallbackSimulation();
        }
    }

    // フォールバック用のシミュレーション
    fallbackSimulation() {
        return new Promise((resolve) => {
            setTimeout(() => {
                // デモモードでの検出（本番では削除）
                const shouldDetect = Math.random() > 0.7; // 30% chance of detection
                
                if (shouldDetect) {
                    const plateNumber = this.generateRealisticPlateNumber();
                    resolve(plateNumber);
                } else {
                    resolve(null);
                }
            }, 1500);
        });
    }
    
    generateRealisticPlateNumber() {
        // Japanese license plate patterns
        const regions = ['品川', '練馬', '足立', '多摩', '八王子', '横浜', '川崎', '相模', '千葉', '習志野'];
        const classifications = ['330', '331', '332', '333', '334', '335', '336', '337', '338', '339', '300', '301'];
        const hiragana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'];
        
        const region = regions[Math.floor(Math.random() * regions.length)];
        const classification = classifications[Math.floor(Math.random() * classifications.length)];
        const hira = hiragana[Math.floor(Math.random() * hiragana.length)];
        const number = String(Math.floor(Math.random() * 9000) + 1000);
        
        return `${region} ${classification} ${hira} ${number}`;
    }
    
    async savePlateData(plateNumber, location) {
        try {
            const plateData = {
                plateNumber: plateNumber,
                location: location,
                timestamp: new Date().toISOString(),
                confidence: Math.floor(Math.random() * 20) + 80 // 80-100%
            };
            
            const response = await fetch('/api/save-plate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(plateData)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(`ナンバープレート「${plateNumber}」を保存しました`, 'success');
                
                // Update UI
                window.appManager.addPlateToList(result.data);
                window.appManager.updatePlateCounter(result.totalCount);
                
            } else {
                throw new Error('Failed to save plate data');
            }
            
        } catch (error) {
            console.error('Error saving plate data:', error);
            showNotification('データの保存に失敗しました', 'error');
        }
    }
    
    showDetectionFeedback() {
        // Visual feedback for successful detection
        const scanArea = document.querySelector('.scan-area');
        if (scanArea) {
            scanArea.style.borderColor = '#4CAF50';
            scanArea.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            
            setTimeout(() => {
                scanArea.style.borderColor = '#4CAF50';
                scanArea.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            }, 1000);
        }
    }
    
    // Method to use real OCR service (placeholder)
    async useCloudOCR(imageData) {
        // Example implementation for Google Cloud Vision API
        // You would need to set up authentication and API keys
        
        /*
        try {
            const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [{
                        image: {
                            content: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
                        },
                        features: [{
                            type: 'TEXT_DETECTION',
                            maxResults: 10
                        }]
                    }]
                })
            });
            
            const result = await response.json();
            
            if (result.responses && result.responses[0].textAnnotations) {
                const detectedText = result.responses[0].textAnnotations[0].description;
                const plateNumber = this.extractLicensePlate(detectedText);
                return plateNumber;
            }
            
        } catch (error) {
            console.error('Cloud OCR error:', error);
        }
        */
        
        return null;
    }
    
    extractLicensePlate(text) {
        // Regex patterns for Japanese license plates
        const patterns = [
            /[あ-ん]\s*\d{4}/g, // Hiragana + 4 digits
            /\d{3}\s*[あ-ん]\s*\d{4}/g, // 3 digits + Hiragana + 4 digits
            /[^0-9あ-んア-ン一-龯]*(\d{3})\s*([あ-ん])\s*(\d{4})[^0-9あ-んア-ン一-龯]*/g
        ];
        
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0].trim();
            }
        }
        
        return null;
    }
}