#!/bin/bash
# Quick install for Mac/Linux

echo "🚀 Installing Work Hours Tracker dependencies..."
echo ""

echo "📦 Backend..."
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  → Created backend/.env (please edit it with your PostgreSQL settings!)"
fi
cd ..

echo ""
echo "📦 Frontend..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Install complete!"
echo ""
echo "⚠️  IMPORTANT: Before starting, edit backend/.env with your PostgreSQL connection details."
echo "    See the README for setup instructions."
echo ""
echo "To run the app, open TWO terminals:"
echo "  Terminal 1:  cd backend  && npm start"
echo "  Terminal 2:  cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"
