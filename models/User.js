const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['homeowner', 'contractor', 'architect', 'interior-designer', 'renovator', 'structural-engineer', 'estimation-engineer', 'company_admin', 'professional', 'admin'], default: 'homeowner' },
  avatar: { type: String },
  phone: { type: String },
  location: { type: String },
  isVerified: { type: Boolean, default: false },
  googleId: { type: String },
  facebookId: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
});

// Database indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ googleId: 1 });
userSchema.index({ facebookId: 1 });
// Compound indexes for common queries
userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);