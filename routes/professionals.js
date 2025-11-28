const express = require('express');
const Professional = require('../models/Professional');
const Photo = require('../models/Photo'); // Ensure Photo model is loaded
const auth = require('../middleware/auth');

const router = express.Router();

// Get io instance for real-time updates
const getIo = () => {
  return require('../server').get('io') || null;
};

// Get all verified professionals
router.get('/', async (req, res) => {
  try {
    // Temporarily return all professionals to debug
    let professionals = await Professional.find({});
    console.log('Found professionals:', professionals.length);

    // If no professionals exist, create a test one
    if (professionals.length === 0) {
      console.log('Creating test professional...');
      const User = require('../models/User');
      const bcrypt = require('bcryptjs');

      // Create a test user first
      const hashedPassword = await bcrypt.hash('password123', 10);
      const testUser = new User({
        name: 'Test Professional',
        email: 'test@construction.com',
        password: hashedPassword,
        role: 'professional'
      });
      await testUser.save();

      const testProf = new Professional({
        name: 'Test Construction Co',
        email: 'test@construction.com',
        description: 'Professional construction services',
        phone: '+1234567890',
        address: '123 Test Street',
        services: ['Construction', 'Renovation'],
        specialties: ['Contractor', 'Residential Construction'],
        rating: 4.5,
        reviewCount: 10,
        isVerified: true,
        user: testUser._id,
        location: {
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        }
      });
      await testProf.save();
      console.log('Created test professional');
      professionals = [testProf];
    }

    if (professionals.length > 0) {
      console.log('Sample:', professionals[0].name, professionals[0].isVerified);
    }
    res.json(professionals);
  } catch (err) {
    console.error('Error fetching professionals:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get professional by ID
router.get('/:id', async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id).populate('portfolio user');
    res.json(professional);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create professional (authenticated user)
router.post('/', auth, async (req, res) => {
  try {
    const professional = new Professional({
      ...req.body,
      user: req.user.id,
      isVerified: true // Auto-verify for development/testing
    });
    await professional.save();

    // Emit real-time update to all connected clients
    const io = getIo();
    if (io) {
      io.emit('professionalCreated', {
        professional: professional.toObject(),
        action: 'create'
      });
    }

    res.status(201).json(professional);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my professional profile
router.get('/my/profile', auth, async (req, res) => {
  try {
    const professional = await Professional.findOne({ user: req.user.id });
    res.json(professional);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update my professional profile
router.put('/my/profile', auth, async (req, res) => {
  try {
    const professional = await Professional.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { new: true }
    );

    // Emit real-time update to all connected clients
    const io = getIo();
    if (io && professional) {
      io.emit('professionalUpdated', {
        professional: professional.toObject(),
        action: 'update'
      });
    }

    res.json(professional);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify professional (admin only)
router.put('/:id/verify', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    if (!professional) return res.status(404).json({ message: 'Professional not found' });

    // Emit real-time update to all connected clients
    const io = getIo();
    if (io) {
      io.emit('professionalVerified', {
        professional: professional.toObject(),
        action: 'verify'
      });
    }

    res.json(professional);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete professional profile
router.delete('/my/profile', auth, async (req, res) => {
  try {
    const professional = await Professional.findOneAndDelete({ user: req.user.id });
    if (!professional) return res.status(404).json({ message: 'Professional profile not found' });

    // Emit real-time update to all connected clients
    const io = getIo();
    if (io) {
      io.emit('professionalDeleted', {
        professionalId: professional._id,
        action: 'delete'
      });
    }

    res.json({ message: 'Professional profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search professionals
router.get('/search/:query', async (req, res) => {
  try {
    const professionals = await Professional.find({
      isVerified: true,
      $or: [
        { name: { $regex: req.params.query, $options: 'i' } },
        { description: { $regex: req.params.query, $options: 'i' } },
        { services: { $regex: req.params.query, $options: 'i' } }
      ]
    }).populate('portfolio');
    res.json(professionals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;