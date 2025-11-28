const express = require('express');
const Inquiry = require('../models/Inquiry');
const Company = require('../models/Company');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Submit inquiry (any authenticated user)
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, company: companyId, name, email, phone, message, preferredContact } = req.body;

    let companyToContact;
    let projectToReference = null;

    if (projectId) {
      // If projectId is provided, validate project exists and get company from project
      const project = await Project.findById(projectId).populate('company');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!project.company) {
        return res.status(400).json({ message: 'This project is not associated with a company' });
      }

      companyToContact = project.company._id;
      projectToReference = projectId;
    } else if (companyId) {
      // If companyId is provided directly, validate company exists
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      companyToContact = companyId;
    } else {
      return res.status(400).json({ message: 'Either projectId or company must be provided' });
    }

    // Allow multiple inquiries - users can contact companies multiple times
    // This enables follow-ups, additional questions, or different requirements

    // Create inquiry
    const inquiry = new Inquiry({
      user: req.user.id,
      company: companyToContact,
      project: projectToReference,
      name,
      email,
      phone,
      message,
      preferredContact: preferredContact || 'email'
    });

    await inquiry.save();

    // Populate response
    await inquiry.populate([
      { path: 'user', select: 'name email' },
      { path: 'company', select: 'name email' },
      { path: 'project', select: 'title' }
    ]);

    console.log('✅ Inquiry submitted:', inquiry._id);
    res.status(201).json({
      message: 'Inquiry submitted successfully',
      inquiry
    });
  } catch (err) {
    console.error('❌ Error submitting inquiry:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get inquiries for company (company admin only)
router.get('/company', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const { status, page = 1, limit = 20 } = req.query;

    let query = { company: company._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const inquiries = await Inquiry.find(query)
      .populate('user', 'name email phone')
      .populate('project', 'title location budget')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Inquiry.countDocuments(query);

    res.json({
      inquiries,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching company inquiries:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get user's inquiries (any authenticated user)
router.get('/my', auth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ user: req.user.id })
      .populate('company', 'name email phone logo')
      .populate('project', 'title location budget images')
      .sort({ createdAt: -1 });

    res.json(inquiries);
  } catch (err) {
    console.error('Error fetching user inquiries:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update inquiry status (company admin only)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const { status, notes } = req.body;

    // Find company
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Find and update inquiry
    const inquiry = await Inquiry.findOne({
      _id: req.params.id,
      company: company._id
    });

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    inquiry.status = status;
    if (notes !== undefined) {
      inquiry.notes = notes;
    }

    await inquiry.save();

    // Populate response
    await inquiry.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'project', select: 'title location' }
    ]);

    res.json({
      message: 'Inquiry status updated successfully',
      inquiry
    });
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single inquiry details
router.get('/:id', auth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('company', 'name email phone logo address')
      .populate('project', 'title description location budget images');

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user has permission to view this inquiry
    const isCompanyAdmin = req.user.role === 'company_admin' &&
      inquiry.company._id.toString() === (await Company.findOne({ admin: req.user.id }))?._id?.toString();

    const isUserOwner = inquiry.user._id.toString() === req.user.id;

    if (!isCompanyAdmin && !isUserOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(inquiry);
  } catch (err) {
    console.error('Error fetching inquiry:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;