# DreamBuild Marketplace - Installation Guide

This guide will help you set up the DreamBuild Marketplace application on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18 or higher** - [Download from nodejs.org](https://nodejs.org/)
- **MongoDB** - [Download Community Edition](https://www.mongodb.com/try/download/community)
- **Git** - [Download from git-scm.com](https://git-scm.com/)
- **A code editor** (VS Code recommended)

## 🚀 Quick Setup (Windows)

1. **Download or clone the project**
   ```bash
   git clone <repository-url>
   cd dreambuild-marketplace
   ```

2. **Run the setup script**
   ```bash
   setup-local.bat
   ```
   This will:
   - Check for Node.js and MongoDB
   - Install dependencies for both frontend and backend
   - Create default environment files

3. **Configure environment variables**
   Edit the following files with your actual credentials:

   **backend/.env**
   ```env
   MONGO_URI=mongodb://localhost:27017/dreambuild
   JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
   # Add other API keys as needed
   ```

   **frontend/.env.local**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. **Start MongoDB**
   ```bash
   # Open a new terminal/command prompt
   mongod
   ```

5. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

6. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Manual Setup

If the automated setup doesn't work, follow these steps:

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # or create manually
   ```

4. **Configure environment variables**
   Edit `.env` with your settings:
   ```env
   MONGO_URI=mongodb://localhost:27017/dreambuild
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000

   # OAuth (optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret

   # File uploads (optional)
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Payments (optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

5. **Start the backend**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (optional)
   ```bash
   # Create .env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
   ```

4. **Start the frontend**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

### Local MongoDB

1. **Install MongoDB Community Edition**
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Follow the installation instructions

2. **Start MongoDB**
   ```bash
   # Windows
   mongod

   # macOS (if installed via Homebrew)
   brew services start mongodb/brew/mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Verify MongoDB is running**
   ```bash
   mongo --eval "db.stats()"
   ```

### MongoDB Atlas (Cloud)

1. **Create a free account** at [mongodb.com/atlas](https://www.mongodb.com/atlas)

2. **Create a new cluster**
   - Choose the free tier
   - Select your preferred cloud provider and region

3. **Set up database access**
   - Create a database user
   - Add your IP address to the whitelist

4. **Get your connection string**
   - Click "Connect" → "Connect your application"
   - Copy the connection string

5. **Update your .env file**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dreambuild?retryWrites=true&w=majority
   ```

## 🔑 API Keys & Services

### Required for Full Functionality

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback`
   - `https://yourdomain.com/auth/google/callback`

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs
5. Get App ID and App Secret

#### Cloudinary (File Uploads)
1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Get your cloud name, API key, and API secret
3. Configure upload presets if needed

#### Stripe (Payments)
1. Sign up at [stripe.com](https://stripe.com/)
2. Get your publishable key and secret key
3. Configure webhooks for production

## 🐳 Docker Setup (Alternative)

If you prefer using Docker:

1. **Install Docker** from [docker.com](https://www.docker.com/)

2. **Build and run**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

## 🧪 Testing the Setup

### 1. Check Backend
```bash
curl http://localhost:5000/
# Should return: {"message": "Welcome to DreamBuild Marketplace API"}
```

### 2. Check Frontend
Open `http://localhost:3000` in your browser
- Should show the DreamBuild homepage
- Login/register buttons should work

### 3. Test Registration
1. Click "Sign Up"
2. Create an account
3. Should redirect to dashboard

### 4. Test Database
Check MongoDB for created collections:
```bash
mongo dreambuild
db.users.find()
```

## 🔧 Troubleshooting

### Common Issues

#### Backend won't start
- Check if MongoDB is running
- Verify environment variables
- Check for port conflicts (default: 5000)

#### Frontend won't start
- Ensure backend is running
- Check NEXT_PUBLIC_API_URL in .env.local
- Clear node_modules and reinstall

#### Database connection errors
- Verify MONGO_URI format
- Check MongoDB service status
- Ensure network connectivity for Atlas

#### Upload errors
- Check Cloudinary credentials
- Verify file size limits
- Check network connectivity

#### Authentication issues
- Verify JWT_SECRET is set
- Check token expiration
- Clear browser localStorage

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=* npm run dev

# Frontend
npm run dev
# Check browser console for errors
```

### Database Cleanup

If you encounter data corruption or invalid references, run the cleanup script:
```bash
cd backend
node cleanup-db.js
```

This will:
- Remove projects with invalid company references
- Remove proposals with invalid company references
- Ensure data integrity

### ObjectId Casting Errors

If you encounter "Cast to ObjectId failed" errors (especially with company fields), the system now handles this gracefully:

- **Added `{ strict: false }`** to all Project.find() queries that populate company fields
- **Error handling** prevents crashes when invalid data exists
- **Graceful degradation** - system continues working even with corrupted data
- **Detailed logging** helps identify and fix data issues

**The system is now resilient to database corruption and handles invalid ObjectId references automatically.**

### Demo Project Feature

For testing company project management features, companies can create demo projects:
- Go to Dashboard → Manage Projects
- Click "Create Demo Project"
- This creates a sample project that appears as awarded
- Test all project management features (status updates, etc.)

### Reset Everything

To start fresh:
```bash
# Stop all services
# Delete node_modules in both directories
rm -rf backend/node_modules frontend/node_modules

# Drop database
mongo dreambuild --eval "db.dropDatabase()"

# Reinstall and restart
```

## 📞 Support

If you encounter issues:
1. Check the console for error messages
2. Verify all prerequisites are installed
3. Ensure environment variables are correct
4. Check the [Issues](https://github.com/your-repo/issues) page

For additional help, create an issue with:
- Your operating system
- Node.js and MongoDB versions
- Full error messages
- Steps to reproduce

---

**Happy coding! 🎉**