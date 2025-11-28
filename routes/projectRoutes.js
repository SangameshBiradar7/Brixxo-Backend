const express = require('express');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Test route to verify routes are working
router.get('/test', (req, res) => {
  console.log('🧪 Project test route called');
  res.json({
    message: 'Project routes are working!',
    timestamp: new Date().toISOString(),
    route: '/api/projects/test',
    status: 'success',
    server: 'running',
    note: 'This route bypasses the :id parameter matching',
    routes: ['GET /api/projects', 'GET /api/projects/:id', 'POST /api/projects']
  });
});

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Projects API: Fetching all projects');

    // Use the existing Project model which has the complex schema
    const projects = await Project.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ Projects API: Found ${projects.length} projects`);

    // Map the existing schema to the simplified format expected by frontend
    const formattedProjects = projects.map(project => ({
      _id: project._id,
      title: project.title,
      description: project.description,
      category: project.buildingType || 'General', // Map buildingType to category
      budget: project.budget,
      location: project.location,
      imageUrl: project.images && project.images.length > 0 ? project.images[0] : null,
      createdBy: project.createdBy || project.user || { name: 'Unknown User', email: '' }, // Handle both createdBy and user fields
      createdAt: project.createdAt
    }));

    console.log(`✅ Projects API: Returning ${formattedProjects.length} formatted projects`);
    res.json(formattedProjects);
  } catch (err) {
    console.error('❌ Projects API Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch projects'
    });
  }
});

// GET /api/projects/:id - Get single project by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Projects API: Fetching project details for ID:', req.params.id);

    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!project) {
      console.log('❌ Projects API: Project not found');
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Map to the simplified format expected by frontend
    const formattedProject = {
      _id: project._id,
      title: project.title,
      description: project.description,
      category: project.buildingType || 'General',
      budget: project.budget,
      location: project.location,
      imageUrl: project.images && project.images.length > 0 ? project.images[0] : null,
      createdBy: project.createdBy || project.user || { name: 'Unknown User', email: '' },
      createdAt: project.createdAt
    };

    console.log('✅ Projects API: Project details retrieved:', project.title);
    res.json(formattedProject);
  } catch (err) {
    console.error('❌ Projects API: Error fetching project:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch project details'
    });
  }
});

// POST /api/projects - Create new project (authenticated users only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('🔄 Projects API: Creating new project');
    console.log('User:', req.user.id, 'Role:', req.user.role);
    console.log('Request body keys:', Object.keys(req.body));

    // Validate required fields
    const { title, description, category, budget, location } = req.body;
    if (!title || !description || !category || !budget || !location) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Title, description, category, budget, and location are required'
      });
    }

    // Create project
    const projectData = {
      ...req.body,
      createdBy: req.user.id
    };

    const project = new Project(projectData);
    await project.save();

    console.log('✅ Projects API: Project created successfully:', project._id);
    res.status(201).json({
      ...project.toObject(),
      message: 'Project created successfully'
    });
  } catch (err) {
    console.error('❌ Projects API: Error creating project:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create project'
    });
  }
});

module.exports = router;