const express = require('express');
const User = require('../models/User');
const Company = require('../models/Company');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get platform analytics (admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    console.log('📊 Generating analytics for admin:', req.user.id);

    // User Statistics
    const totalUsers = await User.countDocuments();
    const homeowners = await User.countDocuments({ role: 'homeowner' });
    const companyAdmins = await User.countDocuments({ role: 'company_admin' });
    const admins = await User.countDocuments({ role: 'admin' });

    // New users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Company Statistics
    const totalCompanies = await Company.countDocuments();
    const verifiedCompanies = await Company.countDocuments({ isVerified: true });
    const unverifiedCompanies = totalCompanies - verifiedCompanies;

    // Project Statistics
    const totalProjects = await Project.countDocuments();
    const openProjects = await Project.countDocuments({ status: 'open' });
    const inProgressProjects = await Project.countDocuments({ status: 'in_progress' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const cancelledProjects = await Project.countDocuments({ status: 'cancelled' });

    // Proposal Statistics
    const totalProposals = await Proposal.countDocuments();
    const acceptedProposals = await Proposal.countDocuments({ status: 'accepted' });
    const pendingProposals = await Proposal.countDocuments({ status: 'pending' });
    const rejectedProposals = await Proposal.countDocuments({ status: 'rejected' });

    // Payment Statistics
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    // Calculate total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Monthly growth (users created in each month for last 6 months)
    const monthlyUserGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i, 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });

      monthlyUserGrowth.push({
        month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: count
      });
    }

    // Top performing companies (by accepted proposals)
    const topCompanies = await Proposal.aggregate([
      { $match: { status: 'accepted' } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: '$company' },
      {
        $project: {
          name: '$company.name',
          acceptedProposals: '$count'
        }
      }
    ]);

    // Recent activity (last 10 projects created) - with error handling for invalid data
    let recentProjects = [];
    try {
      recentProjects = await Project.find({}, null, { strict: false })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title status budget createdAt user');
    } catch (err) {
      console.warn('⚠️ Warning: Could not fetch recent projects due to invalid data:', err.message);
      console.warn('Error details:', err);
      // Continue without recent projects rather than failing completely
      recentProjects = [];
    }

    const analytics = {
      overview: {
        totalUsers,
        totalCompanies,
        totalProjects,
        totalRevenue,
        newUsers30Days
      },
      users: {
        total: totalUsers,
        homeowners,
        companyAdmins,
        admins,
        newUsers30Days,
        monthlyGrowth: monthlyUserGrowth
      },
      companies: {
        total: totalCompanies,
        verified: verifiedCompanies,
        unverified: unverifiedCompanies,
        topCompanies
      },
      projects: {
        total: totalProjects,
        open: openProjects,
        inProgress: inProgressProjects,
        completed: completedProjects,
        cancelled: cancelledProjects
      },
      proposals: {
        total: totalProposals,
        accepted: acceptedProposals,
        pending: pendingProposals,
        rejected: rejectedProposals,
        acceptanceRate: totalProposals > 0 ? ((acceptedProposals / totalProposals) * 100).toFixed(1) : 0
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: failedPayments,
        totalRevenue
      },
      recentActivity: {
        projects: recentProjects
      }
    };

    console.log('✅ Analytics generated successfully');
    res.json(analytics);
  } catch (err) {
    console.error('❌ Error generating analytics:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get company analytics (for company admins)
router.get('/company', auth, async (req, res) => {
  if (req.user.role !== 'company_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
      return res.json({
        proposals: { total: 0, accepted: 0, pending: 0, rejected: 0 },
        projects: { awarded: 0, completed: 0, inProgress: 0 },
        revenue: 0
      });
    }

    // Company-specific analytics
    const totalProposals = await Proposal.countDocuments({ company: company._id });
    const acceptedProposals = await Proposal.countDocuments({ company: company._id, status: 'accepted' });
    const pendingProposals = await Proposal.countDocuments({ company: company._id, status: 'pending' });
    const rejectedProposals = await Proposal.countDocuments({ company: company._id, status: 'rejected' });

    // Awarded projects
    const acceptedProposalIds = await Proposal.find({
      company: company._id,
      status: 'accepted'
    }).select('_id');

    const awardedProjects = await Project.countDocuments({
      selectedProposal: { $in: acceptedProposalIds.map(p => p._id) }
    });

    const completedProjects = await Project.countDocuments({
      selectedProposal: { $in: acceptedProposalIds.map(p => p._id) },
      status: 'completed'
    });

    const inProgressProjects = await Project.countDocuments({
      selectedProposal: { $in: acceptedProposalIds.map(p => p._id) },
      status: 'in_progress'
    });

    // Revenue
    const revenueResult = await Payment.aggregate([
      { $match: { company: company._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      proposals: {
        total: totalProposals,
        accepted: acceptedProposals,
        pending: pendingProposals,
        rejected: rejectedProposals,
        acceptanceRate: totalProposals > 0 ? ((acceptedProposals / totalProposals) * 100).toFixed(1) : 0
      },
      projects: {
        awarded: awardedProjects,
        completed: completedProjects,
        inProgress: inProgressProjects
      },
      revenue: totalRevenue
    });
  } catch (err) {
    console.error('Error getting company analytics:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;