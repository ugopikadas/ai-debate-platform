const axios = require('axios');

async function testAutomatedDebate() {
  try {
    console.log('🚀 Testing automated debate with timing...');
    
    // Create a new debate with timing settings
    const createResponse = await axios.post('http://localhost:5000/api/debates', {
      motion: 'AI will revolutionize education in the next decade',
      type: 'oxford',
      participants: [],
      prepTime: 120000, // 2 minutes prep time for testing
      timePerSpeech: 60000, // 1 minute per speech for testing
      speakingOrder: ['proposition', 'opposition']
    });
    
    console.log('✅ Created automated debate:', createResponse.data.data.id);
    const debateId = createResponse.data.data.id;
    
    // Join as proposition
    const joinProp = await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'proposition',
      userId: 'human-user-123'
    });
    console.log('✅ Joined as proposition');
    
    // Join as opposition (AI)
    const joinOpp = await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'opposition',
      userId: 'ai-agent-456'
    });
    console.log('✅ Joined as opposition (AI)');
    
    console.log(`\n🎯 Debate created successfully!`);
    console.log(`📍 URL: http://localhost:3002/debates/${debateId}`);
    console.log(`⏱️  Prep Time: 2 minutes`);
    console.log(`🗣️  Speech Time: 1 minute each`);
    console.log(`🤖 Automation: Enabled`);
    
    console.log(`\n📋 Timeline:`);
    console.log(`1. Preparation phase: 2 minutes (auto-transition)`);
    console.log(`2. Proposition speech: 1 minute (auto-transition)`);
    console.log(`3. Opposition speech: 1 minute (auto-transition)`);
    console.log(`4. Proposition rebuttal: 1 minute (auto-transition)`);
    console.log(`5. Opposition rebuttal: 1 minute (auto-transition)`);
    console.log(`6. Evaluation phase: Auto-generated results`);
    
    return debateId;
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return null;
  }
}

testAutomatedDebate();
