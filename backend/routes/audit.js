const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the audit directory exists
const auditDir = path.join(__dirname, '../audit');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, auditDir);
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `VEILiq_Trust_Report_${timestamp}.pdf`);
  }
});

const upload = multer({ storage: storage });

// POST endpoint to save the audit report
router.post('/save', upload.single('report'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({
      success: true,
      message: 'Report saved to audit folder successfully',
      filePath: req.file.path
    });
  } catch (error) {
    console.error('Error saving audit report:', error);
    res.status(500).json({ success: false, message: 'Server error saving report' });
  }
});

module.exports = router;
