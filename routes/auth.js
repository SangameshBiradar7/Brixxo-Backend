const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  console.log('🔄 Registration attempt:', req.body);
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    console.log('Existing user check:', existingUser ? 'User exists' : 'User not found');

    if (existingUser) {
      console.log('❌ Registration failed: User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create new user
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    console.log('✅ User saved to database:', user._id);

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('JWT token generated');

    // Return success response
    const response = { token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } };
    console.log('✅ Registration successful for:', user.email);
    res.status(201).json(response);

  } catch (err) {
    console.error('❌ Registration error:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log('🔄 Login attempt for:', req.body.email);
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      console.log('❌ Login failed: Wrong password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Login successful for:', user.email);

    // Return success response
    const response = { token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } };
    res.json(response);

  } catch (err) {
    console.error('❌ Login error:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:3000?token=${token}`);
});

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:3000?token=${token}`);
});

module.exports = router;