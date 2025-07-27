const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  const path = require('path');
  serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
  logger.info('Successfully loaded Firebase service account');
} catch (error) {
  logger.error('Error loading Firebase service account:', error);
  throw new Error('Firebase service account configuration is required');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://ai-debate-platform-93397-default-rtdb.firebaseio.com",
      storageBucket: "ai-debate-platform-93397.firebasestorage.app"
    });
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

// Get Firestore instance
const db = getFirestore();
const auth = getAuth();

// Firestore collections
const collections = {
  USERS: 'users',
  DEBATES: 'debates',
  AGENTS: 'agents',
  MESSAGES: 'messages',
  ANALYSIS: 'analysis',
  SESSIONS: 'sessions',
  FEEDBACK: 'feedback',
  // Track B specific collections
  DEBATE_SESSIONS: 'debate_sessions',
  JUDGMENTS: 'judgments',
  CASE_PREPARATIONS: 'case_preparations',
  NOTE_TRACKING: 'note_tracking',
  REAL_TIME_FEEDBACK: 'real_time_feedback',
  PERFORMANCE_REPORTS: 'performance_reports',
  TRANSCRIPTS: 'transcripts'
};

// Helper functions for common operations
const dbHelpers = {
  // Create a new document with auto-generated ID
  async createDoc(collection, data) {
    const docRef = db.collection(collection).doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  },

  // Get document by ID
  async getDoc(collection, id) {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  // Update document
  async updateDoc(collection, id, data) {
    await db.collection(collection).doc(id).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  },

  // Delete document
  async deleteDoc(collection, id) {
    await db.collection(collection).doc(id).delete();
  },

  // Query documents
  async queryDocs(collection, filters = []) {
    let query = db.collection(collection);
    
    filters.forEach(filter => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Real-time listener
  onSnapshot(collection, callback, filters = []) {
    let query = db.collection(collection);
    
    filters.forEach(filter => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    return query.onSnapshot(callback);
  }
};

module.exports = {
  admin,
  db,
  auth,
  collections,
  dbHelpers
};
