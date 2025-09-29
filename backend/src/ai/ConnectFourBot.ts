import { GameBoard, BotMove } from '../types';
import { GameLogic } from '../models/GameLogic';

export class ConnectFourBot {
  private playerId: string;
  private opponentId: string;
  private maxDepth: number;

  constructor(playerId: string, opponentId: string, difficulty: number = 5) {
    this.playerId = playerId;
    this.opponentId = opponentId;
    this.maxDepth = Math.max(3, Math.min(7, difficulty)); // Limit depth for performance
  }

  /**
   * Get the best move for the bot using minimax with alpha-beta pruning
   */
  getBestMove(board: GameBoard): BotMove {
    const validMoves = GameLogic.getValidMoves(board);
    
    if (validMoves.length === 0) {
      return { column: -1, score: -Infinity, reasoning: 'No valid moves available' };
    }

    // Check for immediate win
    const winningMove = this.findImmediateWin(board, this.playerId);
    if (winningMove !== -1) {
      return { 
        column: winningMove, 
        score: 1000, 
        reasoning: 'Taking winning move' 
      };
    }

    // Check for immediate block
    const blockingMove = this.findImmediateWin(board, this.opponentId);
    if (blockingMove !== -1) {
      return { 
        column: blockingMove, 
        score: 500, 
        reasoning: 'Blocking opponent win' 
      };
    }

    // Use minimax for strategic play
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    let reasoning = 'Strategic move';

    for (const column of validMoves) {
      const boardCopy = GameLogic.cloneBoard(board);
      const moveResult = GameLogic.makeMove(boardCopy, column, this.playerId);
      
      if (moveResult.success) {
        const score = this.minimax(boardCopy, this.maxDepth - 1, false, -Infinity, Infinity);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = column;
          
          // Provide reasoning based on score
          if (score >= 500) {
            reasoning = 'Strong offensive position';
          } else if (score >= 100) {
            reasoning = 'Good strategic position';
          } else if (score >= 0) {
            reasoning = 'Defensive positioning';
          } else {
            reasoning = 'Best available option';
          }
        }
      }
    }

    // Prefer center columns when scores are equal (good strategy)
    if (bestScore === -Infinity) {
      const centerColumns = [3, 2, 4, 1, 5, 0, 6]; // Prefer center
      for (const col of centerColumns) {
        if (validMoves.includes(col)) {
          bestMove = col;
          reasoning = 'Center column preference';
          break;
        }
      }
    }

    return { column: bestMove, score: bestScore, reasoning };
  }

  /**
   * Find if there's an immediate winning move for the specified player
   */
  private findImmediateWin(board: GameBoard, playerId: string): number {
    const validMoves = GameLogic.getValidMoves(board);
    
    for (const column of validMoves) {
      const boardCopy = GameLogic.cloneBoard(board);
      const moveResult = GameLogic.makeMove(boardCopy, column, playerId);
      
      if (moveResult.success) {
        const winner = GameLogic.checkWinner(boardCopy);
        if (winner === playerId) {
          return column;
        }
      }
    }
    
    return -1;
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    board: GameBoard, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number, 
    beta: number
  ): number {
    const winner = GameLogic.checkWinner(board);
    
    // Terminal states
    if (winner === this.playerId) {
      return 1000 + depth; // Prefer faster wins
    } else if (winner === this.opponentId) {
      return -1000 - depth; // Avoid faster losses
    } else if (GameLogic.isBoardFull(board) || depth === 0) {
      return GameLogic.evaluateBoard(board, this.playerId, this.opponentId);
    }

    const validMoves = GameLogic.getValidMoves(board);
    
    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const column of validMoves) {
        const boardCopy = GameLogic.cloneBoard(board);
        const moveResult = GameLogic.makeMove(boardCopy, column, this.playerId);
        
        if (moveResult.success) {
          const score = this.minimax(boardCopy, depth - 1, false, alpha, beta);
          maxScore = Math.max(maxScore, score);
          alpha = Math.max(alpha, score);
          
          if (beta <= alpha) {
            break; // Alpha-beta pruning
          }
        }
      }
      
      return maxScore;
    } else {
      let minScore = Infinity;
      
      for (const column of validMoves) {
        const boardCopy = GameLogic.cloneBoard(board);
        const moveResult = GameLogic.makeMove(boardCopy, column, this.opponentId);
        
        if (moveResult.success) {
          const score = this.minimax(boardCopy, depth - 1, true, alpha, beta);
          minScore = Math.min(minScore, score);
          beta = Math.min(beta, score);
          
          if (beta <= alpha) {
            break; // Alpha-beta pruning
          }
        }
      }
      
      return minScore;
    }
  }

  /**
   * Quick heuristic evaluation for faster responses
   */
  getQuickMove(board: GameBoard): BotMove {
    const validMoves = GameLogic.getValidMoves(board);
    
    if (validMoves.length === 0) {
      return { column: -1, score: -Infinity, reasoning: 'No valid moves' };
    }

    // Check for immediate win
    const winningMove = this.findImmediateWin(board, this.playerId);
    if (winningMove !== -1) {
      return { 
        column: winningMove, 
        score: 1000, 
        reasoning: 'Quick win detected' 
      };
    }

    // Check for immediate block
    const blockingMove = this.findImmediateWin(board, this.opponentId);
    if (blockingMove !== -1) {
      return { 
        column: blockingMove, 
        score: 500, 
        reasoning: 'Quick block' 
      };
    }

    // Default to center column strategy
    const centerColumns = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerColumns) {
      if (validMoves.includes(col)) {
        return { 
          column: col, 
          score: 100, 
          reasoning: 'Center strategy' 
        };
      }
    }

    return { 
      column: validMoves[0], 
      score: 0, 
      reasoning: 'Random valid move' 
    };
  }
}