# 🔐 Google Login Setup Guide

## Current Status
✅ **Google Login is WORKING in Demo Mode**
- Click "Continue with Google" on login page
- Automatically logs in as demo user
- No additional setup required for demonstration

## For Real Google Authentication

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `ai-debate-platform`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Click **Google** provider
5. Click **Enable**
6. Set project support email
7. Click **Save**

### Step 3: Get Firebase Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web app** icon (`</>`)
4. Register app name: `ai-debate-platform-web`
5. Copy the configuration object

### Step 4: Update Environment Variables
Replace the demo values in `ai-debate-platform/web-frontend/.env`:

```env
# Firebase Configuration - REAL
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
```

### Step 5: Configure Authorized Domains
1. In Firebase Console → Authentication → Settings
2. Go to **Authorized domains**
3. Add your domains:
   - `localhost` (for development)
   - Your production domain

### Step 6: Test Real Google Login
1. Restart the frontend server: `npm start`
2. Go to http://localhost:3002/login
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. Should redirect to dashboard with real Google account

## Demo Mode vs Real Mode

### Demo Mode (Current)
- ✅ Works immediately
- ✅ No Firebase setup required
- ✅ Perfect for demonstration
- ✅ Uses demo user data
- ⚠️ No real Google authentication

### Real Mode (After Setup)
- ✅ Real Google OAuth
- ✅ Actual user accounts
- ✅ Persistent login sessions
- ✅ Real user data
- ⚠️ Requires Firebase project setup

## Troubleshooting

### Common Issues
1. **"Firebase not initialized"** → Check environment variables
2. **"Unauthorized domain"** → Add domain to Firebase authorized domains
3. **"Popup blocked"** → Allow popups in browser
4. **"Invalid API key"** → Verify API key in Firebase console

### Support
- Firebase Documentation: https://firebase.google.com/docs/auth
- Google Sign-In Guide: https://firebase.google.com/docs/auth/web/google-signin

## Current Demo Login
🎯 **Ready to use right now:**
1. Go to http://localhost:3002/login
2. Click "Continue with Google"
3. Automatically logs in as Gopika Das
4. Redirects to dashboard
5. Full platform access granted

**No additional setup required for demonstration!** 🚀
