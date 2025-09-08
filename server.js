const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Storage configuration for multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// In-memory storage for license plate data
let licensePlateData = [];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to save license plate data
app.post('/api/save-plate', (req, res) => {
  try {
    const { plateNumber, location, timestamp, confidence } = req.body;
    
    if (!plateNumber) {
      return res.status(400).json({ error: 'License plate number is required' });
    }

    const plateData = {
      id: Date.now(),
      plateNumber: plateNumber.toUpperCase(),
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      timestamp: timestamp || new Date().toISOString(),
      confidence: confidence || 0
    };

    licensePlateData.push(plateData);
    
    res.json({ 
      success: true, 
      message: 'License plate saved successfully',
      data: plateData,
      totalCount: licensePlateData.length
    });
  } catch (error) {
    console.error('Error saving plate data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all license plate data
app.get('/api/plates', (req, res) => {
  res.json({ 
    success: true, 
    data: licensePlateData,
    count: licensePlateData.length
  });
});

// API endpoint to clear all data
app.delete('/api/plates', (req, res) => {
  licensePlateData = [];
  res.json({ success: true, message: 'All data cleared' });
});

// API endpoint to export data to Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('License Plates');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'License Plate', key: 'plateNumber', width: 15 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Confidence', key: 'confidence', width: 12 }
    ];

    // Add data
    licensePlateData.forEach(plate => {
      worksheet.addRow(plate);
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

// Start server
app.listen(PORT, () => {
  console.log(`Park4 app running on port ${PORT}`);
  console.log(`Access the app at: http://localhost:${PORT}`);
});