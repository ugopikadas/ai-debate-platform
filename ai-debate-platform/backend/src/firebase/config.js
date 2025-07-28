const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load from environment variables first (production/demo mode)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: "demo-key-id",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: "demo-client-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    };
    logger.info('Successfully loaded Firebase service account from environment');
  } else {
    // Fallback to service account file (local development)
    const path = require('path');
    serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
    logger.info('Successfully loaded Firebase service account from file');
  }
} catch (error) {
  logger.warn('Firebase service account not available, running in demo mode:', error.message);
  // Create a mock service account for demo purposes
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "ai-debate-demo",
    private_key_id: "demo-key-id",
    private_key: "-----BEGIN PRIVATE KEY-----\nDEMO_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    client_email: "demo@ai-debate-demo.iam.gserviceaccount.com",
    client_id: "demo-client-id",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
  };
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://ai-debate-demo-default-rtdb.firebaseio.com",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ai-debate-demo.firebasestorage.app"
    });
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    // Don't throw error in demo mode, just log it
    logger.warn('Running in demo mode without Firebase connection');
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
