const axios = require('axios');

async function getDebates() {
  try {
    console.log('Getting list of debates...');
    
    const response = await axios.get('http://localhost:5000/api/debates');
    
    console.log('✅ Debates found:');
    if (response.data.success && response.data.data) {
      response.data.data.forEach((debate, index) => {
        console.log(`${index + 1}. ID: ${debate.id}`);
        console.log(`   Motion: ${debate.motion}`);
        console.log(`   Status: ${debate.status}`);
        console.log(`   Participants: ${debate.participants?.length || 0}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Failed to get debates:', error.response?.data || error.message);
  }
}

getDebates();
