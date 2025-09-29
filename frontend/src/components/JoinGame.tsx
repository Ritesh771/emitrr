import React, { useState } from 'react';

interface JoinGameProps {
  onJoinQueue: (username: string) => void;
  waiting: boolean;
}

const JoinGame: React.FC<JoinGameProps> = ({ onJoinQueue, waiting }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    
    if (username.trim().length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }

    setError('');
    onJoinQueue(username.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-gray-900">
            4 in a Row
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect four discs in a row to win!
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={waiting}
                maxLength={20}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={waiting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {waiting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Looking for opponent...
                  </>
                ) : (
                  'Find Game'
                )}
              </button>
            </div>
          </form>

          {waiting && (
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Searching for an opponent...</p>
              <p className="text-xs mt-1">You'll play against a bot if no player joins within 10 seconds</p>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Game Rules:</p>
          <ul className="mt-2 space-y-1">
            <li>• Connect 4 discs vertically, horizontally, or diagonally</li>
            <li>• Take turns dropping discs into columns</li>
            <li>• First to connect 4 wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;