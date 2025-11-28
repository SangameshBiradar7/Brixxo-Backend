const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Professional = require('../models/Professional');
const Company = require('../models/Company');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects (public endpoint for homepage and listings)
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Getting all projects for public access');

    // Get projects that are either open homeowner requirements or published company/professional projects
    const projects = await Project.find({
      $or: [
        { status: 'open' }, // Homeowner requirements
        { company: { $exists: true }, isPublished: true }, // Company projects
        { professional: { $exists: true }, isPublic: true } // Professional projects
      ]
    }, null, { strictPopulate: false })
      .populate('company', 'name rating logo')
      .populate('professional', 'name rating logo')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(20); // Limit to prevent too many results

    console.log(`✅ Found ${projects.length} projects`);
    res.json(projects);
  } catch (err) {
    console.error('❌ Error fetching projects:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch projects'
    });
  }
});

// Get all open projects (for companies/professionals)
router.get('/open', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const projects = await Project.find({ status: 'open' }, null, { strictPopulate: false })
      .populate('user', 'name')
      .populate('proposals')
      .sort({ createdAt: -1 });

    // Add proposal count to each project
    const projectsWithCounts = projects.map(project => ({
      ...project.toObject(),
      proposalsCount: project.proposals ? project.proposals.length : 0
    }));

    res.json(projectsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search projects
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 Projects search API called with params:', req.query);

    const {
      q: searchQuery,
      budget,
      buildingType,
      location,
      sortBy = 'relevance',
      limit = 20,
      page = 1
    } = req.query;

    // Base query to include all types of projects
    let query = {
      $or: [
        { status: 'open' }, // Homeowner requirements
        { company: { $exists: true }, isPublished: true }, // Company projects
        { professional: { $exists: true }, isPublic: true } // Professional projects
      ]
    };

    console.log('📋 Base query:', JSON.stringify(query, null, 2));

    // Text search - combine with base query using $and
    if (searchQuery) {
      query = {
        $and: [
          query, // Include the base $or condition
          {
            $or: [
              { title: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { features: { $in: [new RegExp(searchQuery, 'i')] } }
            ]
          }
        ]
      };
      console.log('🔎 Added text search for:', searchQuery);
    }

    // Additional filters
    if (budget) {
      // Parse budget range (e.g., "₹45L - ₹65L")
      const budgetMatch = budget.match(/₹(\d+(?:\.\d+)?)(L|Cr)/);
      if (budgetMatch) {
        const amount = parseFloat(budgetMatch[1]);
        const unit = budgetMatch[2];
        const multiplier = unit === 'Cr' ? 10000000 : 100000; // 1 Cr = 1,00,00,000, 1L = 1,00,000
        query.budget = { $gte: amount * multiplier };
        console.log('💰 Added budget filter:', amount * multiplier);
      }
    }

    if (buildingType) {
      query.buildingType = buildingType;
      console.log('🏗️ Added building type filter:', buildingType);
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
      console.log('📍 Added location filter:', location);
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'budget-low':
        sortOptions = { budget: 1 };
        break;
      case 'budget-high':
        sortOptions = { budget: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { rating: -1, createdAt: -1 };
    }

    console.log('🔄 Final query:', JSON.stringify(query, null, 2));
    console.log('📊 Sort options:', sortOptions);
    console.log('📄 Limit:', limit, 'Page:', page);

    // Execute query with error handling
    const projects = await Project.find(query, null, { strictPopulate: false })
      .populate('createdBy', 'name')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Project.countDocuments(query);

    console.log('✅ Found', projects.length, 'projects out of', total, 'total');

    // Return successful response
    const response = {
      projects,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    };

    console.log('📤 Sending response with', projects.length, 'projects');
    res.json(response);

  } catch (err) {
    console.error('❌ Error in projects search API:', err);
    console.error('Error stack:', err.stack);

    // Return detailed error response
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch projects',
      timestamp: new Date().toISOString()
    });
  }
});

