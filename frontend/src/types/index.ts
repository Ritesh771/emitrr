export interface Player {
  id: string;
  username: string;
  isBot: boolean;
  isConnected: boolean;
}

export interface GameState {
  id: string;
  player1: Player;
  player2: Player;
  currentPlayer: string;
  board: (string | null)[][];
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned';
  winner?: string;
  moves: number;
  createdAt: string;
  endedAt?: string;
}

export interface GameMove {
  column: number;
  row: number;
  playerId: string;
  moveNumber: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  gamesWon: number;
  gamesLost: number;
  totalGames: number;
  winRatio: number;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}