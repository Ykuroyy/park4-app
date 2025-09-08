class CameraManager {
    constructor() {
        try {
            this.videoElement = document.getElementById('videoElement');
            this.canvas = document.getElementById('canvas');
            this.ctx = this.canvas?.getContext('2d') || null;
            this.stream = null;
            this.isRecording = false;
            this.captureInterval = null;
            
            this.initializeElements();
            this.setupEventListeners();
        } catch (error) {
            console.error('CameraManager initialization error:', error);
            // Continue without camera functionality
        }
    }
    
    initializeElements() {
        try {
            this.startBtn = document.getElementById('startBtn');
            this.stopBtn = document.getElementById('stopBtn');
            this.captureBtn = document.getElementById('captureBtn');
        } catch (error) {
            console.error('Camera elements not found:', error);
        }
    }
    
    setupEventListeners() {
        try {
            if (this.startBtn) {
                this.startBtn.addEventListener('click', () => this.startCamera());
            }
            if (this.stopBtn) {
                this.stopBtn.addEventListener('click', () => this.stopCamera());
            }
            if (this.captureBtn) {
                this.captureBtn.addEventListener('click', () => this.captureFrame());
            }
        } catch (error) {
            console.error('Camera event listener setup failed:', error);
        }
    }
    
    async startCamera() {
        try {
            showLoading('カメラを起動中...');
            
            const constraints = {
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = resolve;
            });
            
            // Set canvas size to match video
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
            
            this.isRecording = true;
            this.updateUI();
            
            // Start automatic capturing every 2 seconds
            this.startAutomaticCapture();
            
            hideLoading();
            showNotification('カメラが開始されました', 'success');
            updateRecognitionStatus('自動認識中...');
            
        } catch (error) {
            console.error('Camera access error:', error);
            hideLoading();
            
            let errorMessage = 'カメラにアクセスできません';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'カメラの許可が必要です。ブラウザの設定を確認してください。';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'カメラが見つかりません。';
            }
            
            showNotification(errorMessage, 'error');
            updateRecognitionStatus('エラー');
        }
    }
    
    stopCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            this.videoElement.srcObject = null;
            this.isRecording = false;
            this.stopAutomaticCapture();
            this.updateUI();
            
            showNotification('カメラが停止されました', 'success');
            updateRecognitionStatus('待機中');
            
        } catch (error) {
            console.error('Error stopping camera:', error);
            showNotification('カメラの停止中にエラーが発生しました', 'error');
        }
    }
    
    startAutomaticCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
        }
        
        this.captureInterval = setInterval(() => {
            if (this.isRecording) {
                this.captureFrame();
            }
        }, 2000); // Capture every 2 seconds
    }
    
    stopAutomaticCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
    }
    
    captureFrame() {
        if (!this.isRecording || !this.videoElement.videoWidth) {
            return;
        }
        
        try {
            // Draw current video frame to canvas
            this.ctx.drawImage(
                this.videoElement, 
                0, 0, 
                this.canvas.width, 
                this.canvas.height
            );
            
            // Get image data
            const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
            
            // Process with OCR
            if (window.ocrManager) {
                window.ocrManager.processImage(imageData);
            }
            
        } catch (error) {
            console.error('Error capturing frame:', error);
        }
    }
    
    updateUI() {
        if (this.isRecording) {
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';
            this.captureBtn.style.display = 'inline-flex';
        } else {
            this.startBtn.style.display = 'inline-flex';
            this.stopBtn.style.display = 'none';
            this.captureBtn.style.display = 'none';
        }
    }
    
    // Check if camera is supported
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    // Request camera permission
    static async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Permission denied:', error);
            return false;
        }
    }
}