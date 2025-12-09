require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const passport = require('./config/passport');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const cache = require('memory-cache');

// Redis client for caching
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
}

const app = express();
const server = http.createServer(app);

// Socket.IO configuration - Initialize once and reuse
const socketOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3000","https://brixxo.in", "http://localhost:3001","https://www.brixxo.in","https://brixxo-frontend-zdqa-n6ecayzei-sangameshs-projects-fd9ee526.vercel.app","*"]

const io = socketIo(server, {
  cors: {
    origin: socketOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Prevent duplicate connections
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Store connected users globally to prevent memory leaks
const connectedUsers = new Map();

// Compression middleware
app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024, // Compress responses over 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/uploads/');
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/auth', authLimiter);
app.use(limiter);

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging
app.use(morgan('combined'));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport initialization
app.use(passport.initialize());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|dwg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// Make upload middleware available to routes
app.set('upload', upload);

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedBody = cache.get(key);

    if (cachedBody && !req.headers['cache-control']) {
      res.set('X-Cache', 'HIT');
      return res.send(cachedBody);
    }

    res.set('X-Cache', 'MISS');
    const originalSend = res.send;
    res.send = function(body) {
      cache.put(key, body, duration * 1000); // Cache for specified duration
      originalSend.call(this, body);
    };
    next();
  };
};

// Redis cache helper
const redisCache = {
  get: async (key) => {
    if (redisClient) {
      try {
        return await redisClient.get(key);
      } catch (error) {
        console.error('Redis get error:', error);
        return null;
      }
    }
    return cache.get(key);
  },
  set: async (key, value, duration) => {
    if (redisClient) {
      try {
        await redisClient.setEx(key, duration, JSON.stringify(value));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
    cache.put(key, value, duration * 1000);
  }
};

// Serve uploaded files statically with caching headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,
  lastModified: true
}));

