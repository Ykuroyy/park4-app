// In-memory storage fallback for when database is not available
class MemoryStore {
  constructor() {
    this.licensePlateData = [];
    this.nextId = 1;
  }

  // Save a new license plate record
  async savePlate(plateData) {
    const plate = {
      id: this.nextId++,
      plateNumber: plateData.plateNumber,
      latitude: plateData.latitude,
      longitude: plateData.longitude,
      accuracy: plateData.accuracy,
      confidence: plateData.confidence,
      timestamp: plateData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.licensePlateData.push(plate);
    return plate;
  }

  // Get all license plates with pagination
  async getAllPlates(limit = 100, offset = 0) {
    const sortedData = [...this.licensePlateData].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const plates = sortedData.slice(offset, offset + limit);
    const total = this.licensePlateData.length;

    return {
      plates,
      total,
      hasMore: offset + limit < total
    };
  }

  // Delete all license plates
  async clearAllPlates() {
    const count = this.licensePlateData.length;
    this.licensePlateData = [];
    this.nextId = 1;
    return count;
  }

  // Check for duplicate plates within a time window
  async checkDuplicate(plateNumber, timeWindowMinutes = 5) {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    return this.licensePlateData.some(plate => 
      plate.plateNumber === plateNumber && 
      new Date(plate.timestamp) > cutoffTime
    );
  }

  // Get statistics
  async getStats() {
    if (this.licensePlateData.length === 0) {
      return {
        total: 0,
        oldest: null,
        newest: null,
        dailyStats: []
      };
    }

    const timestamps = this.licensePlateData.map(p => new Date(p.timestamp));
    const oldest = new Date(Math.min(...timestamps));
    const newest = new Date(Math.max(...timestamps));

    // Group by day for daily stats
    const dailyGroups = {};
    this.licensePlateData.forEach(plate => {
      const day = new Date(plate.timestamp).toISOString().split('T')[0];
      dailyGroups[day] = (dailyGroups[day] || 0) + 1;
    });

    const dailyStats = Object.entries(dailyGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7); // Last 7 days

    return {
      total: this.licensePlateData.length,
      oldest: oldest.toISOString(),
      newest: newest.toISOString(),
      dailyStats
    };
  }
}

module.exports = MemoryStore;