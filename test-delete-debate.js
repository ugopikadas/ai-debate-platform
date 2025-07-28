const axios = require('axios');

async function testDeleteDebate() {
  try {
    console.log('Testing delete debate API...');
    
    // First create a debate to delete
    const createResponse = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Test debate for deletion',
      type: 'oxford',
      participants: []
    });
    
    console.log('✅ Created debate for deletion:', createResponse.data.data.id);
    
    const debateId = createResponse.data.data.id;
    
    // Now try to delete it
    const deleteResponse = await axios.delete(`http://localhost:5000/api/debates/${debateId}`, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log('✅ Delete successful:', deleteResponse.data);
    
    // Verify it's deleted by trying to get it
    try {
      await axios.get(`http://localhost:5000/api/debates/${debateId}`);
      console.log('❌ Debate still exists after deletion');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Debate successfully deleted (404 when trying to fetch)');
      } else {
        console.log('❌ Unexpected error when verifying deletion:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Delete test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNABORTED') {
      console.log('Request timed out - possible database issue');
    }
  }
}

testDeleteDebate();