// Seed sample data function
const seedSampleData = async () => {
  try {
    console.log('🌱 Seeding sample data...');

    // Check if data already exists
    const existingProjects = await mongoose.connection.db.collection('projects').countDocuments();
    if (existingProjects > 0) {
      console.log('✅ Sample data already exists, skipping seed');
      return;
    }

    // Sample projects
    const sampleProjects = [
      {
        title: "Modern 3BHK Villa Interior Design",
        description: "Complete interior design for a modern 3BHK villa including living room, bedrooms, kitchen, and bathrooms. Looking for contemporary design with warm colors.",
        category: "interior-design",
        budget: 800000,
        location: "Bangalore, Karnataka",
        status: "open",
        buildingType: "Villa",
        size: "2500 sq ft",
        timeline: "3 months",
        designStyle: "Modern Contemporary",
        features: ["Living Room", "Bedrooms", "Kitchen", "Bathrooms"],
        rating: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Commercial Office Renovation",
        description: "Renovation of 5000 sq ft commercial office space. Need modern workspace design with meeting rooms, open plan layout, and ergonomic furniture.",
        category: "renovation",
        budget: 2500000,
        location: "Mumbai, Maharashtra",
        status: "open",
        buildingType: "Commercial",
        size: "5000 sq ft",
        timeline: "6 months",
        designStyle: "Modern Office",
        features: ["Open Plan", "Meeting Rooms", "Ergonomic Design"],
        rating: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Architectural Design for Bungalow",
        description: "Complete architectural design for a luxury bungalow including floor plans, elevations, 3D renders, and construction drawings.",
        category: "architecture",
        budget: 150000,
        location: "Pune, Maharashtra",
        status: "open",
        buildingType: "Bungalow",
        size: "4000 sq ft",
        timeline: "2 months",
        designStyle: "Luxury Modern",
        features: ["Floor Plans", "Elevations", "3D Renders", "Construction Drawings"],
        rating: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert sample projects
    await mongoose.connection.db.collection('projects').insertMany(sampleProjects);
    console.log('✅ Sample projects added to database');

    // Sample professionals
    const sampleProfessionals = [
      {
        name: "Rajesh Kumar Interior Design",
        email: "rajesh@example.com",
        description: "Award-winning interior designer with 15+ years experience in luxury residential and commercial projects.",
        services: ["Interior Design", "Space Planning", "Furniture Design"],
        specialties: ["Modern Design", "Luxury Interiors", "Commercial Spaces"],
        rating: 4.8,
        reviewCount: 45,
        isVerified: true,
        location: {
          city: "Bangalore",
          state: "Karnataka",
          zipCode: "560001"
        },
        tagline: "Transforming spaces into dreams",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Green Valley Constructions",
        email: "info@greenvalley.com",
        description: "Trusted construction company specializing in residential and commercial projects with quality craftsmanship.",
        services: ["Construction", "Renovation", "Project Management"],
        specialties: ["Villa Construction", "Office Renovation", "Quality Workmanship"],
        rating: 4.6,
        reviewCount: 32,
        isVerified: true,
        location: {
          city: "Mumbai",
          state: "Maharashtra",
          zipCode: "400001"
        },
        tagline: "Building dreams with excellence",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert sample professionals
    await mongoose.connection.db.collection('professionals').insertMany(sampleProfessionals);
    console.log('✅ Sample professionals added to database');

    console.log('🎉 Sample data seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  }
};

// MongoDB Connection with proper error handling
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dreambuild';

    // Check for placeholder/invalid connection strings
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI environment variable is required in production');
        console.error('Please set MONGO_URI in your Render environment variables');
        console.error('Get your connection string from MongoDB Atlas → Connect → Connect your application');
        return;
      }

      // Check for placeholder values
      if (mongoUri.includes('username:password') || mongoUri.includes('xxxxx.mongodb.net')) {
        console.error('❌ MONGO_URI contains placeholder values');
        console.error('Please replace with your actual MongoDB Atlas connection string');
        console.error('Example: mongodb+srv://yourusername:yourpassword@cluster0.abcde.mongodb.net/dreambuild');
        console.error('Get your connection string from MongoDB Atlas dashboard');
        return;
      }
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('Connection URI starts with:', mongoUri.substring(0, 20) + '...');

    // Temporary debugging code
    console.log("URI =>", process.env.MONGO_URI);

    // Test connection with simple mongoose.connect
    await mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log("DB connected"))
      .catch(err => console.error("DB error:", err));

    console.log('✅ MongoDB connected successfully');

    // Seed sample data after successful connection
    await seedSampleData();

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    if (process.env.NODE_ENV === 'production') {
      console.error('💡 Common issues:');
      console.error('   - Wrong username/password in connection string');
      console.error('   - IP whitelist not configured in MongoDB Atlas');
      console.error('   - Database user permissions incorrect');
      console.error('   - Network access restrictions');
      console.error('🔗 Check: https://docs.mongodb.com/atlas/troubleshoot-connection/');
    }

    // Don't exit process, let the app handle reconnection
    console.log('🔄 Retrying connection in 10 seconds...');
    setTimeout(connectDB, 10000); // Retry after 10 seconds in production
  }
};

connectDB();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected, attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient ? (redisClient.isOpen ? 'connected' : 'disconnected') : 'not configured'
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    connections: Object.keys(io.sockets.sockets).length,
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  };
  res.json(metrics);
});

// Cache status endpoint
app.get('/cache/status', (req, res) => {
  const status = {
    memoryCache: {
      size: cache.size(),
      keys: cache.keys()
    },
    redisConnected: redisClient ? redisClient.isOpen : false
  };
  res.json(status);
});

// Clear cache endpoint (admin only)
app.post('/cache/clear', (req, res) => {
  cache.clear();
  if (redisClient) {
    redisClient.flushAll();
  }
  res.json({ message: 'Cache cleared successfully' });
});

// Routes with caching where appropriate
app.use('/api/auth', require('./routes/auth'));

