class AppManager {
    constructor() {
        this.plateData = [];
        this.maxPlates = 100;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            // Check browser compatibility
            this.checkCompatibility();
            
            // Initialize managers
            window.gpsManager = new GPSManager();
            window.ocrManager = new OCRManager();
            window.cameraManager = new CameraManager();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load existing data
            await this.loadExistingData();
            
            console.log('Park4 app initialized successfully');
            
        } catch (error) {
            console.error('App initialization error:', error);
            showNotification('アプリの初期化に失敗しました', 'error');
        }
    }
    
    checkCompatibility() {
        const issues = [];
        
        // Check camera support
        if (!CameraManager.isSupported()) {
            issues.push('カメラがサポートされていません');
        }
        
        // Check GPS support
        if (!window.gpsManager || !window.gpsManager.isGeolocationSupported()) {
            issues.push('GPS機能がサポートされていません');
        }
        
        // Check localStorage support
        if (!this.isLocalStorageSupported()) {
            issues.push('ローカルストレージがサポートされていません');
        }
        
        if (issues.length > 0) {
            showNotification(`互換性の問題: ${issues.join(', ')}`, 'warning');
        }
    }
    
    setupEventListeners() {
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToExcel();
        });
        
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearAllData();
        });
        
        // Notification close button
        document.getElementById('notificationClose').addEventListener('click', () => {
            hideNotification();
        });
        
        // Handle app visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Handle beforeunload to save data
        window.addEventListener('beforeunload', () => {
            this.saveDataToLocalStorage();
        });
    }
    
    async loadExistingData() {
        try {
            const response = await fetch('/api/plates');
            const result = await response.json();
            
            if (result.success) {
                this.plateData = result.data || [];
                this.updateUI();
            }
            
        } catch (error) {
            console.error('Error loading existing data:', error);
            // Try to load from localStorage as fallback
            this.loadDataFromLocalStorage();
        }
    }
    
    addPlateToList(plateInfo) {
        // Check for duplicates (within 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isDuplicate = this.plateData.some(plate => 
            plate.plateNumber === plateInfo.plateNumber && 
            new Date(plate.timestamp) > fiveMinutesAgo
        );
        
        if (isDuplicate) {
            showNotification('重複するナンバープレートが検出されました', 'warning');
            return;
        }
        
        // Check if we've reached the maximum
        if (this.plateData.length >= this.maxPlates) {
            showNotification('最大台数 (100台) に達しました', 'warning');
            return;
        }
        
        this.plateData.push(plateInfo);
        this.updateUI();
        this.saveDataToLocalStorage();
    }
    
    updateUI() {
        this.updatePlateCounter();
        this.renderPlateList();
    }
    
    updatePlateCounter(count) {
        const counter = document.getElementById('plateCount');
        const actualCount = count !== undefined ? count : this.plateData.length;
        counter.textContent = actualCount;
        
        // Add visual indication when approaching limit
        if (actualCount >= 90) {
            counter.style.color = '#f44336';
        } else if (actualCount >= 70) {
            counter.style.color = '#FF9800';
        } else {
            counter.style.color = 'inherit';
        }
    }
    
    renderPlateList() {
        const listContainer = document.getElementById('plateList');
        
        if (this.plateData.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚗</div>
                    <p>まだナンバープレートが検出されていません</p>
                    <p>カメラを起動して駐車場を撮影してください</p>
                </div>
            `;
            return;
        }
        
        // Sort by timestamp (newest first)
        const sortedData = [...this.plateData].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        listContainer.innerHTML = sortedData.map(plate => 
            this.createPlateItemHTML(plate)
        ).join('');
    }
    
    createPlateItemHTML(plate) {
        const timestamp = new Date(plate.timestamp);
        const formattedTime = timestamp.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const location = plate.latitude && plate.longitude 
            ? `${plate.latitude.toFixed(6)}, ${plate.longitude.toFixed(6)}`
            : 'N/A';
            
        const confidence = plate.confidence || 0;
        
        return `
            <div class="plate-item">
                <div class="plate-info">
                    <div class="plate-number">${plate.plateNumber}</div>
                    <div class="plate-details">
                        <div class="plate-timestamp">
                            🕐 ${formattedTime}
                        </div>
                        <div class="plate-location">
                            📍 ${location}
                        </div>
                    </div>
                </div>
                <div class="plate-confidence">
                    ✓ ${confidence}%
                </div>
            </div>
        `;
    }
    
    async exportToExcel() {
        try {
            if (this.plateData.length === 0) {
                showNotification('エクスポートするデータがありません', 'warning');
                return;
            }
            
            showLoading('Excel ファイルを生成中...');
            
            const response = await fetch('/api/export/excel');
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const filename = `parking_data_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            hideLoading();
            showNotification('Excel ファイルをダウンロードしました', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            hideLoading();
            showNotification('エクスポートに失敗しました', 'error');
        }
    }
    
    async clearAllData() {
        if (!confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            return;
        }
        
        try {
            showLoading('データを削除中...');
            
            const response = await fetch('/api/plates', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.plateData = [];
                this.updateUI();
                this.clearLocalStorage();
                
                hideLoading();
                showNotification('すべてのデータを削除しました', 'success');
            } else {
                throw new Error('Clear failed');
            }
            
        } catch (error) {
            console.error('Clear error:', error);
            hideLoading();
            showNotification('データの削除に失敗しました', 'error');
        }
    }
    
    // Local storage methods for offline support
    saveDataToLocalStorage() {
        try {
            localStorage.setItem('park4_plate_data', JSON.stringify(this.plateData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    loadDataFromLocalStorage() {
        try {
            const data = localStorage.getItem('park4_plate_data');
            if (data) {
                this.plateData = JSON.parse(data);
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('park4_plate_data');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }
    
    isLocalStorageSupported() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // App is hidden, save data
            this.saveDataToLocalStorage();
        } else {
            // App is visible again, reload data if needed
            // This could be enhanced to sync with server
        }
    }
    
    // Get app statistics
    getStats() {
        return {
            totalPlates: this.plateData.length,
            remainingCapacity: this.maxPlates - this.plateData.length,
            oldestEntry: this.plateData.length > 0 ? 
                new Date(Math.min(...this.plateData.map(p => new Date(p.timestamp)))) : null,
            newestEntry: this.plateData.length > 0 ? 
                new Date(Math.max(...this.plateData.map(p => new Date(p.timestamp)))) : null
        };
    }
}

// Global utility functions
function showLoading(message = '処理中...') {
    const loadingElement = document.getElementById('loading');
    const loadingText = document.querySelector('.loading-text');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'none';
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'none';
}

function updateRecognitionStatus(status) {
    const recognitionStatusElement = document.querySelector('#recognitionStatus .status-text');
    if (recognitionStatusElement) {
        recognitionStatusElement.textContent = status;
        
        // Add visual indicators
        const statusItem = document.getElementById('recognitionStatus');
        statusItem.className = 'status-item';
        
        if (status.includes('検出') || status.includes('成功')) {
            statusItem.classList.add('status-success');
        } else if (status.includes('エラー')) {
            statusItem.classList.add('status-error');
        } else if (status.includes('解析中') || status.includes('認識中')) {
            statusItem.classList.add('status-loading');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});