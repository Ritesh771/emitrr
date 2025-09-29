#!/bin/bash

echo "🎮 Setting up 4 in a Row Multiplayer Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 14+ for full functionality."
    echo "   You can still run the app without database persistence."
fi

echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cp .env.example .env

# Build backend
echo "🔨 Building backend..."
npm run build

cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development servers:"
echo "   npm run dev"
echo ""
echo "📋 Next steps:"
if ! command -v psql &> /dev/null; then
    echo "   1. Install PostgreSQL (optional but recommended)"
    echo "   2. Create database: createdb connect_four_game"
else
    echo "   1. Create database: createdb connect_four_game"
    echo "   2. Update backend/.env with your database credentials"
fi
echo "   3. Run: npm run dev"
echo ""
echo "🎯 The game will be available at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"