const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  description: { type: String },
  logo: { type: String },
  website: { type: String },
  phone: { type: String },
  address: { type: String },
  services: [{ type: String }],
  specialties: [{ type: String }],
  portfolio: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isVerified: { type: Boolean, default: false },
  license: { type: String },
  insurance: { type: String },
  location: {
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Database indexes for performance
professionalSchema.index({ email: 1 }, { unique: true });
professionalSchema.index({ user: 1 });
professionalSchema.index({ isVerified: 1 });
professionalSchema.index({ rating: -1 });
professionalSchema.index({ createdAt: -1 });
professionalSchema.index({ 'location.city': 1 });
professionalSchema.index({ 'location.state': 1 });
professionalSchema.index({ services: 1 });
professionalSchema.index({ specialties: 1 });
// Compound indexes
professionalSchema.index({ isVerified: 1, rating: -1 });
professionalSchema.index({ 'location.city': 1, 'location.state': 1 });
professionalSchema.index({ services: 1, isVerified: 1 });
professionalSchema.index({ rating: -1, createdAt: -1 });
// Text index for search
professionalSchema.index({
  name: 'text',
  description: 'text',
  services: 'text',
  specialties: 'text'
});

module.exports = mongoose.model('Professional', professionalSchema);