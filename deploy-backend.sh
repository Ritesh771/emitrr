#!/bin/bash

echo "🚀 Testing Backend Build for Render Deployment..."

# Navigate to backend directory
cd backend

# Clean install (simulating Render environment)
echo "📦 Installing dependencies..."
rm -rf node_modules
npm install --production=false

# Build the application
echo "🔨 Building backend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Backend built successfully!"
    echo "📁 Checking dist directory..."
    ls -la dist/
    echo ""
    echo "📋 Deployment Steps:"
    echo "1. Go to render.com and create a new Web Service"
    echo "2. Connect your GitHub repository"
    echo "3. Configure:"
    echo "   - Root Directory: backend"
    echo "   - Build Command: npm install --production=false && npm run build"
    echo "   - Start Command: npm start"
    echo "4. Add environment variables:"
    echo "   - NODE_ENV=production"
    echo "   - PORT=10000"
    echo "   - FRONTEND_URL=https://emitrr-six.vercel.app"
    echo "   - DATABASE_URL=[from Render PostgreSQL]"
    echo "5. Create PostgreSQL database and add DATABASE_URL"
    echo ""
    echo "🌐 Your frontend is ready at: https://emitrr-six.vercel.app"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi