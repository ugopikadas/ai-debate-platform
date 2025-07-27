// Firebase configuration for AI Debate Platform
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Firebase configuration object
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Export the app instance
export default app;

// Collection names (matching backend)
export const COLLECTIONS = {
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

// Helper function to check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket
  );
};

// Development mode check
export const isDevelopment = process.env.NODE_ENV === 'development';

// Log configuration in development
if (isDevelopment) {
  console.log('Firebase initialized with project:', firebaseConfig.projectId);
  console.log('Firebase configuration status:', isFirebaseConfigured() ? '✅ Configured' : '❌ Missing configuration');
}
