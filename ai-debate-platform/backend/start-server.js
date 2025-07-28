// Direct server startup script
console.log('Starting AI Debate Platform Backend...');
console.log('Current working directory:', process.cwd());
console.log('Node.js version:', process.version);

try {
  // Load environment variables
  require('dotenv').config();
  console.log('Environment variables loaded');
  
  // Start the main application
  require('./src/index.js');
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
