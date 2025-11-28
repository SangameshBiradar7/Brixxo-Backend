const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Contractor', 'Architect', 'Interior Designer', 'Engineer', 'Supplier', 'Other'], default: 'Contractor' },
  location: { type: String },
  logoUrl: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  website: { type: String },
  whatsapp: { type: String },
  address: { type: String },
  services: [{ type: String }],
  specializations: [{ type: String }],
  certifications: [{ type: String }],
  established: { type: String },
  employees: { type: String },
  logo: { type: String },
  portfolioImages: [{ type: String }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Professional who created this company
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }, // For soft delete and active status
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  pastProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Company', companySchema);