const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  budget: { type: Number, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String },
  images: [{ type: String }], // Array of image URLs
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' },
  proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }], // Array of proposal references
  selectedProposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }, // Selected/accepted proposal
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }, // For company-created projects
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' }, // For professional-created projects
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Homeowner who created the project (alias for createdBy)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  views: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false }, // For company/professional projects
  isPublic: { type: Boolean, default: false }, // For professional projects
  buildingType: { type: String }, // For categorization
  size: { type: String }, // Project size/area
  timeline: { type: String }, // Expected timeline
  designStyle: { type: String }, // Design style preference
  features: [{ type: String }], // Required features
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);