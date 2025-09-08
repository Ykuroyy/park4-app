const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create license_plates table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS license_plates (
        id SERIAL PRIMARY KEY,
        plate_number VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        accuracy DECIMAL(8, 2),
        confidence INTEGER DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_license_plates_timestamp 
      ON license_plates(timestamp DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_license_plates_plate_number 
      ON license_plates(plate_number);
    `);
    
    console.log('Database tables initialized successfully');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Database operations
class DatabaseManager {
  // Save a new license plate record
  async savePlate(plateData) {
    const client = await pool.connect();
    
    try {
      const { plateNumber, latitude, longitude, accuracy, confidence, timestamp } = plateData;
      
      const result = await client.query(`
        INSERT INTO license_plates (plate_number, latitude, longitude, accuracy, confidence, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [plateNumber, latitude, longitude, accuracy, confidence, timestamp || new Date()]);
      
      return result.rows[0];
      
    } catch (error) {
      console.error('Error saving plate:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get all license plates with pagination
  async getAllPlates(limit = 100, offset = 0) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          plate_number as "plateNumber",
          latitude,
          longitude,
          accuracy,
          confidence,
          timestamp,
          created_at as "createdAt"
        FROM license_plates
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2;
      `, [limit, offset]);
      
      const countResult = await client.query('SELECT COUNT(*) FROM license_plates;');
      const totalCount = parseInt(countResult.rows[0].count);
      
      return {
        plates: result.rows,
        total: totalCount,
        hasMore: offset + limit < totalCount
      };
      
    } catch (error) {
      console.error('Error getting plates:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Delete all license plates
  async clearAllPlates() {
    const client = await pool.connect();
    
    try {
      const result = await client.query('DELETE FROM license_plates;');
      return result.rowCount;
      
    } catch (error) {
      console.error('Error clearing plates:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Check for duplicate plates within a time window
  async checkDuplicate(plateNumber, timeWindowMinutes = 5) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id FROM license_plates
        WHERE plate_number = $1 
        AND timestamp > NOW() - INTERVAL '${timeWindowMinutes} minutes'
        LIMIT 1;
      `, [plateNumber]);
      
      return result.rows.length > 0;
      
    } catch (error) {
      console.error('Error checking duplicate:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get statistics
  async getStats() {
    const client = await pool.connect();
    
    try {
      const results = await Promise.all([
        client.query('SELECT COUNT(*) as total FROM license_plates;'),
        client.query('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM license_plates;'),
        client.query(`
          SELECT DATE_TRUNC('day', timestamp) as date, COUNT(*) as count
          FROM license_plates 
          WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('day', timestamp)
          ORDER BY date DESC;
        `)
      ]);
      
      return {
        total: parseInt(results[0].rows[0].total),
        oldest: results[1].rows[0].oldest,
        newest: results[1].rows[0].newest,
        dailyStats: results[2].rows
      };
      
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

// Export pool and manager
module.exports = {
  pool,
  initializeDatabase,
  DatabaseManager
};