import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  show: boolean;
  onClose: () => void;
}

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Leaderboard: React.FC<LeaderboardProps> = ({ show, onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (show) {
      fetchLeaderboard();
    }
  }, [show]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/leaderboard`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError('Failed to load leaderboard. Please try again.');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 p-4 flex items-start sm:items-center justify-center">
      <div className="relative w-full max-w-2xl max-h-full overflow-y-auto mt-8 sm:mt-0">
        <div className="bg-white p-4 sm:p-5 border shadow-lg rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">🏆 Leaderboard</h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center h-32 items-center">Loading...</div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2 text-sm sm:text-base">{error}</div>
              <button 
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Retry
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No players yet!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm sm:text-base">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left">#</th>
                    <th className="px-2 sm:px-4 py-2 text-left">Player</th>
                    <th className="px-2 sm:px-4 py-2 text-center">Wins</th>
                    <th className="px-2 sm:px-4 py-2 text-center">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.playerId} className="border-b">
                      <td className="px-2 sm:px-4 py-2 font-medium">{index + 1}</td>
                      <td className="px-2 sm:px-4 py-2 font-medium truncate max-w-xs">{entry.username}</td>
                      <td className="px-2 sm:px-4 py-2 text-center">{entry.gamesWon}</td>
                      <td className="px-2 sm:px-4 py-2 text-center">{entry.winRatio.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;