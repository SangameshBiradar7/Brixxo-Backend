require('dotenv').config();
const mongoose = require('mongoose');
const Professional = require('./models/Professional');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const sampleProfessionals = [
  {
    name: 'Rajesh Kumar Construction',
    email: 'rajesh@example.com',
    description: 'Expert construction services with 15+ years of experience in residential and commercial projects.',
    phone: '+91-9876543210',
    address: '123 Construction Street, Mumbai, Maharashtra',
    services: ['Construction', 'Renovation', 'Home Building'],
    specialties: ['Contractor', 'Residential Construction', 'Commercial Projects'],
    rating: 4.8,
    reviewCount: 127,
    isVerified: true,
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001'
    },
    businessHours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '16:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  },
  {
    name: 'Priya Interior Designs',
    email: 'priya@example.com',
    description: 'Transforming spaces into beautiful, functional interiors with modern design principles.',
    phone: '+91-9876543211',
    address: '456 Design Avenue, Delhi, NCR',
    services: ['Interior Design', 'Space Planning', 'Furniture Selection'],
    specialties: ['Interior Designer', 'Modern Design', 'Luxury Interiors'],
    rating: 4.9,
    reviewCount: 89,
    isVerified: true,
    location: {
      city: 'Delhi',
      state: 'NCR',
      zipCode: '110001'
    },
    businessHours: {
      monday: { open: '10:00', close: '19:00' },
      tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' },
      thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' },
      saturday: { open: '10:00', close: '17:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  },
  {
    name: 'Amit Renovation Experts',
    email: 'amit@example.com',
    description: 'Complete home renovation and remodeling services with attention to detail.',
    phone: '+91-9876543212',
    address: '789 Renovation Road, Bangalore, Karnataka',
    services: ['Renovation', 'Remodeling', 'Kitchen Renovation'],
    specialties: ['Renovator', 'Home Renovation', 'Kitchen Remodeling'],
    rating: 4.7,
    reviewCount: 156,
    isVerified: true,
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001'
    },
    businessHours: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '09:00', close: '15:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  },
  {
    name: 'Vikram Architects',
    email: 'vikram@example.com',
    description: 'Award-winning architectural firm specializing in residential and commercial design.',
    phone: '+91-9876543213',
    address: '321 Architecture Lane, Pune, Maharashtra',
    services: ['Architectural Design', 'Building Plans', '3D Visualization'],
    specialties: ['Architect', 'Residential Design', 'Commercial Architecture'],
    rating: 4.9,
    reviewCount: 203,
    isVerified: true,
    location: {
      city: 'Pune',
      state: 'Maharashtra',
      zipCode: '411001'
    },
    businessHours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  },
  {
    name: 'Green Solutions Engineering',
    email: 'green@example.com',
    description: 'Sustainable engineering solutions for modern construction projects.',
    phone: '+91-9876543214',
    address: '654 Engineering Plaza, Hyderabad, Telangana',
    services: ['Structural Engineering', 'HVAC Systems', 'Electrical Design'],
    specialties: ['Engineer', 'Structural Engineering', 'Sustainable Design'],
    rating: 4.6,
    reviewCount: 78,
    isVerified: true,
    location: {
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500001'
    },
    businessHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '09:00', close: '14:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  }
];

async function seedProfessionals() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dreambuild', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing professionals
    await Professional.deleteMany({});
    console.log('Cleared existing professionals');

    // Create users for professionals
    const professionalUsers = [];
    for (const prof of sampleProfessionals) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = new User({
        name: prof.name,
        email: prof.email,
        password: hashedPassword,
        role: 'professional'
      });
      await user.save();
      professionalUsers.push(user);
    }

    // Create professionals
    for (let i = 0; i < sampleProfessionals.length; i++) {
      const professional = new Professional({
        ...sampleProfessionals[i],
        user: professionalUsers[i]._id
      });
      await professional.save();
      console.log(`Created professional: ${professional.name}`);
    }

    console.log('✅ Successfully seeded professionals!');
    console.log(`📊 Created ${sampleProfessionals.length} professionals`);
    console.log('🔑 Login credentials: email/password123');

  } catch (error) {
    console.error('Error seeding professionals:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedProfessionals();