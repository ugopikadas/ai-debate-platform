const axios = require('axios');

async function testSimpleJoin() {
  try {
    console.log('Testing simple join with a fresh debate...');
    
    // First create a new debate
    const createResponse = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Simple test debate for joining',
      type: 'oxford',
      participants: []
    });
    
    console.log('✅ Created debate:', createResponse.data.data.id);
    
    const debateId = createResponse.data.data.id;
    
    // Now try to join it
    const joinResponse = await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'proposition',
      userId: 'test-user-simple'
    }, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log('✅ Join successful:', joinResponse.data);
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNABORTED') {
      console.log('Request timed out - possible database issue');
    }
  }
}

testSimpleJoin();