// Cache public API responses for 5 minutes
app.use('/api/professionals', cacheMiddleware(300), require('./routes/professionals'));
app.use('/api/companies', cacheMiddleware(300), require('./routes/companies'));

// Projects routes - ensure they are loaded correctly
const projectRoutes = require('./routes/projectRoutes');
const projectsRoutes = require('./routes/projects');
console.log('🔧 Loading project routes...');
app.use('/api/projects', projectsRoutes); // Mount search routes first
app.use('/api/projects', projectRoutes);
console.log('✅ Project routes loaded at /api/projects');

// Non-cached routes (require authentication or real-time data)
app.use('/api/users', require('./routes/users'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/requirements', require('./routes/requirements'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/professional-companies', require('./routes/professional-companies'));
app.use('/api/professional-projects', require('./routes/professional-projects'));

// Root endpoint
app.get('/', cacheMiddleware(3600), (req, res) => { // Cache for 1 hour
  res.json({
    message: 'Welcome to DreamBuild Marketplace API',
    version: '1.0.0',
    status: 'operational',
    features: [
      'User Authentication',
      'Professional Management',
      'Project Showcase',
      'Real-time Messaging',
      'Payment Processing',
      'Analytics & Monitoring'
    ]
  });
});

// Socket.io connection handling - Single initialization
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // User joins their personal room for notifications
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      connectedUsers.set(userId, socket.id);
      console.log(`👤 User ${userId} joined room (socket: ${socket.id})`);
    }
  });

  // Handle sending messages
  socket.on('sendMessage', async (data) => {
    try {
      console.log(`📤 Message from ${data.senderId} to ${data.receiverId}`);

      const Message = require('./models/Message');
      const message = new Message({
        sender: data.senderId,
        receiver: data.receiverId,
        conversationId: data.conversationId,
        inquiry: data.inquiryId,
        content: data.content,
        messageType: data.messageType || 'text'
      });

      await message.save();
      await message.populate('sender', 'name email');
      await message.populate('receiver', 'name email');

      // Emit to receiver if online
      if (connectedUsers.has(data.receiverId)) {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        io.to(receiverSocketId).emit('newMessage', message);
        console.log(`📨 Message delivered to ${data.receiverId} (socket: ${receiverSocketId})`);
      } else {
        console.log(`📭 User ${data.receiverId} not online, message stored`);
      }

      // Emit back to sender for confirmation
      socket.emit('messageSent', message);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('messageError', { error: 'Failed to send message', details: error.message });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    if (connectedUsers.has(data.receiverId)) {
      const receiverSocketId = connectedUsers.get(data.receiverId);
      io.to(receiverSocketId).emit('userTyping', {
        senderId: data.senderId,
        conversationId: data.conversationId
      });
    }
  });

  socket.on('stopTyping', (data) => {
    if (connectedUsers.has(data.receiverId)) {
      const receiverSocketId = connectedUsers.get(data.receiverId);
      io.to(receiverSocketId).emit('userStopTyping', {
        senderId: data.senderId,
        conversationId: data.conversationId
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id} (reason: ${reason})`);

    // Remove user from connected users map
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👋 User ${userId} removed from connected users`);
        break;
      }
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Application Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'This resource already exists',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /health',
      'GET /metrics',
      'POST /auth/login',
      'POST /auth/register',
      'GET /api/projects',
      'GET /api/companies',
      'GET /api/professionals'
    ]
  });
});

// Make io and cache available to routes
app.set('io', io);
app.set('cache', redisCache);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`🛑 Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed.');

    // Disconnect all socket connections
    io.disconnectSockets(true);
    console.log('✅ All socket connections closed.');

    // Close Redis connection
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log('✅ Redis connection closed.');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
      }
    }

    // Close MongoDB connection
    mongoose.connection.close().then(() => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    }).catch((err) => {
      console.error('❌ Error closing MongoDB connection:', err);
      process.exit(1);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
});
