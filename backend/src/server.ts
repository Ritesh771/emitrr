import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameService } from './services/GameService';
import { PlayerService } from './services/PlayerService';
import { AnalyticsService } from './services/AnalyticsService';
import { DatabaseService } from './database/DatabaseService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://emitrr-six.vercel.app', // Production frontend URL
  /https:\/\/.*\.vercel\.app$/ // Allow all Vercel deployment URLs
].filter((origin): origin is string | RegExp => origin !== undefined);

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      callback(null, isAllowed);
    },
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Services
const databaseService = new DatabaseService();
const playerService = new PlayerService(databaseService);
const analyticsService = new AnalyticsService();
const gameService = new GameService(databaseService, playerService, analyticsService);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await playerService.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Game state endpoint
app.get('/api/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = gameService.getGame(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    logger.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join matchmaking queue
  socket.on('join-queue', async (data) => {
    try {
      const { username } = data;
      
      if (!username || username.trim().length === 0) {
        socket.emit('error', { message: 'Username is required' });
        return;
      }

      logger.info(`Player ${username} joining queue`);
      
      // Create or get player
      const player = await playerService.createOrGetPlayer(username, socket.id);
      
      // Add to matchmaking queue
      const result = await gameService.addPlayerToQueue(player);
      
      if (result.gameStarted) {
        // Game found immediately
        const game = result.game!;
        
        // Join both players to the game room
        const player1Socket = io.sockets.sockets.get(game.player1.socketId);
        const player2Socket = io.sockets.sockets.get(game.player2.socketId);
        
        if (player1Socket) {
          player1Socket.join(game.id);
          player1Socket.emit('game-started', {
            game: gameService.getPublicGameState(game),
            yourPlayerId: game.player1.id,
            opponentId: game.player2.id
          });
        }
        
        if (player2Socket) {
          player2Socket.join(game.id);
          player2Socket.emit('game-started', {
            game: gameService.getPublicGameState(game),
            yourPlayerId: game.player2.id,
            opponentId: game.player1.id
          });
        }
        
        logger.info(`Game started: ${game.id} between ${game.player1.username} and ${game.player2.username}`);
      } else {
        // Waiting for opponent
        socket.emit('waiting-for-opponent', { 
          message: 'Waiting for an opponent...',
          timeoutSeconds: 10
        });
        
        // Set timeout for bot game
        setTimeout(async () => {
          logger.info(`Bot timeout triggered for player: ${player.username} (${player.id})`);
          const queueResult = await gameService.startBotGameIfStillWaiting(player.id);
          
          if (queueResult.gameStarted) {
            const game = queueResult.game!;
            socket.join(game.id);
            socket.emit('game-started', {
              game: gameService.getPublicGameState(game),
              yourPlayerId: game.player1.id,
              opponentId: game.player2.id,
              vsBot: true
            });
            
            logger.info(`Bot game started successfully: ${game.id} for player ${player.username}`);
          } else {
            logger.warn(`Failed to start bot game for player: ${player.username} (${player.id})`);
            socket.emit('error', { message: 'Failed to start bot game' });
          }
        }, 10000); // 10 seconds timeout
      }
    } catch (error) {
      logger.error('Error in join-queue:', error);
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

  // Make a move
  socket.on('make-move', async (data) => {
    logger.info(`🎯 Move attempt received from ${socket.id}: ${JSON.stringify(data)}`);
    try {
      const { gameId, column } = data;
      
      if (!gameId || column === undefined) {
        logger.error('❌ Invalid move data:', data);
        socket.emit('error', { message: 'Game ID and column are required' });
        return;
      }

      logger.info(`🎮 Processing move: gameId=${gameId}, column=${column}, socketId=${socket.id}`);
      const result = await gameService.makeMove(gameId, socket.id, column);
      
      if (result.success) {
        const game = result.game!;
        const publicGameState = gameService.getPublicGameState(game);
        
        // Emit move to all players in the game
        io.to(gameId).emit('move-made', {
          game: publicGameState,
          move: result.move,
          nextPlayer: game.currentPlayer
        });
        
        // Check if game ended
        if (result.gameEnded) {
          io.to(gameId).emit('game-ended', {
            game: publicGameState,
            winner: result.winner,
            reason: result.endReason
          });
          
          logger.info(`Game ended: ${gameId}, winner: ${result.winner || 'draw'}`);
        } else if (result.botMove) {
          // If it's a bot game and bot needs to move
          setTimeout(async () => {
            const botResult = await gameService.makeBotMove(gameId);
            if (botResult.success) {
              const updatedGame = botResult.game!;
              const updatedPublicState = gameService.getPublicGameState(updatedGame);
              
              io.to(gameId).emit('move-made', {
                game: updatedPublicState,
                move: botResult.move,
                nextPlayer: updatedGame.currentPlayer,
                botMove: true
              });
              
              if (botResult.gameEnded) {
                io.to(gameId).emit('game-ended', {
                  game: updatedPublicState,
                  winner: botResult.winner,
                  reason: botResult.endReason
                });
              }
            }
          }, 500); // Small delay for bot move
        }
      } else {
        socket.emit('move-error', { message: result.error });
      }
    } catch (error) {
      logger.error('Error in make-move:', error);
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  // Rejoin game (reconnection)
  socket.on('rejoin-game', async (data) => {
    try {
      const { gameId, username } = data;
      
      if (!gameId || !username) {
        socket.emit('error', { message: 'Game ID and username are required' });
        return;
      }

      const result = await gameService.rejoinGame(gameId, username, socket.id);
      
      if (result.success) {
        const game = result.game!;
        socket.join(gameId);
        
        socket.emit('game-rejoined', {
          game: gameService.getPublicGameState(game),
          yourPlayerId: result.playerId,
          opponentId: result.opponentId
        });
        
        // Notify opponent of reconnection
        socket.to(gameId).emit('player-reconnected', {
          playerId: result.playerId,
          username: username
        });
        
        logger.info(`Player ${username} rejoined game ${gameId}`);
      } else {
        socket.emit('rejoin-error', { message: result.error });
      }
    } catch (error) {
      logger.error('Error in rejoin-game:', error);
      socket.emit('error', { message: 'Failed to rejoin game' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Handle player disconnection
    gameService.handlePlayerDisconnection(socket.id).then((result) => {
      if (result.gameAffected) {
        const { gameId, disconnectedPlayer } = result;
        
        // Notify remaining players
        socket.to(gameId!).emit('player-disconnected', {
          playerId: disconnectedPlayer!.id,
          username: disconnectedPlayer!.username,
          reconnectionTimeoutSeconds: 30
        });
        
        // Set timeout for game abandonment
        setTimeout(async () => {
          const abandonResult = await gameService.abandonGameIfPlayerNotReconnected(gameId!, disconnectedPlayer!.id);
          
          if (abandonResult.gameAbandoned) {
            io.to(gameId!).emit('game-ended', {
              game: gameService.getPublicGameState(abandonResult.game!),
              winner: abandonResult.winner,
              reason: 'player_disconnected'
            });
            
            logger.info(`Game ${gameId} abandoned due to player disconnection`);
          }
        }, 30000); // 30 seconds timeout
      }
    }).catch((error) => {
      logger.error('Error handling disconnection:', error);
    });
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await databaseService.initialize();
    logger.info('Database initialized successfully');
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`WebSocket server ready for connections`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await analyticsService.disconnect();
    await databaseService.disconnect();
    logger.info('HTTP server closed.');
    process.exit(0); // Exit after cleanup
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await analyticsService.disconnect();
    await databaseService.disconnect();
    logger.info('HTTP server closed.');
    process.exit(0); // Exit after cleanup
  });
});