const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const analyzeRoutes = require('./routes/analyze');
const documentRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const policyRoutes = require('./routes/policies');
const errorHandler = require('./middleware/errorHandler');
const PolicyTemplate = require('./models/PolicyTemplate');
const DEFAULT_TEMPLATES = require('./services/policyTemplates');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/policies', policyRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'VEILiq' }));

const path = require('path');

// Error handler (must be last api middleware)
app.use(errorHandler);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Connect to MongoDB
const uri = "mongodb+srv://swas123:swas123@cluster0.nym0n.mongodb.net/privacylens?retryWrites=true&w=majority";
mongoose
  .connect(process.env.MONGO_URI || uri)
  .then(async () => {
    console.log('MongoDB connected');
    // Seed default policy templates if none exist
    const count = await PolicyTemplate.countDocuments();
    if (count === 0) {
      await PolicyTemplate.insertMany(DEFAULT_TEMPLATES);
      console.log(`Seeded ${DEFAULT_TEMPLATES.length} default policy templates.`);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`VEILiq API running on port ${PORT}`));

module.exports = app;
