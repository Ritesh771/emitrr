# 4 in a Row - Real-time Multiplayer Game

A real-time, backend-driven version of the classic Connect Four game with competitive bot AI and analytics.

🌐 **Live Demo:** [emitrr-six.vercel.app](https://4x4ritesh.vercel.app)  
📂 **Repository:** [github.com/Ritesh771/emitrr](https://github.com/Ritesh771/emitrr)  
👤 **Developer:** [Ritesh N](https://riteshn.me)

## 🎮 Features

- **Real-time multiplayer gameplay** using WebSockets
- **Competitive AI bot** with strategic decision making (minimax algorithm)
- **Player matchmaking** with 10-second timeout fallback to bot
- **Game persistence** and leaderboard tracking with PostgreSQL
- **Player reconnection** within 30 seconds
- **Analytics tracking** via Kafka (bonus feature)
- **Simple React frontend** with responsive design

## 🏗 Architecture

```
├── backend/          # Node.js + TypeScript WebSocket server
│   ├── src/
│   │   ├── ai/       # Competitive bot with minimax algorithm
│   │   ├── models/   # Game logic and board management
│   │   ├── services/ # Player, game, and analytics services
│   │   └── database/ # PostgreSQL connection and queries
├── frontend/         # React + Vite frontend with Tailwind CSS
├── database/         # PostgreSQL schemas and migrations
├── kafka/           # Analytics service (optional)
└── docker-compose.yml # Local development setup
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (optional but recommended)
- Docker & Docker Compose (optional)

### Automated Setup
```bash
./setup.sh
```

### Manual Setup

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Set up environment:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

3. **Set up PostgreSQL database:**
```bash
createdb connect_four_game
```

4. **Start development servers:**
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend on `http://localhost:5173`

## 🎯 Game Rules

- **Board:** 7 columns × 6 rows
- **Objective:** Connect 4 discs vertically, horizontally, or diagonally
- **Turns:** Players alternate dropping discs into columns
- **Win/Draw:** First to connect 4 wins, full board = draw

## 🤖 Bot Strategy

The competitive bot uses a minimax algorithm with alpha-beta pruning:
1. **Immediate wins** - Takes winning moves
2. **Blocking** - Prevents opponent wins
3. **Strategic positioning** - Creates future winning opportunities
4. **Center preference** - Plays center columns when no critical moves

## 🔌 API & WebSocket Events

### WebSocket Events
- `join-queue` - Join matchmaking queue
- `make-move` - Drop disc in column
- `rejoin-game` - Reconnect to existing game
- `game-started` - Game found and started
- `move-made` - Move completed
- `game-ended` - Game finished

### REST Endpoints
- `GET /api/leaderboard` - Get top players
- `GET /api/game/:id` - Get game state
- `GET /api/health` - Health check

## 📊 Analytics (Kafka Integration)

Game events are published to Kafka topics:
- `game-events` - Game lifecycle events
- `player-events` - Player activity events

Analytics tracked:
- Average game duration
- Win/loss ratios
- Player activity patterns
- Peak gaming hours

## 🏆 Database Schema

### Tables
- `players` - Player information and stats
- `games` - Game records and results
- `game_moves` - Individual move history

## 🧪 Testing

```bash
# Test backend
cd backend && npm test

# Test frontend
cd frontend && npm test

# Test game logic
cd backend && npm run test:game
```

## 🚀 Production Deployment

### Using Docker
```bash
docker-compose up -d
```

### Manual Deployment
1. Build: `npm run build`
2. Set production environment variables
3. Start: `npm start`

## 🔧 Configuration

### Backend Environment
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/connect_four_game
KAFKA_BROKERS=localhost:9092
SESSION_SECRET=your-secret-key
MATCHMAKING_TIMEOUT_SECONDS=10
RECONNECTION_TIMEOUT_SECONDS=30
```

### Frontend Environment
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## 🎯 Performance Features

- **In-memory game state** for active games
- **Database persistence** for completed games only
- **WebSocket connection pooling**
- **Optimized bot AI** with configurable depth
- **Alpha-beta pruning** for faster bot decisions

## 🐛 Troubleshooting

### Common Issues
1. **WebSocket connection failed:** Check backend server is running on port 3001
2. **Database connection error:** Verify PostgreSQL is running and credentials are correct
3. **Bot not responding:** Check game state and AI service initialization
4. **Frontend build errors:** Run `npm install --legacy-peer-deps` in frontend directory

### Debug Mode
Set `LOG_LEVEL=debug` in backend `.env` for verbose logging.

## 🏅 Game Features Implemented

✅ **Core Requirements:**
- Real-time multiplayer with WebSockets
- Player matchmaking (10s timeout to bot)
- Competitive bot with strategic AI
- Player reconnection (30s window)
- Game state persistence
- Leaderboard tracking
- Simple frontend UI

✅ **Bonus Features:**
- Kafka analytics integration
- Docker containerization
- Minimax AI with alpha-beta pruning
- Responsive design
- Comprehensive error handling
- Game state validation

## 📋 Tech Stack

**Backend:**
- Node.js + TypeScript
- Socket.io for WebSockets
- Express.js
- PostgreSQL with node-pg
- Kafka.js for analytics

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS
- Socket.io-client

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 15
- Apache Kafka (optional)

## 🎮 How to Play

1. **Enter your username** and click "Find Game"
2. **Wait for opponent** (or play against bot after 10s)
3. **Take turns** dropping discs by clicking columns
4. **Connect 4 discs** vertically, horizontally, or diagonally to win!
5. **View leaderboard** to see top players

**Enjoy the game!** 🎯

---

## ⚠️ Known Limitations and Areas for Improvement

### 1. Infrastructure & Scalability
- ❌ **Single Server Instance** – Render free tier = single server, no load balancing
- ❌ **Cold Start Issues** – Render spins down after 15 mins of inactivity (~30s startup delay)
- ❌ **No CDN Integration** – Static assets served directly from Render
- ❌ **Database Connection Pooling** – Basic connection pool, no advanced optimization
- ❌ **No Horizontal Scaling** – Single instance architecture

### 2. Security & Authentication
- ❌ **No User Authentication** – Players identified by username only
- ⚠️ **Basic SQL Protection** – Parameterized queries used, but no ORM-level validation
- ❌ **No Rate Limiting** – No protection against spam/abuse
- ❌ **Basic CORS Configuration** – Simple origin-based validation
- ❌ **No Security Headers** – Limited by deployment platform (Render)
- ❌ **No HTTPS in Development** – Production uses platform HTTPS

### 3. Game Logic & Features
- ❌ **No Spectator Mode** – Only active players can view games
- ❌ **Limited Game Modes** – Only classic 7x6 Connect Four
- ❌ **No Tournament System** – Only individual matches
- ❌ **Basic Leaderboard** – Simple win/loss tracking only
- ❌ **No Game History** – No replay or game analysis features

### 4. Real-time & Networking
- ✅ **Basic Reconnection Support** – 30s window for reconnection

## 🙌 A Note from the Developer

This project was built with a strong focus on real-time performance, gameplay logic, and backend architecture. While it's not production-ready, it demonstrates core competencies in building scalable, event-driven applications with real-time interactivity.

The implementation showcases:
- ✅ **WebSocket Architecture** for real-time multiplayer gaming
- ✅ **AI Strategy Implementation** using minimax algorithm with alpha-beta pruning
- ✅ **Microservices Design** with separated concerns (game logic, analytics, persistence)
- ✅ **Modern Full-Stack Development** with TypeScript, React, and Node.js
- ✅ **Production Deployment** on modern cloud platforms (Vercel + Render)

I welcome feedback and suggestions for improvements. Thanks for checking it out!

**Developed by:** [Ritesh N](https://riteshn.me)  
**Portfolio:** [riteshn.me](https://riteshn.me)  
**Contact:** Open to opportunities and collaboration!
