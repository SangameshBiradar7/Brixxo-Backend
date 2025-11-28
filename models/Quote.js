const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professional'
  },
  designProposal: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  estimatedBudget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetBreakdown: {
    materials: {
      type: Number,
      default: 0
    },
    labor: {
      type: Number,
      default: 0
    },
    equipment: {
      type: Number,
      default: 0
    },
    permits: {
      type: Number,
      default: 0
    },
    overhead: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  timeline: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    milestones: [{
      name: {
        type: String,
        required: true
      },
      description: String,
      estimatedDate: Date,
      percentage: {
        type: Number,
        min: 0,
        max: 100
      }
    }]
  },
  additionalNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  attachments: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['image', 'document', 'drawing', 'specification']
    }
  }],
  designImages: [{
    type: String // URLs to design proposal images
  }],
  specifications: {
    materials: [{
      item: String,
      specification: String,
      quantity: String,
      unit: String
    }],
    workmanship: String,
    warranty: String,
    compliance: [String] // Building codes, certifications
  },
  terms: {
    paymentSchedule: [{
      milestone: String,
      percentage: Number,
      amount: Number,
      dueDate: String
    }],
    cancellationPolicy: String,
    revisionPolicy: String,
    additionalCharges: String
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'],
    default: 'draft'
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  submittedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  },
  responseMessage: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
quoteSchema.index({ requirement: 1, company: 1, professional: 1 }, { unique: true, sparse: true }); // One quote per company/professional per requirement
quoteSchema.index({ company: 1, status: 1, createdAt: -1 });
quoteSchema.index({ professional: 1, status: 1, createdAt: -1 });
quoteSchema.index({ requirement: 1, status: 1, estimatedBudget: 1 });
quoteSchema.index({ status: 1, validUntil: 1 });

// Virtual for timeline duration
quoteSchema.virtual('timelineDuration').get(function() {
  if (this.timeline.startDate && this.timeline.endDate) {
    const diffTime = Math.abs(this.timeline.endDate - this.timeline.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for total budget breakdown
quoteSchema.virtual('totalBreakdown').get(function() {
  const breakdown = this.budgetBreakdown;
  return breakdown.materials + breakdown.labor + breakdown.equipment + 
         breakdown.permits + breakdown.overhead + breakdown.profit + breakdown.other;
});

// Pre-save middleware to set submission date
quoteSchema.pre('save', function(next) {
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  // Set default valid until date (30 days from creation)
  if (!this.validUntil) {
    this.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Method to check if quote is expired
quoteSchema.methods.isExpired = function() {
  return new Date() > this.validUntil;
};

// Method to calculate completion percentage
quoteSchema.methods.getCompletionPercentage = function() {
  if (!this.timeline.milestones || this.timeline.milestones.length === 0) {
    return 0;
  }
  
  const totalPercentage = this.timeline.milestones.reduce((sum, milestone) => {
    return sum + (milestone.percentage || 0);
  }, 0);
  
  return Math.min(totalPercentage, 100);
};

module.exports = mongoose.model('Quote', quoteSchema);