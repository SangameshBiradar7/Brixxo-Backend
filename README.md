# BRIXXO

A full-stack web application for connecting homeowners with construction companies through a digital marketplace.

## 🎯 Features

### For Homeowners
- **Post Requirements**: Submit detailed project requirements (budget, location, timeline, design preferences)
- **Compare Proposals**: Receive and compare proposals from multiple construction companies
- **Track Progress**: Monitor project milestones and view progress photos
- **Browse Companies**: Search and filter construction companies by location, rating, and services
- **Messaging System**: Chat directly with companies for negotiations

### For Construction Companies
- **Company Profile**: Create and manage professional company profiles
- **Portfolio Management**: Showcase completed projects with images and details
- **Proposal System**: Submit detailed proposals with cost breakdowns and timelines
- **Project Management**: Track ongoing projects and update milestone status
- **Client Communication**: Chat with homeowners and manage negotiations

### For Admins
- **User Management**: Manage homeowners and company accounts
- **Company Verification**: Approve and verify construction companies
- **Platform Analytics**: View transaction data and user statistics

## 🖥️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **OAuth** - Google/Facebook login

### Additional Services
- **Cloudinary** - Image hosting and management
- **Stripe** - Payment processing
- **Docker** - Containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brixxo
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Database Setup**
   - Ensure MongoDB is running
   - The app will automatically create collections

### Environment Variables

Create `.env` files in both backend and frontend directories:

#### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/brixxo
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### Frontend (.env.local)
```env
# For local development (default)
BACKEND_URL=http://localhost:5000

# For network access from other devices, replace with your IP:
# BACKEND_URL=http://YOUR_IP_ADDRESS:5000
```

### Network Access Setup

To access your application from other devices on your network:

1. **Automatic Setup (Windows)**:
   ```bash
   # Run the setup script
   setup-network-access.bat
   ```

2. **Manual Setup**:
   - Find your computer's IP address (run `ipconfig` in Command Prompt)
   - Update `frontend/.env.local`:
     ```env
     BACKEND_URL=http://YOUR_IP_ADDRESS:5000
     ```
   - Restart the frontend: `cd frontend && npm run dev`

3. **Access from other devices**:
   - Frontend: `http://YOUR_IP_ADDRESS:3001`
   - Backend: `http://YOUR_IP_ADDRESS:5000`

**Note**: Make sure your firewall allows connections on ports 3001 and 5000.

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📁 Project Structure

```
brixxo/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication & validation
│   ├── config/             # Passport OAuth setup
│   └── server.js           # Main server file
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   └── context/       # React context providers
├── docker/                 # Docker configuration
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/google` - Google OAuth
- `GET /auth/facebook` - Facebook OAuth

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Companies
- `GET /api/companies` - List verified companies
- `POST /api/companies` - Create company profile
- `GET /api/companies/my/company` - Get user's company
- `PUT /api/companies/my/company` - Update company profile

### Projects
- `GET /api/projects/open` - Get open projects (companies)
- `POST /api/projects` - Create project (homeowners)
- `GET /api/projects/my/projects` - Get user's projects
- `POST /api/projects/:id/proposals` - Submit proposal

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId` - Get conversation
- `GET /api/messages/project/:projectId` - Get project messages

### File Uploads
- `POST /api/uploads/images` - Upload images
- `POST /api/uploads/document` - Upload documents

## 🎨 UI/UX Guidelines

- **Clean Design**: Professional, modern interface
- **Responsive**: Mobile-first approach
- **Accessibility**: WCAG compliant
- **Dark/Light Mode**: Theme switching support
- **Progressive Web App**: PWA capabilities

## 🚀 Deployment

### Production Setup
1. Set production environment variables
2. Configure MongoDB Atlas for database
3. Set up Cloudinary for image storage
4. Configure Stripe for payments
5. Deploy backend to services like Heroku/Railway
6. Deploy frontend to Vercel/Netlify

### Docker Deployment
```bash
# Production build
docker-compose -f docker-compose.prod.yml up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@brixxo.com or create an issue in the repository.

---

**Built with ❤️ for the construction industry**