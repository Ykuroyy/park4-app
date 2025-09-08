class GPSManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
        
        this.initializeGPS();
    }
    
    async initializeGPS() {
        if (!this.isGeolocationSupported()) {
            updateGPSStatus('GPS未対応');
            return;
        }
        
        try {
            updateGPSStatus('GPS許可要求中...');
            
            // Request permission first
            const permission = await this.requestPermission();
            
            if (permission) {
                this.startTracking();
            } else {
                updateGPSStatus('GPS許可が必要です');
            }
            
        } catch (error) {
            console.error('GPS initialization error:', error);
            updateGPSStatus('GPS初期化エラー');
        }
    }
    
    async requestPermission() {
        try {
            // Try to get current position to check permissions
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
            maximumAge: 60000 // Use cached position if less than 1 minute old
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
        updateGPSStatus(`GPS取得成功 (精度: ${accuracy}m)`);\n        
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
                    resolve(this.currentPosition); // Return last known position if available
                },
                options
            );
        });
    }
    
    isGeolocationSupported() {
        return 'geolocation' in navigator;
    }
    
    // Format coordinates for display
    formatCoordinates(lat, lng) {
        if (!lat || !lng) {
            return 'N/A';
        }
        
        const formatCoord = (coord) => {
            return coord.toFixed(6);
        };
        
        return `${formatCoord(lat)}, ${formatCoord(lng)}`;
    }
    
    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLng = this.degreesToRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // Return distance in meters
    }
    
    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    // Get address from coordinates (reverse geocoding)
    async reverseGeocode(lat, lng) {
        try {
            // This would typically use Google Maps API or similar service
            // For now, return formatted coordinates
            return this.formatCoordinates(lat, lng);
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return this.formatCoordinates(lat, lng);
        }
    }
    
    // Export location data for debugging
    exportLocationData() {
        return {
            currentPosition: this.currentPosition,
            isTracking: this.isTracking,
            isSupported: this.isGeolocationSupported(),
            timestamp: new Date().toISOString()
        };
    }
}

// Global utility functions for GPS status updates
function updateGPSStatus(status) {
    const gpsStatusElement = document.querySelector('#gpsStatus .status-text');
    if (gpsStatusElement) {
        gpsStatusElement.textContent = status;
        
        // Add visual indicators based on status
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