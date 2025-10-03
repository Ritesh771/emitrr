import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { GameState, GameMove } from './types';
import JoinGame from './components/JoinGame';
import GameBoard from './components/GameBoard';
import Leaderboard from './components/Leaderboard';
import './App.css';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [waiting, setWaiting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnectedGameId, setDisconnectedGameId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  
  const { socket, connected, joinQueue, makeMove, rejoinGame } = useWebSocket(SERVER_URL);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting-for-opponent', () => {
      setWaiting(true);
    });

    socket.on('game-started', (data: { game: GameState; yourPlayerId: string; opponentId: string }) => {
      setGameState(data.game);
      setMyPlayerId(data.yourPlayerId);
      setWaiting(false);
      setReconnecting(false);
      setDisconnectedGameId('');
    });

    socket.on('game-rejoined', (data: { game: GameState; yourPlayerId: string; opponentId: string }) => {
      setGameState(data.game);
      setMyPlayerId(data.yourPlayerId);
      setReconnecting(false);
      setDisconnectedGameId('');
      setWaiting(false);
    });

    socket.on('move-made', (data: { game: GameState; move?: GameMove; nextPlayer: string; botMove?: boolean }) => {
      setGameState(data.game);
    });

    socket.on('game-ended', (data: { game: GameState; winner?: string; reason?: string }) => {
      setGameState(data.game);
    });

    socket.on('player-disconnected', (data: { playerId: string; username: string; reconnectionTimeoutSeconds: number }) => {
      if (gameState && data.playerId !== myPlayerId) {
        alert(`Player ${data.username} disconnected. They have ${data.reconnectionTimeoutSeconds} seconds to reconnect.`);
      }
    });

    socket.on('player-reconnected', (data: { playerId: string; username: string }) => {
      if (gameState && data.playerId !== myPlayerId) {
        alert(`Player ${data.username} reconnected!`);
      }
    });

    socket.on('error', (error: { message?: string }) => {
      console.error('Game error:', error);
      alert(error.message || 'An error occurred');
      setWaiting(false);
      setReconnecting(false);
    });

    socket.on('rejoin-error', (error: { message: string }) => {
      console.error('Rejoin error:', error);
      alert(`Failed to rejoin game: ${error.message}`);
      setReconnecting(false);
      setDisconnectedGameId('');
    });

    socket.on('disconnect', () => {
      if (gameState && gameState.status === 'in_progress') {
        setDisconnectedGameId(gameState.id);
        setReconnecting(true);
      }
    });

    socket.on('connect', () => {
      if (disconnectedGameId && username) {
        // Attempt to rejoin the game
        rejoinGame(disconnectedGameId, username);
      }
    });

    return () => {
      socket.off('waiting-for-opponent');
      socket.off('game-started');
      socket.off('game-rejoined');
      socket.off('move-made');
      socket.off('game-ended');
      socket.off('player-disconnected');
      socket.off('player-reconnected');
      socket.off('error');
      socket.off('rejoin-error');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [socket]);

  const handleJoinQueue = (playerUsername: string) => {
    setUsername(playerUsername);
    joinQueue(playerUsername);
  };

  const handleColumnClick = (column: number) => {
    console.log('=== MOVE DEBUG INFO ===');
    console.log('Column clicked:', column);
    console.log('Game state:', gameState);
    console.log('My player ID:', myPlayerId);
    console.log('Current player:', gameState?.currentPlayer);
    console.log('Game status:', gameState?.status);
    console.log('Is my turn:', isMyTurn());
    console.log('Socket connected:', !!socket);
    console.log('=====================');
    
    if (gameState && isMyTurn()) {
      console.log('✅ Making move...');
      makeMove(gameState.id, column);
    } else {
      console.log('❌ Cannot make move:');
      if (!gameState) console.log('  - No game state');
      if (gameState && !isMyTurn()) console.log('  - Not my turn');
      if (gameState && gameState.status !== 'in_progress') console.log('  - Game not in progress, status:', gameState.status);
    }
  };

  const isMyTurn = () => {
    return gameState && gameState.currentPlayer === myPlayerId;
  };

  const handleNewGame = () => {
    setGameState(null);
    setMyPlayerId('');
    setWaiting(false);
    setReconnecting(false);
    setDisconnectedGameId('');
    setUsername('');
  };

  const handleRejoinGame = () => {
    if (disconnectedGameId && username) {
      setReconnecting(true);
      rejoinGame(disconnectedGameId, username);
    }
  };

  if (!connected && !reconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (reconnecting && disconnectedGameId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Reconnecting to game...</p>
          <p className="text-sm text-gray-500 mt-2">You have 30 seconds to reconnect</p>
          <button
            onClick={handleRejoinGame}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry Connection
          </button>
          <button
            onClick={handleNewGame}
            className="mt-2 ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {!gameState && !waiting && (
        <JoinGame onJoinQueue={handleJoinQueue} waiting={waiting} />
      )}

      {waiting && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finding opponent...</p>
            <p className="text-sm text-gray-500">Bot game will start in 10 seconds if no player joins</p>
          </div>
        </div>
      )}

      {gameState && (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">4 in a Row</h1>
              <div className="space-x-4">
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Leaderboard
                </button>
                <button
                  onClick={handleNewGame}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  New Game
                </button>
              </div>
            </div>
            
            <GameBoard
              game={gameState}
              onColumnClick={handleColumnClick}
              isMyTurn={!!isMyTurn()}
              myPlayerId={myPlayerId}
            />
          </div>
        </div>
      )}

      <Leaderboard 
        show={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
}

export default App;