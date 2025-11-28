const express = require('express');
const Requirement = require('../models/Requirement');
const Quote = require('../models/Quote');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
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

// Submit requirement (homeowners only)
router.post('/', auth, upload.array('attachments', 10), async (req, res) => {
  if (req.user.role !== 'homeowner') {
    return res.status(403).json({ message: 'Only homeowners can submit requirements' });
  }

  try {
    // Handle both JSON and FormData
    const data = req.body || {};
    const {
      serviceType,
      title,
      description,
      location,
      budget,
      timeline,
      priority,
      requestMultipleQuotes
    } = data;

    // Validate required fields
    if (!title || !description || !location || !budget) {
      return res.status(400).json({
        message: 'Missing required fields: title, description, location, and budget are required'
      });
    }

    // Parse timeline if it's a string
    let parsedTimeline = {};
    if (timeline) {
      try {
        parsedTimeline = typeof timeline === 'string' ? JSON.parse(timeline) : timeline;
      } catch (e) {
        console.warn('Failed to parse timeline:', e);
        parsedTimeline = {};
      }
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push('/uploads/' + file.filename);
      });
    }

    const requirement = new Requirement({
      homeowner: req.user.id,
      serviceType: serviceType || 'general',
      title,
      description,
      location,
      budget: parseFloat(budget),
      timeline: parsedTimeline,
      priority: priority || 'medium',
      requestMultipleQuotes: requestMultipleQuotes === 'true' || requestMultipleQuotes === true,
      attachments,
      status: 'open',
      isActive: true
    });

    await requirement.save();

    console.log('✅ Requirement submitted:', requirement._id);
    res.status(201).json({
      message: 'Requirement submitted successfully',
      requirement
    });
  } catch (err) {
    console.error('❌ Error submitting requirement:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get homeowner's requirements
router.get('/my', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') {
    return res.status(403).json({ message: 'Only homeowners can view their requirements' });
  }

  try {
    const requirements = await Requirement.find({ 
      homeowner: req.user.id,
      isActive: true 
    })
    .populate('quotes')
    .sort({ createdAt: -1 });

    res.json(requirements);
  } catch (err) {
    console.error('Error fetching homeowner requirements:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get open requirements for companies and professionals
router.get('/open', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can view open requirements' });
  }

  try {
    const { page = 1, limit = 20, buildingType, location, budgetRange } = req.query;

    let query = { 
      status: 'open',
      isActive: true 
    };

    // Add filters
    if (buildingType && buildingType !== 'all') {
      query.buildingType = buildingType;
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (budgetRange && budgetRange !== 'all') {
      query.budgetRange = budgetRange;
    }

    const requirements = await Requirement.find(query)
      .populate('homeowner', 'name location')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Requirement.countDocuments(query);

    res.json({
      requirements,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching open requirements:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single requirement details (public for companies and professionals)
router.get('/:id/public', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can view requirement details' });
  }

  try {
    const requirement = await Requirement.findOne({
      _id: req.params.id,
      status: 'open',
      isActive: true
    }).populate('homeowner', 'name email');

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found or no longer available' });
    }

    res.json(requirement);
  } catch (err) {
    console.error('Error fetching requirement details:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single requirement details (for homeowner)
router.get('/:id', auth, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id)
      .populate('homeowner', 'name email')
      .populate('quotes');

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    // Check if user has permission to view this requirement
    if (req.user.role === 'homeowner' && requirement.homeowner._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(requirement);
  } catch (err) {
    console.error('Error fetching requirement:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get quotes for a requirement (homeowner only)
router.get('/:id/quotes', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') {
    return res.status(403).json({ message: 'Only homeowners can view quotes' });
  }

  try {
    const requirement = await Requirement.findOne({
      _id: req.params.id,
      homeowner: req.user.id
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const quotes = await Quote.find({ 
      requirement: req.params.id,
      status: 'submitted',
      isActive: true
    })
    .populate('company', 'name rating logo phone whatsapp email admin')
    .sort({ createdAt: -1 });

    res.json(quotes);
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ message: err.message });
  }
});

// Select a quote (homeowner only)
router.put('/:id/select-quote', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') {
    return res.status(403).json({ message: 'Only homeowners can select quotes' });
  }

  try {
    const { quoteId } = req.body;

    const requirement = await Requirement.findOne({
      _id: req.params.id,
      homeowner: req.user.id
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const quote = await Quote.findOne({
      _id: quoteId,
      requirement: req.params.id
    });

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    // Update requirement
    requirement.selectedQuote = quoteId;
    requirement.status = 'company_selected';
    await requirement.save();

    // Update quote status
    quote.status = 'accepted';
    await quote.save();

    // Update other quotes to rejected
    await Quote.updateMany(
      { 
        requirement: req.params.id,
        _id: { $ne: quoteId }
      },
      { status: 'rejected' }
    );

    res.json({
      message: 'Quote selected successfully',
      requirement,
      selectedQuote: quote
    });
  } catch (err) {
    console.error('Error selecting quote:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update requirement status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    // Check permissions
    if (req.user.role === 'homeowner' && requirement.homeowner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    requirement.status = status;
    await requirement.save();

    res.json({
      message: 'Requirement status updated successfully',
      requirement
    });
  } catch (err) {
    console.error('Error updating requirement status:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete requirement (homeowner only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') {
    return res.status(403).json({ message: 'Only homeowners can delete requirements' });
  }

  try {
    const requirement = await Requirement.findOne({
      _id: req.params.id,
      homeowner: req.user.id
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    // Soft delete - mark as inactive
    requirement.isActive = false;
    requirement.status = 'cancelled';
    await requirement.save();

    // Also mark related quotes as inactive
    await Quote.updateMany(
      { requirement: req.params.id },
      { isActive: false, status: 'withdrawn' }
    );

    res.json({ message: 'Requirement deleted successfully' });
  } catch (err) {
    console.error('Error deleting requirement:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;