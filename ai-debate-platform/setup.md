# AI Debate Platform Setup Guide

## 🚀 Quick Setup Instructions

### 1. **CRITICAL: Secure Your API Keys**
Before anything else, you must:
- **Revoke the exposed OpenAI API key** at [platform.openai.com](https://platform.openai.com)
- **Generate a new API key** with usage limits
- **Never share API keys in plaintext again**

### 2. **Environment Configuration**

#### Backend Setup:
```bash
cd backend

# Copy the environment template
cp .env.example .env

# Edit .env with your actual values:
# - Add your NEW OpenAI API key
# - Add your Gemini API key (if you have one)
# - Firebase service account key
```

Your `.env` file should look like this:
```bash
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Firebase Configuration (already configured for your project)
FIREBASE_PROJECT_ID=ai-debate-platform-93397
FIREBASE_DATABASE_URL=https://ai-debate-platform-93397-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=ai-debate-platform-93397.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"ai-debate-platform-93397",...}

# AI API Keys (REPLACE WITH YOUR ACTUAL KEYS)
OPENAI_API_KEY=your-new-openai-key-here
GEMINI_API_KEY=your-gemini-key-here

# Security
JWT_SECRET=your-random-jwt-secret-here
ENCRYPTION_KEY=your-random-encryption-key-here
```

### 3. **Firebase Setup**

#### Install Firebase CLI:
```bash
npm install -g firebase-tools
```

#### Login and Initialize:
```bash
firebase login
firebase use ai-debate-platform-93397
```

#### Deploy Security Rules:
```bash
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 4. **Install Dependencies**

#### Backend:
```bash
cd backend
npm install
```

#### Frontend:
```bash
cd ../web-frontend
npm install
```

### 5. **Generate Firebase Service Account Key**

1. Go to [Firebase Console](https://console.firebase.google.com/project/ai-debate-platform-93397)
2. Go to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file
5. Copy the entire JSON content and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY` in your `.env` file

### 6. **Start Development Servers**

#### Backend:
```bash
cd backend
npm run dev
```

#### Frontend:
```bash
cd web-frontend
npm start
```

## 🔒 Security Checklist

- [ ] Old OpenAI API key revoked
- [ ] New OpenAI API key generated with usage limits
- [ ] `.env` file created with actual values (never commit this)
- [ ] Firebase service account key added to `.env`
- [ ] Firebase security rules deployed
- [ ] All API keys stored securely in environment variables

## 🚨 Important Security Notes

1. **Never commit `.env` files** - they're in `.gitignore` for a reason
2. **Set usage limits** on your OpenAI API key to prevent unexpected charges
3. **Monitor your API usage** regularly
4. **Use different keys** for development and production
5. **Rotate keys periodically** for better security

## 🐛 Troubleshooting

### Common Issues:

**Firebase Permission Denied:**
- Check that security rules are deployed
- Verify user authentication is working
- Ensure Firebase project ID is correct

**API Key Errors:**
- Verify API key is correctly set in `.env`
- Check that the key has proper permissions
- Ensure no extra spaces or quotes around the key

**CORS Errors:**
- Check `FRONTEND_URL` in `.env` matches your frontend URL
- Verify Firebase hosting configuration

## 📞 Need Help?

If you encounter issues:
1. Check the console logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure Firebase project permissions are configured
4. Review the `SECURITY.md` file for best practices

Remember: Security first, functionality second!
