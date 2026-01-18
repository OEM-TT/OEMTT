# OEM TechTalk

A scalable, production-grade mobile application that provides accurate, source-grounded answers about specific OEM products, starting with HVAC equipment.

## 📋 Documentation

- **[MASTER_PLAN.md](./MASTER_PLAN.md)** - Complete technical specification and roadmap
- **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)** - Project structure and package details

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL 15+ (managed service recommended)
- Redis (managed service or local)
- iOS Simulator (Mac) or Android Studio (for mobile development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   # Install mobile app dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example env files
   cp .env.development.example .env.development
   cp backend/.env.development.example backend/.env.development

   # Edit with your actual values
   ```

3. **Set up the database:**
   ```bash
   cd backend
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Start backend API
   cd backend
   npm run dev

   # Terminal 2: Start mobile app
   npm start
   ```

## 📱 Mobile App

Built with:
- Expo SDK 52
- React Native
- TypeScript
- Expo Router (file-based routing)

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## 🔧 Backend API

Built with:
- Node.js + Express
- TypeScript
- Prisma (PostgreSQL + pgvector)
- Bull (job queues)
- OpenAI API
- Perplexity API

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## 🏗️ Project Structure

```
/
├── app/                    # Mobile app screens (Expo Router)
├── components/             # Reusable React Native components
├── services/               # API clients and external services
├── hooks/                  # Custom React hooks
├── context/                # React Context providers
├── utils/                  # Utility functions
├── types/                  # TypeScript types
├── assets/                 # Images, fonts, animations
└── backend/                # Backend API
    └── src/
        ├── config/         # Configuration
        ├── middleware/     # Express middleware
        ├── routes/         # API routes
        ├── controllers/    # Route handlers
        ├── services/       # Business logic
        ├── jobs/           # Background jobs
        ├── utils/          # Utilities
        └── db/             # Database schema & migrations
```

## 🔑 Core Principles

1. **Accuracy > Speed** - All answers grounded in OEM manuals
2. **Traceability** - Every answer cites its source
3. **Safety First** - Safety warnings always precede procedures
4. **Model-Agnostic** - All AI components are replaceable

## 🧪 Testing

```bash
# Mobile app tests
npm test

# Backend tests
cd backend
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 📦 Deployment

### Mobile App

Using EAS Build:
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both
eas build --platform all
```

### Backend API

Deploy to Railway, Render, or AWS:
```bash
cd backend
npm run build
npm start
```

## 🤝 Contributing

This is a private project. See MASTER_PLAN.md for development phases and roadmap.

## 📄 License

Proprietary - All rights reserved

## 📧 Contact

For questions or support, contact the development team.
