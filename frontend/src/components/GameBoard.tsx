import React from 'react';
import { GameState } from '../types';

interface GameBoardProps {
  game: GameState;
  onColumnClick: (column: number) => void;
  isMyTurn: boolean;
  myPlayerId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  game, 
  onColumnClick, 
  isMyTurn
}) => {
  const ROWS = 6;
  const COLS = 7;

  const getCellColor = (playerId: string | null) => {
    if (!playerId) return 'bg-gray-100';
    if (playerId === game.player1.id) return 'bg-red-500';
    if (playerId === game.player2.id) return 'bg-yellow-500';
    return 'bg-gray-100';
  };

  const isColumnFull = (column: number) => {
    return game.board[column] && game.board[column][ROWS - 1] !== null;
  };

  return (
    <div className="game-board-container w-full max-w-md mx-auto sm:max-w-2xl">
      {/* Game Status */}
      <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <span className="font-semibold text-sm sm:text-base">{game.player1.username}</span>
            <span className="ml-2 inline-block w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full"></span>
            {game.player1.isBot && <span className="ml-1 text-xs text-gray-500">(Bot)</span>}
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">VS</div>
            {game.status === 'in_progress' && (
              <div className="text-xs">
                {isMyTurn ? "Your turn" : "Opponent's turn"}
              </div>
            )}
          </div>
          <div className="flex items-center">
            <span className="font-semibold text-sm sm:text-base">{game.player2.username}</span>
            <span className="ml-2 inline-block w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full"></span>
            {game.player2.isBot && <span className="ml-1 text-xs text-gray-500">(Bot)</span>}
          </div>
        </div>
        
        {game.status === 'completed' && (
          <div className="mt-2 text-center">
            {game.winner ? (
              <div className="text-green-600 font-bold text-sm sm:text-base">
                Winner: {game.winner === game.player1.id ? game.player1.username : game.player2.username}
              </div>
            ) : (
              <div className="text-blue-600 font-bold text-sm sm:text-base">Draw!</div>
            )}
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="bg-blue-600 p-2 sm:p-4 rounded-lg shadow-lg overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-0">
          {Array.from({ length: COLS }, (_, column) => (
            <div key={column} className="flex flex-col-reverse gap-1 sm:gap-2">
              {/* Column Click Area */}
              <button
                onClick={() => onColumnClick(column)}
                disabled={
                  !isMyTurn || 
                  game.status !== 'in_progress' || 
                  isColumnFull(column)
                }
                className={`
                  w-8 h-6 sm:w-12 sm:h-8 rounded border-2 border-dashed transition-colors text-xs sm:text-sm
                  ${isMyTurn && game.status === 'in_progress' && !isColumnFull(column)
                    ? 'border-white hover:bg-blue-500 cursor-pointer'
                    : 'border-blue-400 cursor-not-allowed opacity-50'
                  }
                `}
                title={`Drop disc in column ${column + 1}`}
              >
                ↓
              </button>
              
              {/* Cells in column */}
              {Array.from({ length: ROWS }, (_, row) => {
                const actualRow = ROWS - 1 - row; // Flip for display
                const cellValue = game.board[column] ? game.board[column][actualRow] : null;
                
                return (
                  <div
                    key={`${column}-${actualRow}`}
                    className={`
                      w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-white 
                      ${getCellColor(cellValue)}
                      transition-all duration-200
                    `}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Game Info */}
      <div className="mt-4 text-xs sm:text-sm text-gray-600 text-center sm:text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
          <div>Moves: {game.moves}</div>
          <div className="truncate">Game ID: {game.id.slice(0, 8)}...</div>
          <div>Status: {game.status}</div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;