# ByteQuest: Treasure Hunt

ByteQuest is a board-game-style, dice-driven educational game that turns Class 10–12 Computer Science revision into an engaging adventure. It supports two modes of gameplay:
1. **Solo / Local Play (Offline Pass-and-Play)**: 1 to 4 players or bots taking turns on a single device (desktop or mobile browser).
2. **Classroom Competition (Online Sync)**: A Ludo-style, team-vs-team classroom match synced in real time where each student joins from their own device via a Room Code, and **every single move triggers a question**.

---

## 🛠️ Architecture & Tech Stack

### Frontend (Single Page Web App)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS & Lucide Icons (Rich premium themes: Isle of Basics, Function Jungle, and Data Fortress)
- **Realtime**: Socket.io-client
- **Visuals**: CSS Animations & Canvas Confetti

### Backend (Express & Socket.io Engine)
- **Runtime**: Node.js & TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Realtime Sync**: Socket.io room orchestration and turns synchronizer
- **Security**: Password hashing via `bcrypt`

---

## 🚦 Installation & Local Setup

### Prerequisites
- **Node.js (v18+)**
- **PostgreSQL Database** running locally (e.g. native Windows service on port 5432, username `postgres`, password `1234`).

### 1. Backend Setup
1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables. Copy `.env.example` to `.env` and verify database credentials:
   ```bash
   cp .env.example .env
   ```
4. Push the schema to your local database:
   ```bash
   npx prisma db push --accept-data-loss
   ```
5. Seed the database with the pedagogical game maps, a default teacher account (`teacher@bytequest.com`/`password123`), mock classroom rosters, and the 45+ syllabus question bank:
   ```bash
   npx prisma db seed
   ```
6. Start the developer server:
   ```bash
   npm run dev
   ```
   The backend will boot on `http://localhost:5000`.

### 2. Frontend Setup
1. Navigate to `/frontend`:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will boot on `http://localhost:8081`. Access it in your web browser.

---

## 🚀 Production Deployment

### 1. Frontend (Vercel)
Deploy the `/frontend` subfolder to Vercel.
- **Framework Preset**: Vite
- **Environment Variables**:
  - `VITE_API_URL`: The URL of your backend (e.g., `https://bytequest-backend.onrender.com`).

### 2. Backend (Render / Heroku)
Deploy the `/backend` subfolder to Render.
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `DATABASE_URL`: Your Neon PostgreSQL connection string.
  - `PORT`: Set automatically by Render.
  - `JWT_SECRET`: A strong secret key to sign auth tokens.
  - `NODE_ENV`: `production`

### 3. Database (Neon PostgreSQL)
1. Create a serverless PostgreSQL instance on Neon.
2. Initialize your database from your local machine:
   ```bash
   DATABASE_URL="your-neon-connection-string" npx prisma db push
   DATABASE_URL="your-neon-connection-string" npx prisma db seed
   ```

---

## 📦 Directory Structure

```
ByteQuest/
├── backend/
│   ├── prisma/
│   │   ├── migrations/         # Database migration history
│   │   ├── schema.prisma       # Prisma models (Teacher, Question, Class, Student, Team, Session)
│   │   └── seed.ts             # Clean seeder script
│   └── src/
│       ├── config/             # Environment, logger setups
│       ├── routes/             # Teacher endpoints (/api/v1/teacher) and stubs
│       ├── services/           # SocketService room engine, PostgresDatabase service
│       ├── app.ts              # Express initialization
│       └── server.ts           # Bootstraps server listener
├── frontend/
│   ├── src/
│   │   ├── components/         # Subcomponents (TeacherDashboard.tsx, StudentGame.tsx)
│   │   ├── config.ts           # Shared coordinates, tile definitions, and safe indices
│   │   ├── questions.ts        # Phase 1 offline questions
│   │   ├── App.tsx             # Router entry (Local Setup, Student Game, Teacher Dashboard)
│   │   └── main.tsx            # React mounting
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── index.html
└── README.md
```

---

## 🎮 Consolidative Feature Specification

### Solo Mode (Phase 1)
- **Setup**: 1-4 players. 1-player mode automatically adds 2 bot competitors (Compiler-Bot and Binary-Beast).
- **Map**: 18 tiles (indices 0 to 17) mapped with questions, coin chests, and traps.
- **Rules**:
  - **Treasure Tiles**: Grant coins and XP.
  - **Trap Tiles**: Trigger "Move back 2 spaces" or "Skip next turn" randomly.
  - **Boss Tiles**: Trigger harder questions with double rewards.
  - **Streak**: +5 bonus coins upon answering 3 questions correctly in a row.
  - **Badges**: Earn **Perfect Round**, **Comeback Kid**, or **Speed Runner** upon victory.

### Classroom Sync Mode (Phase 2)
- **Roster & Teams**: Teacher groups students into teams (Crimson, Cobalt, Jade) sharing a single token. Turns rotate within the team automatically.
- **Room Code**: Teacher opens a live lobby generating a 5-digit room code; students connect and pick their name from the roster.
- **Question on Every Move**: Correct answers execute full rolled steps. Incorrect answers halve the rolled steps (rounded down, minimum 1).
- **Ludo-style Capture**: Correctly landing on an opposing team's tile sends them back 3 tiles, unless they are positioned on a **Safe Tile** (indices `0`, `4`, `10`, or `15`).
- **Live Monitor**: Teacher watches live positions, accuracy, and standings.
- **Reconnections**: Auto-restores students to their session if a browser tab is accidentally closed.
