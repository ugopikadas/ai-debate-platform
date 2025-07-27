const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('Starting server...');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Debate Platform Backend'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AI Debate Platform Backend running on port ${PORT}`);
});
