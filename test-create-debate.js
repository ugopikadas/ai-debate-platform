const axios = require('axios');

async function testCreateDebate() {
  try {
    console.log('Testing create debate API...');
    
    const response = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Test debate motion',
      type: 'oxford',
      participants: []
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Create debate successful:', response.data);
  } catch (error) {
    console.log('❌ Create debate failed:', error.response?.data || error.message);
  }
}

testCreateDebate();
