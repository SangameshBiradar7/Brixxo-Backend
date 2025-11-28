const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  cost: { type: Number, required: true },
  timeline: { type: String, required: true },
  description: { type: String, required: true },
  costBreakdown: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Proposal', proposalSchema);