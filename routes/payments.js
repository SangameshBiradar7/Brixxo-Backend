const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
  const { amount, currency, projectId, companyId, type } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // amount in cents
      currency: currency || 'usd',
    });

    const payment = new Payment({
      user: req.user.id,
      company: companyId,
      project: projectId,
      amount,
      currency,
      stripePaymentId: paymentIntent.id,
      type,
    });
    await payment.save();

    res.json({ clientSecret: paymentIntent.client_secret, paymentId: payment._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Confirm payment
router.post('/confirm/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'completed';
    await payment.save();

    res.json({ message: 'Payment confirmed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get payments for user
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).populate('project company');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get payments for company
router.get('/company', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ company: req.user.id }).populate('project user');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stripe webhook (for production)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    // Update payment status
    Payment.findOneAndUpdate({ stripePaymentId: paymentIntent.id }, { status: 'completed' });
  }

  res.json({ received: true });
});

module.exports = router;