# Security Guidelines for AI Debate Platform

## 🚨 CRITICAL: API Key Security

### Immediate Action Required
If you've accidentally exposed an API key:
1. **Revoke the key immediately** in your provider's dashboard
2. **Generate a new key**
3. **Update your environment variables**
4. **Check git history** for any committed keys and remove them

### Proper API Key Management

#### 1. Environment Variables
- Store all API keys in `.env` files (never commit these)
- Use the provided `.env.example` as a template
- Set environment variables in production deployment

#### 2. Local Development Setup
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual keys
# OPENAI_API_KEY=your-actual-key-here
# GEMINI_API_KEY=your-actual-key-here
```

#### 3. Production Deployment
- Use your hosting platform's environment variable settings
- For Firebase Functions: `firebase functions:config:set openai.key="your-key"`
- For other platforms: Set via dashboard or CLI

## 🔒 Security Best Practices

### API Security
- **Rate limiting**: Implement strict rate limits on AI API calls
- **Input validation**: Sanitize all user inputs
- **Authentication**: Verify user tokens on all protected routes
- **CORS**: Configure proper CORS origins for production

### Firebase Security
- **Firestore Rules**: Implement proper read/write rules
- **Storage Rules**: Secure file upload/download permissions
- **Authentication**: Use Firebase Auth for user management

### Code Security
- **Dependencies**: Regularly update packages for security patches
- **Secrets scanning**: Use tools to scan for accidentally committed secrets
- **Error handling**: Don't expose sensitive information in error messages

## 🛡️ Monitoring & Alerts

### Set up monitoring for:
- Unusual API usage patterns
- Failed authentication attempts
- High error rates
- Unexpected traffic spikes

## 📋 Security Checklist

- [ ] All API keys stored in environment variables
- [ ] `.env` files added to `.gitignore`
- [ ] Firebase security rules implemented
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Error messages sanitized
- [ ] Dependencies updated
- [ ] Security monitoring enabled

## 🚫 Never Do This

```javascript
// ❌ NEVER hardcode API keys
const openai = new OpenAI({
  apiKey: "sk-proj-actual-key-here"
});

// ❌ NEVER commit .env files
// ❌ NEVER log API keys
console.log("API Key:", process.env.OPENAI_API_KEY);

// ❌ NEVER expose keys in client-side code
```

## ✅ Always Do This

```javascript
// ✅ Use environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Validate environment variables exist
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// ✅ Use secure error handling
try {
  // API call
} catch (error) {
  logger.error('API call failed', { error: error.message }); // Don't log the full error
  res.status(500).json({ error: 'Internal server error' });
}
```

## 📞 Incident Response

If a security incident occurs:
1. **Immediately revoke** all potentially compromised keys
2. **Generate new keys** and update environment variables
3. **Review logs** for unauthorized usage
4. **Monitor accounts** for unexpected charges
5. **Update security measures** to prevent recurrence

Remember: Security is not optional - it's essential for protecting your application and users.
