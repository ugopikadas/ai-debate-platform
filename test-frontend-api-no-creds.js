const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('Testing frontend API without credentials...');
    
    // Test without withCredentials
    const api = axios.create({
      baseURL: 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    const response = await api.post('/debates', {
      motion: 'Test debate from frontend config',
      description: 'Test description',
      format: 'oxford',
      timePerSpeech: 180000,
      maxParticipants: 2,
      isPublic: false,
      hasAIParticipant: true,
      aiDifficulty: 'intermediate'
    });
    
    console.log('✅ Frontend API test successful:', response.data);
  } catch (error) {
    console.log('❌ Frontend API test failed:', error.response?.data || error.message);
    console.log('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code
    });
  }
}

testFrontendAPI();
