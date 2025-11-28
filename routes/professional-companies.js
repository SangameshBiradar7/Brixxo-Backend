const express = require('express');
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
    fileSize: 5 * 1024 * 1024, // 5MB limit for logos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for logos'));
    }
  }
});

// Get user's companies
router.get('/', auth, async (req, res) => {
  try {
    const companies = await Company.find({ admin: req.user.id })
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single company
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      admin: req.user.id
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create new company
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      phone,
      whatsapp,
      email,
      address,
      services,
      specializations,
      certifications,
      established,
      employees
    } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        message: 'Company name and description are required'
      });
    }

    // Check if user already has a company with this name
    const existingCompany = await Company.findOne({
      admin: req.user.id,
      name: name.trim()
    });

    if (existingCompany) {
      return res.status(400).json({
        message: 'You already have a company with this name'
      });
    }

    const company = new Company({
      name: name.trim(),
      description: description.trim(),
      website: website?.trim(),
      phone: phone?.trim(),
      whatsapp: whatsapp?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      services: services ? JSON.parse(services) : [],
      specializations: specializations ? JSON.parse(specializations) : [],
      certifications: certifications ? JSON.parse(certifications) : [],
      established: established?.trim(),
      employees: employees?.trim(),
      logo: req.file ? '/uploads/' + req.file.filename : null,
      admin: req.user.id
    });

    await company.save();

    console.log('✅ Company created:', company._id);
    res.status(201).json({
      message: 'Company created successfully',
      company
    });
  } catch (err) {
    console.error('❌ Error creating company:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update company
router.put('/:id', auth, upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      admin: req.user.id
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const {
      name,
      description,
      website,
      phone,
      whatsapp,
      email,
      address,
      services,
      specializations,
      certifications,
      established,
      employees
    } = req.body;

    // Update fields
    if (name) company.name = name.trim();
    if (description) company.description = description.trim();
    if (website !== undefined) company.website = website?.trim();
    if (phone !== undefined) company.phone = phone?.trim();
    if (whatsapp !== undefined) company.whatsapp = whatsapp?.trim();
    if (email !== undefined) company.email = email?.trim();
    if (address !== undefined) company.address = address?.trim();

    if (services) company.services = JSON.parse(services);
    if (specializations) company.specializations = JSON.parse(specializations);
    if (certifications) company.certifications = JSON.parse(certifications);

    if (established !== undefined) company.established = established?.trim();
    if (employees !== undefined) company.employees = employees?.trim();

    // Update logo if new file uploaded
    if (req.file) {
      company.logo = '/uploads/' + req.file.filename;
    }

    await company.save();

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete company
router.delete('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      admin: req.user.id
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Soft delete - you might want to mark as inactive instead
    await Company.findByIdAndDelete(req.params.id);

    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;