// Get my projects (homeowner)
router.get('/my/projects', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') return res.status(403).json({ message: 'Access denied' });
  try {
    const projects = await Project.find({ user: req.user.id }, null, { strictPopulate: false }).populate('proposals');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get featured projects for homepage (top-rated, newest, most viewed)
router.get('/featured', async (req, res) => {
  try {
    const limit = 2; // 2 from each category

    // Get top-rated projects (include company and professional projects)
    const topRated = await Project.find({
      $or: [
        { status: 'open' },
        { company: { $exists: true }, isPublished: true },
        { professional: { $exists: true }, isPublic: true }
      ]
    })
      .populate('company', 'name rating')
      .populate('professional', 'name')
      .sort({ rating: -1 })
      .limit(limit);

    // Get newest projects (include company and professional projects)
    const newest = await Project.find({
      $or: [
        { status: 'open' },
        { company: { $exists: true }, isPublished: true },
        { professional: { $exists: true }, isPublic: true }
      ]
    })
      .populate('company', 'name rating')
      .populate('professional', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Get most viewed projects (include company and professional projects)
    const mostViewed = await Project.find({
      $or: [
        { status: 'open' },
        { company: { $exists: true }, isPublished: true },
        { professional: { $exists: true }, isPublic: true }
      ]
    })
      .populate('company', 'name rating')
      .populate('professional', 'name')
      .sort({ views: -1 })
      .limit(limit);

    // Combine and remove duplicates
    const allProjects = [...topRated, ...newest, ...mostViewed];
    const uniqueProjects = allProjects.filter((project, index, self) =>
      index === self.findIndex(p => p._id.toString() === project._id.toString())
    );

    // Shuffle and limit to 6
    const shuffled = uniqueProjects.sort(() => 0.5 - Math.random());
    const featured = shuffled.slice(0, 6);

    res.json(featured);
  } catch (err) {
    console.error('Error fetching featured projects:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get top rated professionals
router.get('/top-professionals', async (req, res) => {
  try {
    const professionals = await Professional.find({ isVerified: true })
      .sort({ rating: -1 })
      .limit(8)
      .select('name rating portfolio logo address');

    res.json(professionals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get projects by company
router.get('/company/:companyId', async (req, res) => {
  try {
    const projects = await Project.find({ company: req.params.companyId }, null, { strict: false }).populate('company');
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects by company:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get projects by building type
router.get('/type/:buildingType', async (req, res) => {
  try {
    const { exclude } = req.query; // Optional parameter to exclude a specific project
    let query = { buildingType: req.params.buildingType, isPublished: true };

    if (exclude) {
      query._id = { $ne: exclude };
    }

    const projects = await Project.find(query, null, { strict: false })
      .populate('company', 'name rating')
      .sort({ rating: -1, createdAt: -1 })
      .limit(6);

    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects by building type:', err);
    res.status(500).json({ message: err.message });
  }
});


// Get awarded projects for company (projects where company's proposal was accepted)
router.get('/company/awarded', auth, async (req, res) => {
  console.log('🔄 Getting awarded projects for user:', req.user.id, 'Role:', req.user.role);

  if (req.user.role !== 'company_admin') {
    console.log('❌ Access denied - user role:', req.user.role);
    return res.status(403).json({ message: 'Access denied - company admin required' });
  }

  try {
    const company = await Company.findOne({ admin: req.user.id });
    console.log('🏢 Company found:', company ? company._id : 'No company');

    if (!company) {
      console.log('⚠️ No company found for user, returning empty array');
      return res.json([]); // Return empty array instead of error
    }

    // Find proposals that belong to this company and are accepted
    const acceptedProposals = await Proposal.find({
      company: company._id,
      status: 'accepted'
    }).select('_id');

    console.log('📋 Found accepted proposals:', acceptedProposals.length);

    if (acceptedProposals.length === 0) {
      console.log('⚠️ No accepted proposals, returning empty array');
      return res.json([]);
    }

    const proposalIds = acceptedProposals.map(p => p._id);
    console.log('🆔 Proposal IDs:', proposalIds);

    // Find projects where selectedProposal is one of the company's accepted proposals
    const projects = await Project.find({
      selectedProposal: { $in: proposalIds },
      status: { $in: ['in_progress', 'completed'] }
    }, null, { strict: false })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Validate that all projects have valid data
    const validProjects = projects.filter(project => {
      try {
        // Check if project has valid ObjectId references
        if (project.user && !mongoose.Types.ObjectId.isValid(project.user._id)) {
          console.warn(`⚠️ Project ${project._id} has invalid user reference`);
          return false;
        }
        return true;
      } catch (err) {
        console.warn(`⚠️ Error validating project ${project._id}:`, err.message);
        return false;
      }
    });

    console.log('✅ Found awarded projects:', validProjects.length);
    console.log('📄 Projects data:', validProjects.map(p => ({ id: p._id, title: p.title, status: p.status })));

    res.json(validProjects);
  } catch (err) {
    console.error('❌ Error getting awarded projects:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: err.message });
  }
});

// Get my company projects
router.get('/my/company', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const projects = await Project.find({ company: company._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id, null, { strictPopulate: false })
      .populate('proposals')
      .populate('user', 'name')
      .populate('company', 'name rating logo address description services admin contactPhone whatsapp contactEmail website')
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name' },
        options: { sort: { createdAt: -1 } }
      });
    res.json(project);
  } catch (err) {
    console.error('Error fetching project by ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create project (homeowner only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'homeowner') return res.status(403).json({ message: 'Access denied' });
  try {
    const project = new Project({ ...req.body, user: req.user.id });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update project status (homeowner)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.status = req.body.status;
    if (req.body.selectedProposal) project.selectedProposal = req.body.selectedProposal;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update project status (company - for awarded projects)
router.put('/:id/company/status', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if this company has an accepted proposal for this project
    const acceptedProposal = await Proposal.findOne({
      project: req.params.id,
      company: company._id,
      status: 'accepted'
    });

    if (!acceptedProposal) return res.status(403).json({ message: 'Access denied - not your project' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Only allow status updates for awarded projects
    if (project.status !== 'in_progress') return res.status(400).json({ message: 'Can only update status for in-progress projects' });

    project.status = req.body.status;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit proposal (company admin)
router.post('/:id/proposals', auth, async (req, res) => {
  console.log('🔄 Received proposal submission request');
  console.log('User:', req.user.id, 'Role:', req.user.role);
  console.log('Project ID:', req.params.id);
  console.log('Request body:', req.body);

  if (req.user.role !== 'company_admin') {
    console.log('❌ Access denied - user role:', req.user.role);
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
      console.log('❌ Company not found for user:', req.user.id);
      return res.status(404).json({ message: 'Company not found' });
    }

    const proposal = new Proposal({
      ...req.body,
      project: req.params.id,
      company: company._id
    });
    await proposal.save();

    await Project.findByIdAndUpdate(req.params.id, { $push: { proposals: proposal._id } });

    console.log('✅ Proposal submitted successfully:', proposal._id);
    res.status(201).json(proposal);
  } catch (err) {
    console.error('❌ Error submitting proposal:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get proposals for project (homeowner)
router.get('/:id/proposals', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user.id }).populate({
      path: 'proposals',
      populate: { path: 'company' }
    });
    res.json(project.proposals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept proposal (homeowner)
router.put('/:id/proposals/:proposalId/accept', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Proposal.findByIdAndUpdate(req.params.proposalId, { status: 'accepted' });
    project.selectedProposal = req.params.proposalId;
    project.status = 'in_progress';
    await project.save();
    res.json({ message: 'Proposal accepted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Create project (company admin)
router.post('/company', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    // Find the company for this admin
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const project = new Project({
      ...req.body,
      company: company._id,
      status: 'open' // Company projects are open by default
    });
    await project.save();

    // Add project to company's past projects
    await Company.findByIdAndUpdate(company._id, {
      $push: { pastProjects: project._id }
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update company project
router.put('/company/:id', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const project = await Project.findOne({ _id: req.params.id, company: company._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove image from company project
router.delete('/company/:id/images', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const project = await Project.findOne({ _id: req.params.id, company: company._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });

    // Remove the image from the project's images array
    const updatedImages = project.images.filter(img => img !== imageUrl);
    project.images = updatedImages;
    await project.save();

    res.json({
      message: 'Image removed successfully',
      images: updatedImages
    });
  } catch (err) {
    console.error('Error removing image:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete company project
router.delete('/company/:id', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const project = await Project.findOneAndDelete({ _id: req.params.id, company: company._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Remove from company's past projects
    await Company.findByIdAndUpdate(company._id, {
      $pull: { pastProjects: req.params.id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create demo project for company (for testing project management)
router.post('/demo', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company not found - please create your company profile first' });

    // Create a fake accepted proposal for this demo project
    const demoProposal = new Proposal({
      project: new mongoose.Types.ObjectId(), // Will be set to the actual project ID
      company: company._id,
      cost: req.body.budget || 7500000,
      timeline: req.body.timeline || '12 months',
      description: 'Demo proposal for testing project management features',
      costBreakdown: 'Demo cost breakdown',
      status: 'accepted' // Mark as accepted so it shows up in awarded projects
    });

    await demoProposal.save();

    // Create a demo project that appears as awarded to this company
    const demoProject = new Project({
      title: req.body.title,
      description: req.body.description,
      budget: req.body.budget,
      location: req.body.location,
      size: req.body.size,
      timeline: req.body.timeline,
      designStyle: req.body.designStyle,
      features: req.body.features,
      images: req.body.images,
      user: req.user.id, // The company admin becomes the "client" for demo purposes
      status: 'in_progress', // Demo projects start as in progress
      selectedProposal: demoProposal._id // Link to the accepted proposal
    });

    await demoProject.save();

    // Update the proposal with the actual project ID
    demoProposal.project = demoProject._id;
    await demoProposal.save();

    console.log('✅ Demo project created for company:', company._id);
    res.status(201).json({
      ...demoProject.toObject(),
      message: 'Demo project created successfully! You can now test project management features.'
    });
  } catch (err) {
    console.error('❌ Error creating demo project:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;