#!/bin/bash

echo "🧪 Testing Connect Four Database Setup..."

# Test database connection
echo "📡 Testing database connection..."
DB_TEST=$(psql -d connect_four_game -U gameuser -t -c "SELECT 'DB_CONNECTED';" 2>/dev/null)
if [[ $DB_TEST == *"DB_CONNECTED"* ]]; then
    echo "✅ Database connection: WORKING"
else
    echo "❌ Database connection: FAILED"
    exit 1
fi

# Test table structure
echo "📋 Testing table structure..."
TABLE_COUNT=$(psql -d connect_four_game -U gameuser -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
if [[ $TABLE_COUNT -eq 3 ]]; then
    echo "✅ Database tables: FOUND (3 tables)"
else
    echo "❌ Database tables: MISSING (found $TABLE_COUNT tables)"
    exit 1
fi

# Test backend API connection
echo "🚀 Testing backend API..."
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null | grep -o "OK" || echo "FAILED")
if [[ $HEALTH_CHECK == "OK" ]]; then
    echo "✅ Backend API: WORKING"
else
    echo "❌ Backend API: FAILED"
    exit 1
fi

# Test leaderboard endpoint
echo "📊 Testing leaderboard endpoint..."
LEADERBOARD=$(curl -s http://localhost:3001/api/leaderboard 2>/dev/null)
if [[ $LEADERBOARD == "[]" ]]; then
    echo "✅ Leaderboard API: WORKING (empty as expected)"
else
    echo "❌ Leaderboard API: UNEXPECTED RESPONSE"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Production database setup is complete."
echo ""
echo "📋 Database Summary:"
echo "   • Database: connect_four_game"
echo "   • User: gameuser"
echo "   • Tables: players, games, game_moves"
echo "   • Indexes: 5 performance indexes created"
echo ""
echo "🚀 Game URLs:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:3001"
echo "   • Health:   http://localhost:3001/api/health"
echo ""
echo "🎮 Ready to play Connect Four with persistent storage!"