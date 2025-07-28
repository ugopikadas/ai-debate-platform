const { admin, db, collections } = require('../firebase/config');

async function initializeFirestore() {
  try {
    console.log('🔥 Initializing Firestore database...');
    
    // Test if we can write to Firestore by creating a test document
    const testDoc = {
      initialized: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Firestore database initialized successfully'
    };
    
    // Try to create a test document in a system collection
    await db.collection('_system').doc('init').set(testDoc);
    console.log('✅ Successfully wrote test document to Firestore');
    
    // Create initial collections structure (this will create the collections)
    const collectionsToInit = [
      collections.USERS,
      collections.DEBATES,
      collections.AGENTS,
      collections.MESSAGES,
      collections.ANALYSIS,
      collections.SESSIONS,
      collections.FEEDBACK
    ];
    
    console.log('📁 Creating collection structure...');
    
    for (const collectionName of collectionsToInit) {
      try {
        // Create a placeholder document to initialize the collection
        const placeholderDoc = {
          _placeholder: true,
          created: admin.firestore.FieldValue.serverTimestamp(),
          note: 'This is a placeholder document to initialize the collection'
        };
        
        await db.collection(collectionName).doc('_placeholder').set(placeholderDoc);
        console.log(`✅ Initialized collection: ${collectionName}`);
      } catch (error) {
        console.log(`⚠️  Could not initialize collection ${collectionName}:`, error.message);
      }
    }
    
    console.log('🎉 Firestore initialization complete!');
    console.log('You can now create debates and use the application.');
    
  } catch (error) {
    console.error('❌ Error initializing Firestore:', error);
    console.error('This might mean:');
    console.error('1. Firestore database has not been created in Firebase Console');
    console.error('2. Service account permissions are insufficient');
    console.error('3. Firestore security rules are too restrictive');
    
    throw error;
  }
}

// Run the initialization
if (require.main === module) {
  initializeFirestore()
    .then(() => {
      console.log('✅ Initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeFirestore };
