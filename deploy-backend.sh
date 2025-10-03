#!/bin/bash

echo "🚀 Deploying 4 in a Row Backend to Render..."

# Build the application
echo "📦 Building backend..."
cd backend
npm install
npm run build

echo "✅ Backend built successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Go to render.com and create a new Web Service"
echo "2. Connect your GitHub repository"
echo "3. Set Root Directory to 'backend'"
echo "4. Use these commands:"
echo "   Build Command: npm install && npm run build"
echo "   Start Command: npm start"
echo "5. Add environment variables from backend/.env.example"
echo "6. Create PostgreSQL database and add DATABASE_URL"
echo ""
echo "🌐 Your frontend is ready at: https://emitrr-six.vercel.app"