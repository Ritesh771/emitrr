import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  joinQueue: (username: string) => void;
  makeMove: (gameId: string, column: number) => void;
  rejoinGame: (gameId: string, username: string) => void;
}

export const useWebSocket = (serverUrl: string): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(serverUrl);
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  const joinQueue = (username: string) => {
    if (socket) {
      socket.emit('join-queue', { username });
    }
  };

  const makeMove = (gameId: string, column: number) => {
    console.log('✨ WebSocket makeMove called:', { gameId, column, socketConnected: !!socket });
    if (socket) {
      console.log('✉️ Emitting make-move event to server...');
      socket.emit('make-move', { gameId, column });
      console.log('✓ Move event sent successfully');
    } else {
      console.error('❌ No socket connection available');
    }
  };

  const rejoinGame = (gameId: string, username: string) => {
    if (socket) {
      socket.emit('rejoin-game', { gameId, username });
    }
  };

  return {
    socket,
    connected,
    joinQueue,
    makeMove,
    rejoinGame
  };
};