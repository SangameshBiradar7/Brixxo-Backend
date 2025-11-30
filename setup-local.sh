#!/bin/bash

echo "🏗️  BuildConnect - Local Setup Script"
echo "====================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker from https://docker.com/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "✅ Prerequisites check passed!"
echo ""

# Setup environment
echo "🔧 Setting up environment..."

# Copy environment files
if [ ! -f "backend/.env" ]; then
    cp backend/.env backend/.env.local 2>/dev/null || echo "# MongoDB
MONGO_URI=mongodb://localhost:27017/dreambuild
JWT_SECRET=your_super_secret_jwt_key_here

# OAuth (optional - add later)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# File uploads (optional - add later)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Payments (optional - add later)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key" > backend/.env
    echo "✅ Created backend/.env with default configuration"
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing backend dependencies..."
cd backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

cd ..
echo "✅ Dependencies installed!"
echo ""

# Start services
echo "🚀 Starting services with Docker..."

cd docker

echo "Starting MongoDB, Backend, and Frontend..."
docker-compose up --build -d

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   MongoDB: localhost:27017"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Register a new account"
echo "   3. Explore the platform!"
echo ""
echo "🛠️  To stop the services: cd docker && docker-compose down"
echo "🛠️  To view logs: cd docker && docker-compose logs -f"
echo ""
echo "Happy building! 🏗️✨"