const axios = require('axios');

async function testAPI() {
  console.log('🔍 Testing AI Debate Platform API...\n');

  // Test 1: Health Check
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health check:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Get Debates
  try {
    console.log('\n2. Testing GET /api/debates...');
    const getResponse = await axios.get('http://localhost:5000/api/debates');
    console.log('✅ GET debates:', getResponse.data);
  } catch (error) {
    console.log('❌ GET debates failed:', error.response?.data || error.message);
  }

  // Test 3: Create Debate
  try {
    console.log('\n3. Testing POST /api/debates...');
    const response = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Test debate from script - ' + new Date().toISOString(),
      type: 'oxford',
      participants: []
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ CREATE debate:', response.data);

    // Test 4: Get specific debate
    if (response.data.data && response.data.data.id) {
      console.log('\n4. Testing GET specific debate...');
      const specificDebate = await axios.get(`http://localhost:5000/api/debates/${response.data.data.id}`);
      console.log('✅ GET specific debate:', specificDebate.data);
    }

  } catch (error) {
    console.log('❌ CREATE debate failed:', error.response?.data || error.message);
  }

  console.log('\n🎯 API Test Complete!');
}

testAPI();
