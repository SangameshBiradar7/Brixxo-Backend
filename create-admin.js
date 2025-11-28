require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dreambuild', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@buildconnect.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@buildconnect.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@buildconnect.com',
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@buildconnect.com');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('🔗 You can now access the database at:');
    console.log('http://localhost:5000/api/admin/overview');
    console.log('http://localhost:5000/api/admin/users');
    console.log('http://localhost:5000/api/admin/companies');
    console.log('http://localhost:5000/api/admin/projects');
    console.log('http://localhost:5000/api/admin/proposals');
    console.log('http://localhost:5000/api/admin/messages');
    console.log('http://localhost:5000/api/admin/payments');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createAdmin();