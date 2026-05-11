const express = require('express');
const Contact = require('../models/Contact');
const { protect, admin } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// POST /api/contact - Public route for users to submit messages
router.post('/', async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    const newMessage = await Contact.create({ name, email, message });
    
    // Send email to admin
    try {
      await sendEmail({
        email: 'toyblix@gmail.com',
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h3>New Contact Message</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
});

// POST /api/contact/newsletter - Public route for newsletter
router.post('/newsletter', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Send email to admin
    try {
      await sendEmail({
        email: 'toyblix@gmail.com',
        subject: `New Newsletter Subscription`,
        html: `
          <h3>New Newsletter Subscription</h3>
          <p>A new user has subscribed to the newsletter: <strong>${email}</strong></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send newsletter email:', emailError);
    }

    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/contact - Admin ONLY route to read messages
router.get('/', protect, admin, async (req, res, next) => {
  try {
    const messages = await Contact.find({}).sort({ createdAt: -1 }); // Newest first
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

module.exports = router;