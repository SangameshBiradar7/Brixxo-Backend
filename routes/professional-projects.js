const express = require('express');
const ProfessionalProject = require('../models/ProfessionalProject');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for multiple file uploads
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
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user's professional projects
router.get('/', auth, async (req, res) => {
  try {
    const { companyId, status, projectType, isFeatured } = req.query;

    let query = { professional: req.user.id };

    if (companyId) query.company = companyId;
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

    const projects = await ProfessionalProject.find(query)
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error('Error fetching professional projects:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single professional project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await ProfessionalProject.findOne({
      _id: req.params.id,
      professional: req.user.id
    }).populate('company', 'name');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('Error fetching professional project:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create new professional project
router.post('/', auth, upload.array('images', 20), async (req, res) => {
  try {
    const {
      title,
      description,
      companyId,
      projectType,
      status,
      startDate,
      endDate,
      budget,
      location,
      clientName,
      tags,
      isFeatured,
      isPublic
    } = req.body;

    // Validate required fields
    if (!title || !description || !companyId || !projectType || !startDate) {
      return res.status(400).json({
        message: 'Title, description, company, project type, and start date are required'
      });
    }

    // Verify company belongs to user
    const company = await Company.findOne({
      _id: companyId,
      admin: req.user.id
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found or access denied' });
    }

    // Handle file uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push('/uploads/' + file.filename);
      });
    }

    const project = new ProfessionalProject({
      title: title.trim(),
      description: description.trim(),
      company: companyId,
      professional: req.user.id,
      projectType,
      status: status || 'completed',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? parseFloat(budget) : null,
      location: location?.trim(),
      clientName: clientName?.trim(),
      images,
      featuredImage: images.length > 0 ? images[0] : null,
      tags: tags ? JSON.parse(tags) : [],
      isFeatured: isFeatured === 'true',
      isPublic: isPublic !== 'false' // Default to true
    });

    await project.save();

    // Populate company info for response
    await project.populate('company', 'name');

    console.log('✅ Professional project created:', project._id);
    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (err) {
    console.error('❌ Error creating professional project:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update professional project
router.put('/:id', auth, upload.array('images', 20), async (req, res) => {
  try {
    const project = await ProfessionalProject.findOne({
      _id: req.params.id,
      professional: req.user.id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const {
      title,
      description,
      companyId,
      projectType,
      status,
      startDate,
      endDate,
      budget,
      location,
      clientName,
      tags,
      isFeatured,
      isPublic
    } = req.body;

    // Update fields
    if (title) project.title = title.trim();
    if (description) project.description = description.trim();
    if (companyId) project.company = companyId;
    if (projectType) project.projectType = projectType;
    if (status) project.status = status;
    if (startDate) project.startDate = new Date(startDate);
    if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
    if (budget !== undefined) project.budget = budget ? parseFloat(budget) : null;
    if (location !== undefined) project.location = location?.trim();
    if (clientName !== undefined) project.clientName = clientName?.trim();
    if (tags) project.tags = JSON.parse(tags);
    if (isFeatured !== undefined) project.isFeatured = isFeatured === 'true';
    if (isPublic !== undefined) project.isPublic = isPublic === 'true';

    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => '/uploads/' + file.filename);
      project.images = [...project.images, ...newImages];

      // Update featured image if not set
      if (!project.featuredImage && newImages.length > 0) {
        project.featuredImage = newImages[0];
      }
    }

    await project.save();
    await project.populate('company', 'name');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (err) {
    console.error('Error updating professional project:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete professional project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await ProfessionalProject.findOne({
      _id: req.params.id,
      professional: req.user.id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await ProfessionalProject.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting professional project:', err);
    res.status(500).json({ message: err.message });
  }
});

// Toggle featured status
router.put('/:id/feature', auth, async (req, res) => {
  try {
    const project = await ProfessionalProject.findOne({
      _id: req.params.id,
      professional: req.user.id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.isFeatured = !project.isFeatured;
    await project.save();

    res.json({
      message: `Project ${project.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      project
    });
  } catch (err) {
    console.error('Error toggling project feature status:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get public portfolio (for homeowners to view)
router.get('/public/:companyId', async (req, res) => {
  try {
    const projects = await ProfessionalProject.find({
      company: req.params.companyId,
      isPublic: true
    })
    .populate('company', 'name')
    .sort({ isFeatured: -1, createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error('Error fetching public portfolio:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;