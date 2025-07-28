const axios = require('axios');

async function getValidDebate() {
  try {
    console.log('Getting a valid debate ID...');
    
    const response = await axios.get('http://localhost:5000/api/debates');
    
    if (response.data.success && response.data.data && response.data.data.length > 0) {
      const debate = response.data.data[0];
      console.log('✅ Found valid debate:');
      console.log(`   ID: ${debate.id}`);
      console.log(`   Motion: ${debate.motion}`);
      console.log(`   Status: ${debate.status}`);
      console.log(`   URL: http://localhost:3002/debates/${debate.id}`);
      return debate.id;
    } else {
      console.log('❌ No debates found');
      return null;
    }
  } catch (error) {
    console.log('❌ Failed to get debates:', error.response?.data || error.message);
    return null;
  }
}

getValidDebate();
