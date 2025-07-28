import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import toast from 'react-hot-toast';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
let app, auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization failed, running in demo mode:', error);
  // Create mock auth for demo mode
  auth = null;
}

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState(null);

  useEffect(() => {
    if (!auth) {
      // Demo mode - set a demo user
      const demoUser = {
        uid: 'demo-user-id',
        email: 'ugopikadas2003@gmail.com',
        displayName: 'Demo User',
        photoURL: null,
        emailVerified: true
      };
      setUser(demoUser);
      setIdToken('demo-token');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          });
        } catch (error) {
          console.error('Error getting ID token:', error);
          setUser(null);
          setIdToken(null);
        }
      } else {
        setUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Refresh token periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        try {
          const token = await auth.currentUser.getIdToken(true);
          setIdToken(token);
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }, 50 * 60 * 1000); // Refresh every 50 minutes

      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      setLoading(true);

      if (!auth) {
        // Demo mode - simulate login with realistic delay
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

        const demoUser = {
          uid: 'demo-user-id',
          email: email,
          displayName: 'Gopika Das',
          photoURL: null,
          emailVerified: true
        };
        setUser(demoUser);
        setIdToken('demo-token');
        toast.success('✅ Successfully logged in!');
        return { user: demoUser };
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully logged in!');
      return result;
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        default:
          message = error.message;
      }

      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      toast.success('Account created successfully!');
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      let message = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        default:
          message = error.message;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      if (!auth) {
        // Demo mode - simulate Google login with realistic delay
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        const demoUser = {
          uid: 'demo-user-google-id',
          email: 'ugopikadas2003@gmail.com',
          displayName: 'Gopika Das',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c', // Demo Google avatar
          emailVerified: true,
          providerData: [{
            providerId: 'google.com',
            uid: 'demo-google-uid',
            displayName: 'Gopika Das',
            email: 'ugopikadas2003@gmail.com',
            photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
          }]
        };
        setUser(demoUser);
        setIdToken('demo-google-token');
        toast.success('🎉 Successfully logged in with Google!');
        return { user: demoUser };
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      toast.success('Successfully logged in with Google!');
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      let message = 'Google login failed. Please try again.';

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          message = 'Login cancelled.';
          break;
        case 'auth/popup-blocked':
          message = 'Popup blocked. Please allow popups and try again.';
          break;
        default:
          message = error.message;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIdToken(null);
      toast.success('Successfully logged out!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      throw error;
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, updates);
        setUser(prev => ({ ...prev, ...updates }));
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile.');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    idToken,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
