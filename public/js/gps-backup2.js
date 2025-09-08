class GPSManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
        
        this.initializeGPS();
    }
    
    async initializeGPS() {
        try {
            if (!this.isGeolocationSupported()) {
                updateGPSStatus('GPS未対応');
                return;
            }
            
            updateGPSStatus('GPS許可要求中...');
            
            // Request permission first
            const permission = await this.requestPermission();
            
            if (permission) {
                this.startTracking();
            } else {
                updateGPSStatus('GPS許可が必要です');
            }
            
        } catch (error) {
            console.warn('GPS initialization error:', error);
            updateGPSStatus('GPS使用不可');
        }
    }
    
    async requestPermission() {
        try {
            const position = await this.getCurrentPosition();
            return position !== null;
        } catch (error) {
            console.error('GPS permission error:', error);
            return false;
        }
    }
    
    startTracking() {
        if (this.isTracking) {
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onPositionSuccess(position),
            (error) => this.onPositionError(error),
            options
        );
        
        this.isTracking = true;
    }
    
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
        updateGPSStatus('GPS停止');
    }
    
    onPositionSuccess(position) {
        this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
        };
        
        const accuracy = Math.round(position.coords.accuracy);
        const message = 'GPS取得成功 (精度: ' + accuracy + 'm)';
        updateGPSStatus(message);
        
        console.log('GPS Position updated:', this.currentPosition);
    }
    
    onPositionError(error) {
        console.error('GPS error:', error);
        
        let errorMessage = 'GPS取得エラー';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'GPS許可が拒否されました';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'GPS位置が取得できません';
                break;
            case error.TIMEOUT:
                errorMessage = 'GPSタイムアウト';
                break;
            default:
                errorMessage = 'GPS不明なエラー';
                break;
        }
        
        updateGPSStatus(errorMessage);
    }
    
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!this.isGeolocationSupported()) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date(position.timestamp).toISOString()
                    };
                    resolve(location);
                },
                (error) => {
                    console.error('Get current position error:', error);
                    resolve(this.currentPosition);
                },
                options
            );
        });
    }
    
    isGeolocationSupported() {
        return 'geolocation' in navigator;
    }
    
    formatCoordinates(lat, lng) {
        if (!lat || !lng) {
            return 'N/A';
        }
        
        const formatCoord = (coord) => {
            return coord.toFixed(6);
        };
        
        return formatCoord(lat) + ', ' + formatCoord(lng);
    }
    
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLng = this.degreesToRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    }
    
    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    async reverseGeocode(lat, lng) {
        try {
            return this.formatCoordinates(lat, lng);
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return this.formatCoordinates(lat, lng);
        }
    }
    
    exportLocationData() {
        return {
            currentPosition: this.currentPosition,
            isTracking: this.isTracking,
            isSupported: this.isGeolocationSupported(),
            timestamp: new Date().toISOString()
        };
    }
}

function updateGPSStatus(status) {
    const gpsStatusElement = document.querySelector('#gpsStatus .status-text');
    if (gpsStatusElement) {
        gpsStatusElement.textContent = status;
        
        const statusItem = document.getElementById('gpsStatus');
        statusItem.className = 'status-item';
        
        if (status.includes('成功')) {
            statusItem.classList.add('status-success');
        } else if (status.includes('エラー') || status.includes('失敗') || status.includes('拒否')) {
            statusItem.classList.add('status-error');
        } else if (status.includes('要求中') || status.includes('取得中')) {
            statusItem.classList.add('status-loading');
        }
    }
}