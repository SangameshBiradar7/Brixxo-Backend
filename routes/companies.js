const express = require('express');
const Company = require('../models/Company');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all active companies (for professionals page)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Companies API: Fetching all active companies');

    const companies = await Company.find({ isActive: true })
      .populate('admin', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ Companies API: Found ${companies.length} active companies`);
    res.json(companies);
  } catch (err) {
    console.error('❌ Companies API Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch companies'
    });
  }
});

// Get company by ID (detailed view with projects)
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Companies API: Fetching company details for ID:', req.params.id);

    const company = await Company.findById(req.params.id)
      .populate('pastProjects')
      .populate('reviews')
      .populate('admin', 'name email')
      .populate('createdBy', 'name email');

    if (!company) {
      console.log('❌ Companies API: Company not found');
      return res.status(404).json({
        error: 'Not found',
        message: 'Company not found'
      });
    }

    console.log('✅ Companies API: Company details retrieved:', company.name);
    res.json(company);
  } catch (err) {
    console.error('❌ Companies API: Error fetching company:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch company details'
    });
  }
});

// Create company (professionals can create companies)
router.post('/', auth, async (req, res) => {
  console.log('🔄 Companies API: Received company creation request');
  console.log('User:', req.user.id, 'Role:', req.user.role);
  console.log('Request body keys:', Object.keys(req.body));

  // Allow both company_admin and professional roles to create companies
  if (!['company_admin', 'professional'].includes(req.user.role)) {
    console.log('❌ Access denied - user role:', req.user.role);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only professionals and company admins can create companies'
    });
  }

  try {
    // Validate required fields
    const { name, category, location } = req.body;
    if (!name || !category || !location) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, category, and location are required'
      });
    }

    // Create company with professional as creator
    const companyData = {
      ...req.body,
      admin: req.user.id,
      createdBy: req.user.id, // Track who created it
      isActive: true
    };

    const company = new Company(companyData);
    await company.save();

    console.log('✅ Companies API: Company created successfully:', company._id);
    res.status(201).json({
      ...company.toObject(),
      message: 'Company created successfully'
    });
  } catch (err) {
    console.error('❌ Companies API: Error creating company:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create company'
    });
  }
});

// Get my company
router.get('/my/company', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ admin: req.user.id });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update my company
router.put('/my/company', auth, async (req, res) => {
  console.log('🔄 Received company update request');
  console.log('User:', req.user);
  console.log('Request body keys:', Object.keys(req.body));

  try {
    const company = await Company.findOneAndUpdate({ admin: req.user.id }, req.body, { new: true });
    console.log('✅ Company updated successfully:', company?._id);
    res.json(company);
  } catch (err) {
    console.error('❌ Error updating company:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete my company
router.delete('/my/company', auth, async (req, res) => {
  try {
    const company = await Company.findOneAndDelete({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all companies
router.get('/admin/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const companies = await Company.find().populate('admin', 'name email').populate('pastProjects');
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Verify company
router.put('/admin/verify/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;