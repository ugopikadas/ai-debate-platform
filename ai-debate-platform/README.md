# AI-Powered Debate Platform

An intelligent debating system where AI agents are dynamically generated and trained based on debate motions, featuring real-time analysis, feedback, and evaluation.

## 🚀 Features

- **Dynamic AI Debaters**: AI agents generated and trained based on specific debate motions
- **Multi-AI Collaboration**: Integration with Gemini, Copilot, DeepSeek, and other AI tools
- **Real-time Analysis**: Live feedback, clash detection, and rebuttal evaluation
- **Cross-platform**: React web app and Flutter mobile app
- **Firebase Backend**: Scalable backend with real-time database
- **Live Debates**: Human vs AI or AI vs AI debate matches
- **Intelligent Scoring**: Automated evaluation of arguments and delivery

## 🏗️ Architecture

```
├── backend/                 # Node.js + Firebase backend
│   ├── src/
│   │   ├── agents/         # AI agent generation and management
│   │   ├── analysis/       # Real-time debate analysis
│   │   ├── firebase/       # Firebase configuration and services
│   │   ├── routes/         # API endpoints
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── firebase.json
├── web-frontend/           # React web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── mobile-frontend/        # Flutter mobile application
│   ├── lib/
│   │   ├── models/         # Data models
│   │   ├── screens/        # UI screens
│   │   ├── services/       # API services
│   │   └── widgets/        # Custom widgets
│   └── pubspec.yaml
└── shared/                 # Shared configurations and types
    ├── types/              # TypeScript type definitions
    └── config/             # Shared configuration files
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Firebase (Firestore, Functions, Auth)
- **Web Frontend**: React, TypeScript, Material-UI
- **Mobile Frontend**: Flutter, Dart
- **AI Integration**: OpenAI GPT, Google Gemini, GitHub Copilot, DeepSeek
- **Real-time**: Firebase Realtime Database, WebSockets
- **Authentication**: Firebase Auth

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Flutter SDK
- Firebase CLI
- Git

### Backend Setup
```bash
cd backend
npm install
firebase login
firebase init
npm run dev
```

### Web Frontend Setup
```bash
cd web-frontend
npm install
npm start
```

### Mobile Frontend Setup
```bash
cd mobile-frontend
flutter pub get
flutter run
```

## 📱 Features in Detail

### AI Agent Generation
- Dynamic personality and expertise assignment based on debate motion
- Training on motion-specific arguments and counterarguments
- Adaptive learning from debate interactions

### Real-time Analysis
- Argument strength evaluation
- Clash detection between opposing points
- Rebuttal quality assessment
- Speaking time and pace analysis

### Debate Flow
1. Motion selection and AI agent generation
2. Preparation phase with AI assistance
3. Live debate with real-time feedback
4. Post-debate analysis and scoring
5. Performance insights and improvement suggestions

## 🔧 Configuration

Create environment files for each component:
- `backend/.env` - Firebase config, AI API keys
- `web-frontend/.env` - Firebase web config
- `mobile-frontend/.env` - Firebase mobile config

## 📊 Database Schema

The platform uses Firebase Firestore with collections for:
- Users and authentication
- Debate sessions and metadata
- AI agents and their configurations
- Real-time messages and analysis
- Scoring and evaluation data

## 🤝 Contributing

This is an innovative platform pushing the boundaries of AI-human interaction in structured debates. Contributions welcome!

## 📄 License

MIT License - see LICENSE file for details.
