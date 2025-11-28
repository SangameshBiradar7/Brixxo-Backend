const mongoose = require('mongoose');

const professionalProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectType: {
    type: String,
    enum: ['interior-design', 'construction', 'renovation', 'architecture', 'consultation'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'ongoing', 'upcoming', 'draft'],
    default: 'completed'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  budget: {
    type: Number,
    min: 0
  },
  location: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  images: [{
    type: String // URLs to uploaded images
  }],
  featuredImage: {
    type: String // Main project image
  },
  tags: [{
    type: String,
    trim: true
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
professionalProjectSchema.index({ company: 1, createdAt: -1 });
professionalProjectSchema.index({ professional: 1, status: 1 });
professionalProjectSchema.index({ projectType: 1, isFeatured: 1 });
professionalProjectSchema.index({ isPublic: 1, isFeatured: 1 });

// Pre-save middleware to update updatedAt
professionalProjectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ProfessionalProject', professionalProjectSchema);