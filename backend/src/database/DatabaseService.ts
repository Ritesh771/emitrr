import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      logger.info('Database connection established');
      
      // Run migrations
      await this.runMigrations();
    } catch (error) {
      this.isConnected = false;
      logger.warn('Database connection failed, running in development mode without persistence:', error);
      // Don't throw error - allow app to run without database
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      logger.debug('Database not connected, skipping query:', text);
      return { rows: [], rowCount: 0 };
    }
    
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async disconnect(): Promise<void> {
    await this.close();
    this.isConnected = false;
    logger.info('Database connection closed');
  }

  private async runMigrations(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Skipping migrations - database not connected');
      return;
    }
    
    try {
      // Create tables if they don't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS players (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          games_won INTEGER DEFAULT 0,
          games_lost INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS games (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player1_id UUID REFERENCES players(id),
          player2_id UUID REFERENCES players(id),
          winner_id UUID REFERENCES players(id),
          status VARCHAR(20) NOT NULL,
          board_state JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP,
          total_moves INTEGER DEFAULT 0
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS game_moves (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id UUID REFERENCES games(id),
          player_id UUID REFERENCES players(id),
          column_index INTEGER NOT NULL,
          row_index INTEGER NOT NULL,
          move_number INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)
      `);

      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at)
      `);

      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id)
      `);

      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }
}