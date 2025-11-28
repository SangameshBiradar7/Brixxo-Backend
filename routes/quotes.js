const express = require('express');
const Quote = require('../models/Quote');
const Requirement = require('../models/Requirement');
const Company = require('../models/Company');
const Professional = require('../models/Professional');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Submit quote (company admins and professionals)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can submit quotes' });
  }

  try {
    const {
      requirement: requirementId,
      designProposal,
      estimatedBudget,
      timeline,
      additionalNotes,
      budgetBreakdown,
      terms
    } = req.body;

    let company = null;
    let professional = null;

    if (req.user.role === 'company_admin') {
      // Find company
      company = await Company.findOne({ admin: req.user.id });
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
    } else if (req.user.role === 'professional') {
      // Find professional
      professional = await Professional.findOne({ user: req.user.id, isVerified: true });
      if (!professional) {
        return res.status(404).json({ message: 'Professional profile not found or not verified' });
      }
    }

    // Validate requirement exists and is open
    const requirement = await Requirement.findOne({
      _id: requirementId,
      status: 'open',
      isActive: true
    });

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found or no longer accepting quotes' });
    }

    // Check if already submitted a quote for this requirement
    const existingQuote = await Quote.findOne({
      requirement: requirementId,
      $or: [
        { company: company?._id },
        { professional: professional?._id }
      ]
    });

    if (existingQuote) {
      return res.status(400).json({ message: 'You have already submitted a quote for this requirement' });
    }

    // Create quote
    const quote = new Quote({
      requirement: requirementId,
      company: company?._id,
      professional: professional?._id,
      designProposal,
      estimatedBudget,
      timeline,
      additionalNotes,
      budgetBreakdown,
      terms,
      status: 'submitted'
    });

    await quote.save();

    // Add quote to requirement's quotes array
    requirement.quotes.push(quote._id);
    if (requirement.status === 'open') {
      requirement.status = 'reviewing_quotes';
    }
    await requirement.save();

    // Create notification for homeowner
    const notification = new Notification({
      recipient: requirement.homeowner,
      type: 'quote_submitted',
      title: 'New Quote Received',
      message: `You have received a new quote for "${requirement.title}"`,
      relatedId: quote._id,
      relatedModel: 'Quote',
      priority: 'high'
    });
    await notification.save();

    // Populate response
    await quote.populate([
      { path: 'company', select: 'name rating logo' },
      { path: 'professional', select: 'name rating logo' },
      { path: 'requirement', select: 'title homeowner' }
    ]);

    console.log('✅ Quote submitted:', quote._id);
    res.status(201).json({
      message: 'Quote submitted successfully',
      quote
    });
  } catch (err) {
    console.error('❌ Error submitting quote:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get my quotes (company admins and professionals)
router.get('/my', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can view their quotes' });
  }

  try {
    let query = { isActive: true };

    if (req.user.role === 'company_admin') {
      const company = await Company.findOne({ admin: req.user.id });
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      query.company = company._id;
    } else if (req.user.role === 'professional') {
      const professional = await Professional.findOne({ user: req.user.id });
      if (!professional) {
        return res.status(404).json({ message: 'Professional profile not found' });
      }
      query.professional = professional._id;
    }

    const { status, page = 1, limit = 20 } = req.query;

    if (status && status !== 'all') {
      query.status = status;
    }

    const quotes = await Quote.find(query)
      .populate('requirement', 'title location budget buildingType homeowner')
      .populate({
        path: 'requirement',
        populate: {
          path: 'homeowner',
          select: 'name email'
        }
      })
      .populate('company', 'name rating logo')
      .populate('professional', 'name rating logo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Quote.countDocuments(query);

    res.json({
      quotes,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single quote details
router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('company', 'name rating logo phone email admin')
      .populate('professional', 'name rating logo phone email user')
      .populate('requirement', 'title description homeowner');

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    // Check permissions
    const isCompanyAdmin = req.user.role === 'company_admin' &&
      quote.company && quote.company._id.toString() === (await Company.findOne({ admin: req.user.id }))?._id?.toString();

    const isProfessional = req.user.role === 'professional' &&
      quote.professional && quote.professional._id.toString() === (await Professional.findOne({ user: req.user.id }))?._id?.toString();

    const isHomeowner = req.user.role === 'homeowner' &&
      quote.requirement.homeowner.toString() === req.user.id;

    if (!isCompanyAdmin && !isProfessional && !isHomeowner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(quote);
  } catch (err) {
    console.error('Error fetching quote:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update quote (company admin and professional)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can update quotes' });
  }

  try {
    let query = { _id: req.params.id };

    if (req.user.role === 'company_admin') {
      const company = await Company.findOne({ admin: req.user.id });
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      query.company = company._id;
    } else if (req.user.role === 'professional') {
      const professional = await Professional.findOne({ user: req.user.id });
      if (!professional) {
        return res.status(404).json({ message: 'Professional profile not found' });
      }
      query.professional = professional._id;
    }

    const quote = await Quote.findOne(query);

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    // Only allow updates if quote is in draft or submitted status
    if (!['draft', 'submitted'].includes(quote.status)) {
      return res.status(400).json({ message: 'Quote cannot be updated in current status' });
    }

    // Update allowed fields
    const allowedFields = [
      'designProposal', 'estimatedBudget', 'timeline', 'additionalNotes',
      'budgetBreakdown', 'terms'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        quote[field] = req.body[field];
      }
    });

    await quote.save();

    res.json({
      message: 'Quote updated successfully',
      quote
    });
  } catch (err) {
    console.error('Error updating quote:', err);
    res.status(500).json({ message: err.message });
  }
});

// Withdraw quote (company admin and professional)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can withdraw quotes' });
  }

  try {
    let query = { _id: req.params.id };

    if (req.user.role === 'company_admin') {
      const company = await Company.findOne({ admin: req.user.id });
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      query.company = company._id;
    } else if (req.user.role === 'professional') {
      const professional = await Professional.findOne({ user: req.user.id });
      if (!professional) {
        return res.status(404).json({ message: 'Professional profile not found' });
      }
      query.professional = professional._id;
    }

    const quote = await Quote.findOne(query);

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    // Only allow withdrawal if quote is not accepted
    if (quote.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot withdraw an accepted quote' });
    }

    // Soft delete
    quote.isActive = false;
    quote.status = 'withdrawn';
    await quote.save();

    // Remove from requirement's quotes array
    await Requirement.findByIdAndUpdate(
      quote.requirement,
      { $pull: { quotes: quote._id } }
    );

    res.json({ message: 'Quote withdrawn successfully' });
  } catch (err) {
    console.error('Error withdrawing quote:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get quotes analytics for company or professional
router.get('/analytics/company', auth, async (req, res) => {
  if (req.user.role !== 'company_admin' && req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Only company admins and professionals can view analytics' });
  }

  try {
    let matchQuery = { isActive: true };

    if (req.user.role === 'company_admin') {
      const company = await Company.findOne({ admin: req.user.id });
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      matchQuery.company = company._id;
    } else if (req.user.role === 'professional') {
      const professional = await Professional.findOne({ user: req.user.id });
      if (!professional) {
        return res.status(404).json({ message: 'Professional profile not found' });
      }
      matchQuery.professional = professional._id;
    }

    const analytics = await Quote.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$estimatedBudget' },
          avgValue: { $avg: '$estimatedBudget' }
        }
      }
    ]);

    const totalQuotes = await Quote.countDocuments(matchQuery);
    const acceptedQuotes = await Quote.countDocuments({ ...matchQuery, status: 'accepted' });
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes * 100).toFixed(1) : 0;

    res.json({
      analytics,
      summary: {
        totalQuotes,
        acceptedQuotes,
        conversionRate: parseFloat(conversionRate)
      }
    });
  } catch (err) {
    console.error('Error fetching quotes analytics:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;