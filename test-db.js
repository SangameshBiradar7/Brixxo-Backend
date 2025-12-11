const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔄 Testing MongoDB connection...');
  console.log('Connection URI:', process.env.MONGO_URI.substring(0, 50) + '...');

  try {
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };

    console.log('⏳ Attempting connection with timeout options...');
    await mongoose.connect(process.env.MONGO_URI, options);

    console.log('✅ MongoDB connected successfully!');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);

    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));

    await mongoose.disconnect();
    console.log('✅ Connection test completed successfully');

  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);

    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 This usually means:');
      console.error('   - Wrong connection string');
      console.error('   - Network connectivity issues');
      console.error('   - MongoDB Atlas cluster is paused or deleted');
      console.error('   - IP whitelist restrictions');
    }

    if (error.code === 'ETIMEOUT') {
      console.error('💡 ETIMEOUT suggests DNS resolution or network issues');
    }

    process.exit(1);
  }
}

testConnection();