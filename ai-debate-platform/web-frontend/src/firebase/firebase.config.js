// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyASELAAl0BrvnZDbiKIWEvLO9lrOdqpiLY",
  authDomain: "ai-debate-platform-93397.firebaseapp.com",
  projectId: "ai-debate-platform-93397",
  storageBucket: "ai-debate-platform-93397.firebasestorage.app",
  messagingSenderId: "468635489532",
  appId: "1:468635489532:android:5df6fcad83a57a2363f379",
  databaseURL: "https://ai-debate-platform-93397-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  client_id: '468635489532-kvon9khkq08paa1h2j3enh6sptm3vei1.apps.googleusercontent.com',
  prompt: 'select_account'
});

// Auth helper functions
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Email/Password Sign Up
const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
};

// Email/Password Sign In
const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

// Sign Out
const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export { 
  auth, 
  db, 
  storage, 
  googleProvider,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  signOutUser
};
export default app;
