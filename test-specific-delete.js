const axios = require('axios');

async function testSpecificDelete() {
  try {
    console.log('Testing delete with specific debate ID...');
    
    // First create a new debate to delete (so we don't delete the one in the browser)
    const createResponse = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Test debate for safe deletion',
      type: 'oxford',
      participants: []
    });
    
    const debateId = createResponse.data.data.id;
    console.log('✅ Created test debate:', debateId);
    
    // Test the delete endpoint
    const deleteResponse = await axios.delete(`http://localhost:5000/api/debates/${debateId}`);
    console.log('✅ Delete API response:', deleteResponse.data);
    
    // Also test what happens when we try to delete a non-existent debate
    try {
      await axios.delete('http://localhost:5000/api/debates/undefined');
      console.log('❌ Delete with "undefined" ID should have failed');
    } catch (error) {
      console.log('✅ Delete with "undefined" ID correctly failed:', error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testSpecificDelete();
