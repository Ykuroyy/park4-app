// 環境変数の読み込み
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const ExcelJS = require('exceljs');
const { initializeDatabase, DatabaseManager, useDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database manager
const dbManager = new DatabaseManager();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// OCR routes
const ocrRoutes = require('./routes/ocr');
app.use('/api/ocr', ocrRoutes);

// Storage configuration for multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to save license plate data
app.post('/api/save-plate', async (req, res) => {
  try {
    const { plateNumber, location, timestamp, confidence } = req.body;
    
    if (!plateNumber) {
      return res.status(400).json({ error: 'License plate number is required' });
    }

    // Check for duplicates
    const isDuplicate = await dbManager.checkDuplicate(plateNumber.toUpperCase());
    if (isDuplicate) {
      return res.status(409).json({ 
        error: 'Duplicate license plate detected within 5 minutes',
        duplicate: true 
      });
    }

    const plateData = {
      plateNumber: plateNumber.toUpperCase(),
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      accuracy: location?.accuracy || null,
      timestamp: timestamp || new Date().toISOString(),
      confidence: confidence || 0
    };

    const savedPlate = await dbManager.savePlate(plateData);
    const stats = await dbManager.getStats();
    
    res.json({ 
      success: true, 
      message: 'License plate saved successfully',
      data: savedPlate,
      totalCount: stats.total
    });
  } catch (error) {
    console.error('Error saving plate data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all license plate data
app.get('/api/plates', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const result = await dbManager.getAllPlates(limit, offset);
    
    res.json({ 
      success: true, 
      data: result.plates,
      count: result.plates.length,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit
    });
  } catch (error) {
    console.error('Error getting plates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to clear all data
app.delete('/api/plates', async (req, res) => {
  try {
    const deletedCount = await dbManager.clearAllPlates();
    res.json({ 
      success: true, 
      message: 'All data cleared',
      deletedCount 
    });
  } catch (error) {
    console.error('Error clearing plates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to export data to Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const result = await dbManager.getAllPlates(10000, 0); // Get all data for export
    
    if (result.plates.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('License Plates');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'License Plate', key: 'plateNumber', width: 15 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Accuracy (m)', key: 'accuracy', width: 12 },
      { header: 'Confidence (%)', key: 'confidence', width: 12 },
      { header: 'Detection Time', key: 'timestamp', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    // Add data
    result.plates.forEach(plate => {
      worksheet.addRow({
        ...plate,
        timestamp: new Date(plate.timestamp).toLocaleString('ja-JP'),
        createdAt: new Date(plate.createdAt).toLocaleString('ja-JP')
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers for file download
    const filename = `parking_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database tables (will fallback to memory if no DB)
    await initializeDatabase();
    
    if (useDatabase) {
      console.log('✅ Database initialized successfully');
    } else {
      console.log('⚠️  Running in memory-only mode (no database)');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Park4 app running on port ${PORT}`);
      console.log(`📱 Access the app at: http://localhost:${PORT}`);
      console.log(`💾 Database mode: ${useDatabase ? 'PostgreSQL' : 'Memory'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.log('🔄 Attempting to start in memory-only mode...');
    
    // Try to start without database
    app.listen(PORT, () => {
      console.log(`🚀 Park4 app running on port ${PORT} (memory mode)`);
      console.log(`📱 Access the app at: http://localhost:${PORT}`);
    });
  }
}

startServer();