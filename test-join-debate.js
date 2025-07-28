const axios = require('axios');

async function testJoinDebate() {
  try {
    console.log('Testing join debate API...');
    
    const debateId = 'owj5OrFtyxWrcebL7nPm'; // Using a valid debate ID
    const response = await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'opposition',
      userId: 'test-user-456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Join debate successful:', response.data);
  } catch (error) {
    console.log('❌ Join debate failed:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

testJoinDebate();
