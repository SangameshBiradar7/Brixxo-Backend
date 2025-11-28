const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all reviews for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const reviews = await Review.find({ project: req.params.projectId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create a new review for a project
router.post('/project/:projectId', auth, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    // Validate required fields
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if project exists
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user already reviewed this project
    const existingReview = await Review.findOne({
      project: req.params.projectId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this project' });
    }

    // Create the review
    const review = new Review({
      project: req.params.projectId,
      user: req.user.id,
      rating,
      comment,
      images: images || []
    });

    await review.save();

    // Add review to project's reviews array
    await Project.findByIdAndUpdate(req.params.projectId, {
      $push: { reviews: review._id }
    });

    // Update project's average rating
    await updateProjectRating(req.params.projectId);

    // Populate user data for response
    await review.populate('user', 'name');

    res.status(201).json(review);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update a review
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.findOne({
      _id: req.params.reviewId,
      user: req.user.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or you do not have permission to edit it' });
    }

    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    await review.save();

    // Update project's average rating
    await updateProjectRating(review.project);

    await review.populate('user', 'name');

    res.json(review);
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a review
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.reviewId,
      user: req.user.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or you do not have permission to delete it' });
    }

    // Remove review from project's reviews array
    await Project.findByIdAndUpdate(review.project, {
      $pull: { reviews: req.params.reviewId }
    });

    // Update project's average rating
    await updateProjectRating(review.project);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: err.message });
  }
});

// Helper function to update project rating
async function updateProjectRating(projectId) {
  try {
    const reviews = await Review.find({ project: projectId });
    if (reviews.length === 0) {
      await Project.findByIdAndUpdate(projectId, { rating: 0 });
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await Project.findByIdAndUpdate(projectId, { rating: Math.round(averageRating * 10) / 10 });
  } catch (err) {
    console.error('Error updating project rating:', err);
  }
}

module.exports = router;