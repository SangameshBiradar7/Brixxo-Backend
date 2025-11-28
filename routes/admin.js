const express = require('express');
const User = require('../models/User');
const Professional = require('../models/Professional');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Message = require('../models/Message');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get database overview (admin only)
router.get('/overview', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const stats = {
      users: await User.countDocuments(),
      professionals: await Professional.countDocuments(),
      projects: await Project.countDocuments(),
      proposals: await Proposal.countDocuments(),
      messages: await Message.countDocuments(),
      payments: await Payment.countDocuments()
    };

    res.json({
      message: 'Database Overview',
      stats,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (admin only)
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all professionals (admin only)
router.get('/professionals', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const professionals = await Professional.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(professionals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all projects (admin only)
router.get('/projects', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const projects = await Project.find({}, null, { strict: false })
      .populate('user', 'name email')
      .populate('company', 'name')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('Error fetching admin projects:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all proposals (admin only)
router.get('/proposals', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const proposals = await Proposal.find({}, null, { strict: false })
      .populate('project', 'title')
      .populate('company', 'name')
      .sort({ createdAt: -1 });
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching admin proposals:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all messages (admin only)
router.get('/messages', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const messages = await Message.find().populate('sender', 'name email').populate('receiver', 'name email').sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all payments (admin only)
router.get('/payments', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const payments = await Payment.find({}, null, { strict: false })
      .populate('user', 'name email')
      .populate('company', 'name')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Error fetching admin payments:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete professional (admin only)
router.delete('/professionals/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const professional = await Professional.findByIdAndDelete(req.params.id);
    if (!professional) return res.status(404).json({ message: 'Professional not found' });
    res.json({ message: 'Professional deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete project (admin only)
router.delete('/projects/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;