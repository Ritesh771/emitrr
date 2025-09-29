import { DatabaseService } from '../database/DatabaseService';
import { Player, LeaderboardEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class PlayerService {
  private inMemoryPlayers: Map<string, Player> = new Map(); // Fallback storage

  constructor(private db: DatabaseService) {}

  async createOrGetPlayer(username: string, socketId: string): Promise<Player> {
    try {
      if (!this.db.isAvailable()) {
        // Use in-memory storage when database is not available
        const existingPlayer = Array.from(this.inMemoryPlayers.values())
          .find(p => p.username === username);
        
        if (existingPlayer) {
          existingPlayer.socketId = socketId;
          existingPlayer.isConnected = true;
          existingPlayer.lastSeen = new Date();
          return existingPlayer;
        }

        const newPlayer: Player = {
          id: uuidv4(),
          username,
          socketId,
          gamesWon: 0,
          gamesLost: 0,
          isBot: false,
          isConnected: true,
          lastSeen: new Date()
        };
        
        this.inMemoryPlayers.set(newPlayer.id, newPlayer);
        logger.info(`Created new in-memory player: ${username} (${newPlayer.id})`);
        return newPlayer;
      }

      // Database is available - use persistent storage
      const existingPlayer = await this.getPlayerByUsername(username);
      
      if (existingPlayer) {
        // Update socket ID and connection status
        await this.updatePlayerConnection(existingPlayer.id, socketId, true);
        return {
          ...existingPlayer,
          socketId,
          isConnected: true,
          lastSeen: new Date()
        };
      }

      // Create new player
      const playerId = uuidv4();
      await this.db.query(
        'INSERT INTO players (id, username) VALUES ($1, $2)',
        [playerId, username]
      );

      const newPlayer: Player = {
        id: playerId,
        username,
        socketId,
        gamesWon: 0,
        gamesLost: 0,
        isBot: false,
        isConnected: true,
        lastSeen: new Date()
      };

      logger.info(`Created new player: ${username} (${playerId})`);
      return newPlayer;
    } catch (error) {
      logger.error('Error creating/getting player:', error);
      throw error;
    }
  }

  async getPlayerByUsername(username: string): Promise<Player | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM players WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        socketId: '', // Will be updated when player connects
        gamesWon: row.games_won,
        gamesLost: row.games_lost,
        isBot: false,
        isConnected: false,
        lastSeen: new Date(row.updated_at)
      };
    } catch (error) {
      logger.error('Error getting player by username:', error);
      throw error;
    }
  }

  async getPlayerById(playerId: string): Promise<Player | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM players WHERE id = $1',
        [playerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        socketId: '',
        gamesWon: row.games_won,
        gamesLost: row.games_lost,
        isBot: false,
        isConnected: false,
        lastSeen: new Date(row.updated_at)
      };
    } catch (error) {
      logger.error('Error getting player by ID:', error);
      throw error;
    }
  }

  async updatePlayerStats(playerId: string, won: boolean): Promise<void> {
    try {
      if (!this.db.isAvailable()) {
        // Update in-memory player stats
        const player = this.inMemoryPlayers.get(playerId);
        if (player) {
          if (won) {
            player.gamesWon++;
          } else {
            player.gamesLost++;
          }
          logger.info(`Updated in-memory stats for player ${playerId}: ${won ? 'win' : 'loss'}`);
        }
        return;
      }

      const field = won ? 'games_won' : 'games_lost';
      await this.db.query(
        `UPDATE players SET ${field} = ${field} + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [playerId]
      );
      
      logger.info(`Updated stats for player ${playerId}: ${won ? 'win' : 'loss'}`);
    } catch (error) {
      logger.error('Error updating player stats:', error);
      throw error;
    }
  }

  async updatePlayerConnection(playerId: string, socketId: string, isConnected: boolean): Promise<void> {
    try {
      // Note: We're not storing socketId and connection status in DB for this simple implementation
      // In a production system, you might want to store this information
      logger.debug(`Player ${playerId} connection updated: ${isConnected}`);
    } catch (error) {
      logger.error('Error updating player connection:', error);
      throw error;
    }
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      if (!this.db.isAvailable()) {
        // Use in-memory data when database is not available
        const players = Array.from(this.inMemoryPlayers.values())
          .filter(p => !p.isBot && (p.gamesWon + p.gamesLost) > 0)
          .sort((a, b) => {
            if (b.gamesWon !== a.gamesWon) {
              return b.gamesWon - a.gamesWon;
            }
            const aRatio = a.gamesWon / (a.gamesWon + a.gamesLost);
            const bRatio = b.gamesWon / (b.gamesWon + b.gamesLost);
            return bRatio - aRatio;
          })
          .slice(0, limit);

        return players.map(player => ({
          playerId: player.id,
          username: player.username,
          gamesWon: player.gamesWon,
          gamesLost: player.gamesLost,
          totalGames: player.gamesWon + player.gamesLost,
          winRatio: parseFloat(((player.gamesWon / (player.gamesWon + player.gamesLost)) * 100).toFixed(2))
        }));
      }

      const result = await this.db.query(`
        SELECT 
          id as player_id,
          username,
          games_won,
          games_lost,
          (games_won + games_lost) as total_games,
          CASE 
            WHEN (games_won + games_lost) = 0 THEN 0 
            ELSE ROUND((games_won::decimal / (games_won + games_lost)) * 100, 2)
          END as win_ratio
        FROM players
        WHERE (games_won + games_lost) > 0
        ORDER BY games_won DESC, win_ratio DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map((row: any) => ({
        playerId: row.player_id,
        username: row.username,
        gamesWon: row.games_won,
        gamesLost: row.games_lost,
        totalGames: row.total_games,
        winRatio: parseFloat(row.win_ratio)
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  createBotPlayer(gameId: string): Player {
    return {
      id: `bot_${gameId}`,
      username: 'AI Bot',
      socketId: '',
      gamesWon: 0,
      gamesLost: 0,
      isBot: true,
      isConnected: true,
      lastSeen: new Date()
    };
  }
}