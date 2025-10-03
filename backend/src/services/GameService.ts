import { Game, Player, GameStatus, MatchmakingQueue, GameMove, BotMove } from '../types';
import { GameLogic } from '../models/GameLogic';
import { ConnectFourBot } from '../ai/ConnectFourBot';
import { PlayerService } from './PlayerService';
import { DatabaseService } from '../database/DatabaseService';
import { AnalyticsService } from './AnalyticsService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class GameService {
  private games: Map<string, Game> = new Map();
  private waitingQueue: MatchmakingQueue[] = [];
  private playerGameMap: Map<string, string> = new Map(); // playerId -> gameId
  private socketGameMap: Map<string, string> = new Map(); // socketId -> gameId

  constructor(
    private db: DatabaseService,
    private playerService: PlayerService,
    private analyticsService: AnalyticsService
  ) {}

  async addPlayerToQueue(player: Player): Promise<{ gameStarted: boolean; game?: Game }> {
    try {
      // Check if there's already a player waiting
      if (this.waitingQueue.length > 0) {
        const waitingPlayer = this.waitingQueue.shift()!;
        
        // Create game with both players
        const game = await this.createGame(waitingPlayer, player);
        return { gameStarted: true, game };
      } else {
        // Add player to queue
        this.waitingQueue.push({
          playerId: player.id,
          username: player.username,
          socketId: player.socketId,
          timestamp: new Date()
        });
        
        return { gameStarted: false };
      }
    } catch (error) {
      logger.error('Error adding player to queue:', error);
      throw error;
    }
  }

  async startBotGameIfStillWaiting(playerId: string): Promise<{ gameStarted: boolean; game?: Game }> {
    try {
      // Check if player is still in queue
      const queueIndex = this.waitingQueue.findIndex(q => q.playerId === playerId);
      
      if (queueIndex === -1) {
        return { gameStarted: false }; // Player already matched or left
      }

      // Remove from queue and get player info from queue (includes socketId)
      const queueEntry = this.waitingQueue.splice(queueIndex, 1)[0];
      
      // Create player object from queue entry
      const player: Player = {
        id: queueEntry.playerId,
        username: queueEntry.username,
        socketId: queueEntry.socketId,
        gamesWon: 0,
        gamesLost: 0,
        isBot: false,
        isConnected: true,
        lastSeen: new Date()
      };

      // Create bot game
      const game = await this.createBotGame(player);
      return { gameStarted: true, game };
    } catch (error) {
      logger.error('Error starting bot game:', error);
      return { gameStarted: false };
    }
  }

  private async createGame(waitingPlayerQueue: MatchmakingQueue, newPlayer: Player): Promise<Game> {
    const waitingPlayer = await this.playerService.getPlayerById(waitingPlayerQueue.playerId);
    if (!waitingPlayer) {
      throw new Error('Waiting player not found');
    }

    const gameId = uuidv4();
    const game: Game = {
      id: gameId,
      player1: { ...waitingPlayer, socketId: waitingPlayerQueue.socketId },
      player2: newPlayer,
      currentPlayer: waitingPlayer.id, // Player 1 starts
      board: GameLogic.createEmptyBoard(),
      status: GameStatus.IN_PROGRESS,
      moves: [],
      createdAt: new Date(),
      isPublic: true
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(waitingPlayer.id, gameId);
    this.playerGameMap.set(newPlayer.id, gameId);
    if (waitingPlayerQueue.socketId) {
      this.socketGameMap.set(waitingPlayerQueue.socketId, gameId);
    }
    this.socketGameMap.set(newPlayer.socketId, gameId);

    // Analytics
    await this.analyticsService.publishGameEvent({
      type: 'game_start',
      gameId,
      data: {
        player1: waitingPlayer.username,
        player2: newPlayer.username,
        vsBot: false
      },
      timestamp: new Date()
    });

    logger.info(`Game created: ${gameId} between ${waitingPlayer.username} and ${newPlayer.username}`);
    return game;
  }

  private async createBotGame(player: Player): Promise<Game> {
    const gameId = uuidv4();
    const botPlayer = this.playerService.createBotPlayer(gameId);
    
    logger.info(`Creating bot game for player: ${player.username} (${player.id}) with socket: ${player.socketId}`);
    
    const game: Game = {
      id: gameId,
      player1: player,
      player2: botPlayer,
      currentPlayer: player.id, // Human player starts
      board: GameLogic.createEmptyBoard(),
      status: GameStatus.IN_PROGRESS,
      moves: [],
      createdAt: new Date(),
      isPublic: true
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(player.id, gameId);
    this.socketGameMap.set(player.socketId, gameId);

    // Analytics
    await this.analyticsService.publishGameEvent({
      type: 'game_start',
      gameId,
      data: {
        player1: player.username,
        player2: 'AI Bot',
        vsBot: true
      },
      timestamp: new Date()
    });

    logger.info(`Bot game created successfully: ${gameId} for player ${player.username}`);
    return game;
  }

  async makeMove(
    gameId: string, 
    socketId: string, 
    column: number
  ): Promise<{ 
    success: boolean; 
    game?: Game; 
    move?: GameMove; 
    gameEnded?: boolean; 
    winner?: string; 
    endReason?: string;
    botMove?: boolean;
    error?: string 
  }> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      if (game.status !== GameStatus.IN_PROGRESS) {
        return { success: false, error: 'Game is not in progress' };
      }

      // Find current player
      const currentPlayer = game.currentPlayer === game.player1.id ? game.player1 : game.player2;
      
      // Verify it's the correct player's turn (check by socket ID for humans)
      if (!currentPlayer.isBot && currentPlayer.socketId !== socketId) {
        return { success: false, error: 'Not your turn' };
      }

      // Validate move
      if (!GameLogic.isValidMove(game.board, column)) {
        return { success: false, error: 'Invalid move' };
      }

      // Make the move
      const moveResult = GameLogic.makeMove(game.board, column, currentPlayer.id);
      if (!moveResult.success) {
        return { success: false, error: 'Failed to make move' };
      }

      // Create move record
      const move: GameMove = {
        id: uuidv4(),
        gameId,
        playerId: currentPlayer.id,
        column,
        row: moveResult.row!,
        moveNumber: game.moves.length + 1,
        timestamp: new Date()
      };

      game.moves.push(move);

      // Check for win or draw
      const winner = GameLogic.checkWinner(game.board);
      const isDraw = !winner && GameLogic.isBoardFull(game.board);

      if (winner || isDraw) {
        game.status = GameStatus.COMPLETED;
        game.endedAt = new Date();
        
        if (winner) {
          game.winner = winner;
          
          // Update player stats (only for human players)
          if (!game.player1.isBot) {
            await this.playerService.updatePlayerStats(game.player1.id, game.player1.id === winner);
          }
          if (!game.player2.isBot) {
            await this.playerService.updatePlayerStats(game.player2.id, game.player2.id === winner);
          }
        }

        // Persist the completed game to the database
        await this.persistGame(game);

        // Analytics
        await this.analyticsService.publishGameEvent({
          type: 'game_end',
          gameId,
          data: {
            winner: winner || 'draw',
            totalMoves: game.moves.length,
            duration: game.endedAt.getTime() - game.createdAt.getTime()
          },
          timestamp: new Date()
        });

        // Clean up player mappings
        this.playerGameMap.delete(game.player1.id);
        this.playerGameMap.delete(game.player2.id);
        if (game.player1.socketId) this.socketGameMap.delete(game.player1.socketId);
        if (game.player2.socketId) this.socketGameMap.delete(game.player2.socketId);

        // Note: Bot players do not have socketIds to clean up

        return {
          success: true,
          game,
          move,
          gameEnded: true,
          winner: winner || undefined,
          endReason: isDraw ? 'draw' : 'win'
        };
      } else {
        // Switch to next player
        game.currentPlayer = game.currentPlayer === game.player1.id ? game.player2.id : game.player1.id;
        
        // Check if it's a bot game and next player is bot
        const nextPlayer = game.currentPlayer === game.player1.id ? game.player1 : game.player2;
        const needsBotMove = nextPlayer.isBot;

        return {
          success: true,
          game,
          move,
          gameEnded: false,
          botMove: needsBotMove
        };
      }
    } catch (error) {
      logger.error('Error making move:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async makeBotMove(gameId: string): Promise<{ 
    success: boolean; 
    game?: Game; 
    move?: GameMove; 
    gameEnded?: boolean; 
    winner?: string; 
    endReason?: string;
    error?: string 
  }> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      const currentPlayer = game.currentPlayer === game.player1.id ? game.player1 : game.player2;
      if (!currentPlayer.isBot) {
        return { success: false, error: 'Current player is not a bot' };
      }

      const opponentId = game.currentPlayer === game.player1.id ? game.player2.id : game.player1.id;
      const bot = new ConnectFourBot(currentPlayer.id, opponentId);
      
      const botMove = bot.getBestMove(game.board);
      
      if (botMove.column === -1) {
        return { success: false, error: 'Bot could not find valid move' };
      }

      // Make the bot move
      return await this.makeMove(gameId, '', botMove.column);
    } catch (error) {
      logger.error('Error making bot move:', error);
      return { success: false, error: 'Failed to make bot move' };
    }
  }

  async rejoinGame(
    gameId: string, 
    username: string, 
    socketId: string
  ): Promise<{ 
    success: boolean; 
    game?: Game; 
    playerId?: string; 
    opponentId?: string; 
    error?: string 
  }> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      // Check if player belongs to this game
      let playerId: string;
      let opponentId: string;

      if (game.player1.username === username) {
        playerId = game.player1.id;
        opponentId = game.player2.id;
        game.player1.socketId = socketId;
        game.player1.isConnected = true;
        game.player1.lastSeen = new Date();
      } else if (game.player2.username === username) {
        playerId = game.player2.id;
        opponentId = game.player1.id;
        game.player2.socketId = socketId;
        game.player2.isConnected = true;
        game.player2.lastSeen = new Date();
      } else {
        return { success: false, error: 'Player not found in this game' };
      }

      // Update player mapping
      this.playerGameMap.set(playerId, gameId);
      // Clean up old socket mapping if it exists and update with new one
      const oldSocketId = Object.values(Object.fromEntries(this.socketGameMap)).find(gid => gid === gameId);
      if (oldSocketId) this.socketGameMap.delete(oldSocketId);
      this.socketGameMap.set(socketId, gameId);

      // Analytics
      await this.analyticsService.publishGameEvent({
        type: 'player_reconnect',
        gameId,
        playerId,
        data: { username },
        timestamp: new Date()
      });

      return {
        success: true,
        game,
        playerId,
        opponentId
      };
    } catch (error) {
      logger.error('Error rejoining game:', error);
      return { success: false, error: 'Failed to rejoin game' };
    }
  }

  async handlePlayerDisconnection(socketId: string): Promise<{ 
    gameAffected: boolean; 
    gameId?: string; 
    disconnectedPlayer?: Player 
  }> {
    try {
      const gameId = this.socketGameMap.get(socketId);
      if (!gameId) {
        return { gameAffected: false };
      }

      const game = this.games.get(gameId);
      if (!game || game.status !== GameStatus.IN_PROGRESS) {
        return { gameAffected: false };
      }

      let disconnectedPlayer: Player | null = null;
      if (game.player1.socketId === socketId) {
        disconnectedPlayer = game.player1;
        game.player1.isConnected = false;
      } else if (game.player2.socketId === socketId) {
        disconnectedPlayer = game.player2;
        game.player2.isConnected = false;
      }

      if (disconnectedPlayer) {
        this.socketGameMap.delete(socketId); // Remove mapping for disconnected socket
        await this.analyticsService.publishGameEvent({
          type: 'player_disconnect',
          gameId,
          playerId: disconnectedPlayer.id,
          data: { username: disconnectedPlayer.username },
          timestamp: new Date()
        });
        return { gameAffected: true, gameId, disconnectedPlayer };
      }

      return { gameAffected: false };
    } catch (error) {
      logger.error('Error handling player disconnection:', error);
      return { gameAffected: false };
    }
  }

  async abandonGameIfPlayerNotReconnected(
    gameId: string, 
    playerId: string
  ): Promise<{ 
    gameAbandoned: boolean; 
    game?: Game; 
    winner?: string 
  }> {
    try {
      const game = this.games.get(gameId);
      if (!game || game.status !== GameStatus.IN_PROGRESS) {
        return { gameAbandoned: false };
      }

      const player = game.player1.id === playerId ? game.player1 : game.player2;
      const opponent = game.player1.id === playerId ? game.player2 : game.player1;

      // Check if player is still disconnected
      if (!player.isConnected) {
        game.status = GameStatus.ABANDONED; // Mark as abandoned
        game.endedAt = new Date();
        
        // Award win to opponent (if not bot)
        if (!opponent.isBot) { // Only update stats if opponent is human
          game.winner = opponent.id;
          await this.playerService.updatePlayerStats(opponent.id, true);
          await this.playerService.updatePlayerStats(player.id, false);
        }

        // Analytics
        await this.analyticsService.publishGameEvent({
          type: 'game_end',
          gameId,
          data: {
            winner: opponent.isBot ? 'bot' : opponent.id,
            reason: 'abandonment',
            totalMoves: game.moves.length
          },
          timestamp: new Date()
        });

        // Persist the abandoned game to the database
        await this.persistGame(game);

        // Clean up
        this.playerGameMap.delete(game.player1.id);
        this.playerGameMap.delete(game.player2.id);
        if (game.player1.socketId) this.socketGameMap.delete(game.player1.socketId);
        if (game.player2.socketId) this.socketGameMap.delete(game.player2.socketId);

        return {
          gameAbandoned: true,
          game,
          winner: opponent.id
        };
      }

      return { gameAbandoned: false };
    } catch (error) {
      logger.error('Error abandoning game:', error);
      return { gameAbandoned: false };
    }
  }

  getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  getPublicGameState(game: Game): any {
    return {
      id: game.id,
      player1: {
        id: game.player1.id,
        username: game.player1.username,
        isBot: game.player1.isBot,
        isConnected: game.player1.isConnected
      },
      player2: {
        id: game.player2.id,
        username: game.player2.username,
        isBot: game.player2.isBot,
        isConnected: game.player2.isConnected
      },
      currentPlayer: game.currentPlayer,
      board: game.board,
      status: game.status,
      winner: game.winner,
      moves: game.moves.length,
      createdAt: game.createdAt,
      endedAt: game.endedAt
    };
  }

  private async persistGame(game: Game): Promise<void> {
    if (!this.db.isAvailable()) {
      logger.warn(`Database not available. Skipping persistence for game ${game.id}`);
      return;
    }
    try {
      const query = `
        INSERT INTO games (id, player1_id, player2_id, winner_id, status, created_at, ended_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `;
      // Bots don't have persisted IDs, so use null for them
      const player1Id = game.player1.isBot ? null : game.player1.id;
      const player2Id = game.player2.isBot ? null : game.player2.id;
      const winnerId = game.winner && !game.winner.startsWith('bot_') ? game.winner : null;

      await this.db.query(query, [game.id, player1Id, player2Id, winnerId, game.status, game.createdAt, game.endedAt]);
      
      // Persist moves
      await this.persistMoves(game.id, game.moves);

      logger.info(`Game ${game.id} persisted to database.`);
    } catch (error) {
      logger.error(`Failed to persist game ${game.id}:`, error);
    }
  }

  private async persistMoves(gameId: string, moves: GameMove[]): Promise<void> {
    if (moves.length === 0 || !this.db.isAvailable()) return;

    try {
      const placeholders: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      moves.forEach(move => {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        params.push(move.id, gameId, move.playerId, move.moveNumber, move.column, move.row, move.timestamp.toISOString());
      });

      const query = `INSERT INTO game_moves (id, game_id, player_id, move_number, col, row, created_at) VALUES ${placeholders.join(',')};`;
      await this.db.query(query, params);
      logger.info(`Persisted ${moves.length} moves for game ${gameId}.`);
    } catch (error) {
      logger.error(`Failed to persist moves for game ${gameId}:`, error instanceof Error ? error.message : String(error));
    }
  }
}