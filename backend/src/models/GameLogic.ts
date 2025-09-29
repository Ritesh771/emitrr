import { GameBoard, GameStatus, Player, Game, GameMove } from '../types';

export class GameLogic {
  private static readonly ROWS = 6;
  private static readonly COLS = 7;
  private static readonly CONNECT_COUNT = 4;

  /**
   * Create an empty game board
   */
  static createEmptyBoard(): GameBoard {
    return Array(this.COLS).fill(null).map(() => Array(this.ROWS).fill(null));
  }

  /**
   * Check if a column is valid for a move
   */
  static isValidMove(board: GameBoard, column: number): boolean {
    if (column < 0 || column >= this.COLS) {
      return false;
    }
    return board[column][this.ROWS - 1] === null; // Check if top row of column is empty
  }

  /**
   * Make a move on the board
   */
  static makeMove(board: GameBoard, column: number, playerId: string): { success: boolean; row?: number } {
    if (!this.isValidMove(board, column)) {
      return { success: false };
    }

    // Find the lowest empty row in the column
    for (let row = 0; row < this.ROWS; row++) {
      if (board[column][row] === null) {
        board[column][row] = playerId;
        return { success: true, row };
      }
    }

    return { success: false };
  }

  /**
   * Check if there's a winner on the board
   */
  static checkWinner(board: GameBoard): string | null {
    // Check horizontal
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
        const player = board[col][row];
        if (player && this.checkDirection(board, col, row, 1, 0, player)) {
          return player;
        }
      }
    }

    // Check vertical
    for (let col = 0; col < this.COLS; col++) {
      for (let row = 0; row < this.ROWS - this.CONNECT_COUNT + 1; row++) {
        const player = board[col][row];
        if (player && this.checkDirection(board, col, row, 0, 1, player)) {
          return player;
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
      for (let row = 0; row < this.ROWS - this.CONNECT_COUNT + 1; row++) {
        const player = board[col][row];
        if (player && this.checkDirection(board, col, row, 1, 1, player)) {
          return player;
        }
      }
    }

    // Check diagonal (bottom-left to top-right)
    for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
      for (let row = this.CONNECT_COUNT - 1; row < this.ROWS; row++) {
        const player = board[col][row];
        if (player && this.checkDirection(board, col, row, 1, -1, player)) {
          return player;
        }
      }
    }

    return null;
  }

  /**
   * Check if the board is full (draw condition)
   */
  static isBoardFull(board: GameBoard): boolean {
    for (let col = 0; col < this.COLS; col++) {
      if (board[col][this.ROWS - 1] === null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all valid moves (available columns)
   */
  static getValidMoves(board: GameBoard): number[] {
    const validMoves: number[] = [];
    for (let col = 0; col < this.COLS; col++) {
      if (this.isValidMove(board, col)) {
        validMoves.push(col);
      }
    }
    return validMoves;
  }

  /**
   * Clone the board for simulation
   */
  static cloneBoard(board: GameBoard): GameBoard {
    return board.map(column => [...column]);
  }

  /**
   * Check direction for winning condition
   */
  private static checkDirection(
    board: GameBoard,
    startCol: number,
    startRow: number,
    deltaCol: number,
    deltaRow: number,
    player: string
  ): boolean {
    for (let i = 0; i < this.CONNECT_COUNT; i++) {
      const col = startCol + i * deltaCol;
      const row = startRow + i * deltaRow;
      
      if (col < 0 || col >= this.COLS || row < 0 || row >= this.ROWS) {
        return false;
      }
      
      if (board[col][row] !== player) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate board position for AI (returns score for the player)
   */
  static evaluateBoard(board: GameBoard, playerId: string, opponentId: string): number {
    const winner = this.checkWinner(board);
    
    if (winner === playerId) {
      return 1000; // Win
    } else if (winner === opponentId) {
      return -1000; // Loss
    } else if (this.isBoardFull(board)) {
      return 0; // Draw
    }

    let score = 0;

    // Evaluate all possible 4-in-a-row windows
    // Horizontal
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
        score += this.evaluateWindow(board, col, row, 1, 0, playerId, opponentId);
      }
    }

    // Vertical
    for (let col = 0; col < this.COLS; col++) {
      for (let row = 0; row < this.ROWS - this.CONNECT_COUNT + 1; row++) {
        score += this.evaluateWindow(board, col, row, 0, 1, playerId, opponentId);
      }
    }

    // Diagonal
    for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
      for (let row = 0; row < this.ROWS - this.CONNECT_COUNT + 1; row++) {
        score += this.evaluateWindow(board, col, row, 1, 1, playerId, opponentId);
      }
    }

    for (let col = 0; col < this.COLS - this.CONNECT_COUNT + 1; col++) {
      for (let row = this.CONNECT_COUNT - 1; row < this.ROWS; row++) {
        score += this.evaluateWindow(board, col, row, 1, -1, playerId, opponentId);
      }
    }

    return score;
  }

  /**
   * Evaluate a 4-piece window for scoring
   */
  private static evaluateWindow(
    board: GameBoard,
    startCol: number,
    startRow: number,
    deltaCol: number,
    deltaRow: number,
    playerId: string,
    opponentId: string
  ): number {
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;

    for (let i = 0; i < this.CONNECT_COUNT; i++) {
      const col = startCol + i * deltaCol;
      const row = startRow + i * deltaRow;
      const cell = board[col][row];

      if (cell === playerId) {
        playerCount++;
      } else if (cell === opponentId) {
        opponentCount++;
      } else {
        emptyCount++;
      }
    }

    // Can't win if opponent has pieces in this window
    if (playerCount > 0 && opponentCount > 0) {
      return 0;
    }

    if (playerCount === 4) return 1000;
    if (playerCount === 3 && emptyCount === 1) return 50;
    if (playerCount === 2 && emptyCount === 2) return 10;
    if (playerCount === 1 && emptyCount === 3) return 1;

    if (opponentCount === 4) return -1000;
    if (opponentCount === 3 && emptyCount === 1) return -50;
    if (opponentCount === 2 && emptyCount === 2) return -10;
    if (opponentCount === 1 && emptyCount === 3) return -1;

    return 0;
  }
}