const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  tags: [{ type: String }],
  roomType: { type: String },
  style: { type: String },
  colorScheme: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  metadata: {
    width: Number,
    height: Number,
    size: Number,
    format: String
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Photo', photoSchema);