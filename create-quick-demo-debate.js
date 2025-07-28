const axios = require('axios');

async function createQuickDemo() {
  try {
    console.log('🚀 Creating quick demo debate...');
    
    // Create a debate with very short timing for demo purposes
    const createResponse = await axios.post('http://localhost:5000/api/debates', {
      motion: 'Social media has more positive than negative effects on society',
      type: 'oxford',
      participants: [],
      prepTime: 30000,      // 30 seconds prep time
      timePerSpeech: 45000, // 45 seconds per speech
      speakingOrder: ['proposition', 'opposition'],
      description: 'Quick demo debate with automated timing'
    });
    
    console.log('✅ Created demo debate:', createResponse.data.data.id);
    const debateId = createResponse.data.data.id;
    
    // Join as proposition
    await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'proposition',
      userId: 'demo-human-user'
    });
    console.log('✅ Joined as proposition');
    
    // Join as opposition (AI)
    await axios.post(`http://localhost:5000/api/debates/${debateId}/join`, {
      role: 'opposition',
      userId: 'demo-ai-agent'
    });
    console.log('✅ Joined as opposition (AI)');
    
    console.log(`\n🎯 Quick Demo Debate Ready!`);
    console.log(`📍 URL: http://localhost:3002/debates/${debateId}`);
    console.log(`⏱️  Prep Time: 30 seconds`);
    console.log(`🗣️  Speech Time: 45 seconds each`);
    console.log(`🤖 Full automation enabled`);
    
    console.log(`\n⚡ Quick Timeline:`);
    console.log(`1. Preparation: 30 seconds → Auto-start debate`);
    console.log(`2. Proposition: 45 seconds → Auto-switch`);
    console.log(`3. Opposition: 45 seconds → Auto-switch`);
    console.log(`4. Prop Rebuttal: 45 seconds → Auto-switch`);
    console.log(`5. Opp Rebuttal: 45 seconds → Auto-evaluate`);
    console.log(`6. Results: Instant evaluation`);
    
    console.log(`\n🎬 Total demo time: ~4 minutes`);
    
    return debateId;
    
  } catch (error) {
    console.log('❌ Demo creation failed:', error.response?.data || error.message);
    return null;
  }
}

createQuickDemo();
