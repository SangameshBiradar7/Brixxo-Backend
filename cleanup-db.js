require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const Proposal = require('./models/Proposal');
const Company = require('./models/Company');

async function cleanupDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dreambuild');

    console.log('🧹 Starting database cleanup...');

    // Find and remove projects with invalid company references
    console.log('📋 Finding projects with invalid company references...');
    const projects = await Project.find({});

    let invalidProjects = [];
    let validProjects = [];

    for (const project of projects) {
      try {
        // Try to validate the company field
        if (project.company && typeof project.company === 'string') {
          // Check if it's a valid ObjectId format
          if (!mongoose.Types.ObjectId.isValid(project.company)) {
            invalidProjects.push(project);
            console.log(`❌ Invalid project found: ${project._id} - company: "${project.company}"`);
          } else {
            // Check if the company actually exists
            const companyExists = await Company.findById(project.company);
            if (!companyExists) {
              invalidProjects.push(project);
              console.log(`❌ Project with non-existent company: ${project._id} - company: ${project.company}`);
            } else {
              validProjects.push(project);
            }
          }
        } else if (project.company) {
          // It's an ObjectId, check if company exists
          const companyExists = await Company.findById(project.company);
          if (!companyExists) {
            invalidProjects.push(project);
            console.log(`❌ Project with non-existent company: ${project._id} - company: ${project.company}`);
          } else {
            validProjects.push(project);
          }
        } else {
          // No company field, might be a homeowner project
          validProjects.push(project);
        }
      } catch (err) {
        console.log(`❌ Error checking project ${project._id}:`, err.message);
        invalidProjects.push(project);
      }
    }

    // Remove invalid projects
    if (invalidProjects.length > 0) {
      console.log(`🗑️ Removing ${invalidProjects.length} invalid projects...`);
      for (const project of invalidProjects) {
        await Project.findByIdAndDelete(project._id);
        console.log(`✅ Removed invalid project: ${project._id}`);
      }
    }

    // Check for proposals with invalid company references
    console.log('📋 Checking proposals...');
    const proposals = await Proposal.find({});
    let invalidProposals = [];

    for (const proposal of proposals) {
      try {
        if (proposal.company) {
          const companyExists = await Company.findById(proposal.company);
          if (!companyExists) {
            invalidProposals.push(proposal);
            console.log(`❌ Proposal with invalid company: ${proposal._id} - company: ${proposal.company}`);
          }
        }
      } catch (err) {
        console.log(`❌ Error checking proposal ${proposal._id}:`, err.message);
        invalidProposals.push(proposal);
      }
    }

    // Remove invalid proposals
    if (invalidProposals.length > 0) {
      console.log(`🗑️ Removing ${invalidProposals.length} invalid proposals...`);
      for (const proposal of invalidProposals) {
        await Proposal.findByIdAndDelete(proposal._id);
        console.log(`✅ Removed invalid proposal: ${proposal._id}`);
      }
    }

    console.log('✅ Database cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Valid projects: ${validProjects.length}`);
    console.log(`   - Invalid projects removed: ${invalidProjects.length}`);
    console.log(`   - Invalid proposals removed: ${invalidProposals.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupDatabase();
}

module.exports = cleanupDatabase;