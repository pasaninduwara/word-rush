# 🎮 Word Rush - Multiplayer Word Game

## Complete Setup Guide for Free Hosting

This document explains how to deploy your Word Rush game to free hosting services.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Free Hosting Options](#free-hosting-options)
3. [Database Setup (Free)](#database-setup-free)
4. [Deployment Steps](#deployment-steps)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

Word Rush is a real-time multiplayer word game where players:
- Fill 6 categories with words starting from a selected letter
- Compete in real-time with friends
- Vote on each other's answers
- Score points for unique and valid words

**Tech Stack:**
- Frontend: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS, shadcn/ui
- Database: SQLite (local) / PostgreSQL (production)
- Real-time: Socket.io
- Authentication: Custom with bcryptjs

---

## 🌐 Free Hosting Options

### Recommended: Railway.app (Best for Full-Stack Apps)

**Pros:**
- Free tier with $5/month credits
- Supports Node.js, PostgreSQL, and WebSockets
- Automatic deployments from GitHub
- Easy environment variable management

**Steps:**
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add PostgreSQL database add-on
4. Set environment variables
5. Deploy!

### Alternative: Vercel + Supabase

**Vercel** (Frontend + API Routes):
- Free tier available
- Automatic HTTPS
- Great for Next.js apps

**Supabase** (Database + Real-time):
- 500MB PostgreSQL free
- Built-in real-time features
- Free authentication

**Steps:**
1. Create [Vercel](https://vercel.com) account
2. Create [Supabase](https://supabase.com) account
3. Get database connection string from Supabase
4. Deploy to Vercel with environment variables

### Alternative: Render.com

**Pros:**
- Free web services
- Free PostgreSQL
- WebSockets supported

**Steps:**
1. Create account at [render.com](https://render.com)
2. Create a new Web Service
3. Connect GitHub repository
4. Add PostgreSQL database
5. Set environment variables
6. Deploy

---

## 💾 Database Setup (Free)

### Option 1: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database
4. Copy the Connection String (URI)
5. Replace `postgres://` with `postgresql://`

**Example:**
```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Option 2: Neon (Free PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the connection string

**Example:**
```
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require"
```

### Option 3: Railway PostgreSQL

1. Create project on Railway
2. Add PostgreSQL add-on
3. Railway provides automatic `DATABASE_URL` variable

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Code

1. **Initialize Git Repository** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/word-rush.git
git push -u origin main
```

### Step 2: Update Prisma Schema for PostgreSQL

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 3: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your repository
5. Click "Add Variables" and add:
   - `DATABASE_URL` (from Supabase/Neon)
   - `NEXTAUTH_SECRET` (random string)
   - `NEXTAUTH_URL` (your railway app URL)

6. Railway will automatically:
   - Install dependencies
   - Build the app
   - Run migrations

### Step 4: Run Database Migrations

After first deployment, run migrations:

**On Railway:**
1. Go to your project
2. Click on your web service
3. Go to "Settings" → "Build"
4. Add build command: `prisma migrate deploy && next build`

**Or via Railway CLI:**
```bash
railway run npx prisma migrate deploy
```

### Step 5: Configure WebSocket

The game uses Socket.io for real-time features. On Railway/Vercel:

1. Ensure WebSocket support is enabled (Railway has it by default)
2. Update the socket connection URL in production:

```typescript
// In src/app/page.tsx
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '/?XTransformPort=3003';
const newSocket = io(socketUrl, {
  transports: ['websocket', 'polling']
});
```

---

## 🔐 Environment Variables

Create a `.env` file (or set in hosting dashboard):

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth (for session management)
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="https://your-app.railway.app"

# Optional: Custom socket URL for production
NEXT_PUBLIC_SOCKET_URL="https://your-app.railway.app"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 🎮 Game Features

### Implemented Features:
- ✅ User Registration & Login
- ✅ Create/Join Lobby with 6-character codes
- ✅ Real-time player updates
- ✅ Host controls (settings, kick players)
- ✅ 6 Categories (Sinhala: ගැහැනු, පිරිමි, මල්, පලතුරු, සත්තු, නගර)
- ✅ Letter-based gameplay
- ✅ 20-second countdown timer
- ✅ Answer validation voting
- ✅ Scoring system (unique=10pts, duplicate=5pts)
- ✅ Round-by-round results
- ✅ Final leaderboard
- ✅ All-time leaderboard
- ✅ How to Play section
- ✅ Dark theme UI

---

## 🔧 Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── leaderboard/route.ts
│   │   │   └── user/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main game component
│   ├── components/ui/        # shadcn/ui components
│   ├── hooks/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── game-store.ts     # Zustand store
│   │   └── utils.ts
│   └── types/
│       └── game.ts
├── mini-services/
│   └── game-server/          # Socket.io server
│       ├── index.ts
│       └── package.json
├── prisma/
│   └── schema.prisma
├── package.json
└── tailwind.config.ts
```

---

## 🐛 Troubleshooting

### Issue: Database Connection Error
- Check DATABASE_URL is correct
- Ensure database allows external connections
- For Supabase, check connection pooling settings

### Issue: WebSocket Not Working
- Ensure hosting platform supports WebSockets
- Check if port 3003 is accessible
- Update socket URL for production

### Issue: Prisma Migration Failed
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or push schema without migrations
npx prisma db push
```

### Issue: Build Fails
- Check Node.js version (requires 18+)
- Ensure all dependencies are installed
- Check for TypeScript errors: `npm run lint`

---

## 📱 Testing Locally

1. Install dependencies:
```bash
bun install
```

2. Set up database:
```bash
bun run db:push
```

3. Start the game server:
```bash
cd mini-services/game-server && bun run dev &
```

4. Start the main app:
```bash
bun run dev
```

5. Open http://localhost:3000

---

## 🎯 Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Create free database (Supabase/Neon)
- [ ] Create Railway account
- [ ] Connect GitHub repo to Railway
- [ ] Set DATABASE_URL environment variable
- [ ] Deploy!
- [ ] Run database migrations
- [ ] Share your game URL!

---

## 📞 Need Help?

If you encounter any issues during deployment:

1. Check the hosting platform's logs
2. Verify environment variables are set correctly
3. Ensure database connection is working
4. Check WebSocket configuration

Enjoy your Word Rush game! 🎉
