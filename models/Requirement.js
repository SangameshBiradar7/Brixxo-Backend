const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  homeowner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['interior-design', 'construction', 'renovation', 'architecture', 'general'],
    default: 'general'
  },
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
  designPreferences: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetRange: {
    type: String,
    enum: ['Under ₹10L', '₹10L - ₹25L', '₹25L - ₹50L', '₹50L - ₹1Cr', '₹1Cr - ₹2Cr', 'Above ₹2Cr']
  },
  timeline: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  buildingType: {
    type: String,
    enum: ['Apartment', 'Villa', 'Duplex', 'Triplex', 'Bungalow', 'Commercial', 'Industrial', 'Institutional'],
    required: true
  },
  size: {
    type: Number, // sq ft
    min: 0
  },
  bedrooms: {
    type: Number,
    min: 0
  },
  bathrooms: {
    type: Number,
    min: 0
  },
  features: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String // URLs to uploaded files/images
  }],
  status: {
    type: String,
    enum: ['open', 'reviewing_quotes', 'company_selected', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  selectedQuote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  quotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  requestMultipleQuotes: {
    type: Boolean,
    default: true
  },
  contactPreference: {
    type: String,
    enum: ['email', 'phone', 'whatsapp', 'chat'],
    default: 'email'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
requirementSchema.index({ homeowner: 1, status: 1, createdAt: -1 });
requirementSchema.index({ status: 1, isActive: 1, createdAt: -1 });
requirementSchema.index({ buildingType: 1, location: 1 });
requirementSchema.index({ budget: 1, budgetRange: 1 });

// Virtual for timeline duration
requirementSchema.virtual('timelineDuration').get(function() {
  if (this.timeline.startDate && this.timeline.endDate) {
    const diffTime = Math.abs(this.timeline.endDate - this.timeline.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Pre-save middleware to set budget range based on budget
requirementSchema.pre('save', function(next) {
  if (this.budget) {
    if (this.budget < 1000000) {
      this.budgetRange = 'Under ₹10L';
    } else if (this.budget <= 2500000) {
      this.budgetRange = '₹10L - ₹25L';
    } else if (this.budget <= 5000000) {
      this.budgetRange = '₹25L - ₹50L';
    } else if (this.budget <= 10000000) {
      this.budgetRange = '₹50L - ₹1Cr';
    } else if (this.budget <= 20000000) {
      this.budgetRange = '₹1Cr - ₹2Cr';
    } else {
      this.budgetRange = 'Above ₹2Cr';
    }
  }
  next();
});

module.exports = mongoose.model('Requirement', requirementSchema);