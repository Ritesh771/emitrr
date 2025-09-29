export interface Player {
  id: string;
  username: string;
  socketId: string;
  gamesWon: number;
  gamesLost: number;
  isBot: boolean;
  isConnected: boolean;
  lastSeen: Date;
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  column: number;
  row: number;
  moveNumber: number;
  timestamp: Date;
}

export interface Game {
  id: string;
  player1: Player;
  player2: Player;
  currentPlayer: string; // player ID
  board: GameBoard;
  status: GameStatus;
  winner?: string; // player ID
  moves: GameMove[];
  createdAt: Date;
  endedAt?: Date;
  isPublic: boolean;
}

export type GameBoard = (string | null)[][]; // 7x6 board, null = empty, string = player ID

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export enum PlayerType {
  HUMAN = 'human',
  BOT = 'bot'
}

export interface MatchmakingQueue {
  playerId: string;
  username: string;
  socketId: string;
  timestamp: Date;
}

export interface GameEvent {
  type: 'game_start' | 'move_made' | 'game_end' | 'player_disconnect' | 'player_reconnect';
  gameId: string;
  playerId?: string;
  data: any;
  timestamp: Date;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  gamesWon: number;
  gamesLost: number;
  winRatio: number;
  totalGames: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface BotMove {
  column: number;
  score: number;
  reasoning: string;
}