// Emergency GPS fix - Clean implementation
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
                this.updateStatus('GPS未対応');
                return;
            }
            this.updateStatus('GPS許可要求中...');
            const permission = await this.requestPermission();
            if (permission) {
                this.startTracking();
            } else {
                this.updateStatus('GPS許可が必要です');
            }
        } catch (error) {
            console.warn('GPS initialization error:', error);
            this.updateStatus('GPS使用不可');
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
        if (this.isTracking) return;
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.onSuccess(pos),
            (err) => this.onError(err),
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
        this.updateStatus('GPS停止');
    }
    
    onSuccess(position) {
        this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
        };
        const acc = Math.round(position.coords.accuracy);
        this.updateStatus('GPS取得成功 (精度: ' + acc + 'm)');
        console.log('GPS Position updated:', this.currentPosition);
    }
    
    onError(error) {
        console.error('GPS error:', error);
        let msg = 'GPS取得エラー';
        switch (error.code) {
            case error.PERMISSION_DENIED: msg = 'GPS許可が拒否されました'; break;
            case error.POSITION_UNAVAILABLE: msg = 'GPS位置が取得できません'; break;
            case error.TIMEOUT: msg = 'GPSタイムアウト'; break;
        }
        this.updateStatus(msg);
    }
    
    async getCurrentPosition() {
        return new Promise((resolve) => {
            if (!this.isGeolocationSupported()) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date(pos.timestamp).toISOString()
                }),
                () => resolve(this.currentPosition),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }
    
    isGeolocationSupported() {
        return 'geolocation' in navigator;
    }
    
    updateStatus(status) {
        if (typeof updateGPSStatus === 'function') {
            updateGPSStatus(status);
        }
    }
}

function updateGPSStatus(status) {
    const element = document.querySelector('#gpsStatus .status-text');
    if (element) {
        element.textContent = status;
        const item = document.getElementById('gpsStatus');
        if (item) {
            item.className = 'status-item';
            if (status.includes('成功')) item.classList.add('status-success');
            else if (status.includes('エラー') || status.includes('拒否')) item.classList.add('status-error');
            else if (status.includes('要求中')) item.classList.add('status-loading');
        }
    }
}