require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');

async function checkDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dreambuild');

    console.log('📋 Checking all projects...');
    const projects = await Project.find({});

    console.log(`Found ${projects.length} projects:`);
    projects.forEach((p, i) => {
      console.log(`${i+1}. ID: ${p._id}`);
      console.log(`   Title: ${p.title}`);
      console.log(`   Company: ${p.company} (type: ${typeof p.company})`);
      console.log(`   Status: ${p.status}`);
      console.log(`   User: ${p.user}`);
      console.log('   ---');
    });

    // Check for invalid company values
    const invalidProjects = projects.filter(p => {
      if (p.company && typeof p.company === 'string') {
        return !mongoose.Types.ObjectId.isValid(p.company);
      }
      return false;
    });

    if (invalidProjects.length > 0) {
      console.log('❌ Found invalid projects:');
      invalidProjects.forEach(p => {
        console.log(`   Project ${p._id} has invalid company: "${p.company}"`);
      });
    } else {
      console.log('✅ All projects have valid company references');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

checkDatabase();