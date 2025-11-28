const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Send message (for chat system)
router.post('/', auth, async (req, res) => {
  console.log('🔄 Received message send request');
  console.log('Sender:', req.user.id);
  console.log('Request body:', req.body);

  const { receiverId, conversationId, content, inquiryId, messageType } = req.body;

  // Validation
  if (!receiverId) {
    console.log('❌ No receiver specified');
    return res.status(400).json({ message: 'Receiver is required' });
  }

  if (!conversationId) {
    console.log('❌ No conversation ID specified');
    return res.status(400).json({ message: 'Conversation ID is required' });
  }

  if (!content || content.trim().length === 0) {
    console.log('❌ No content specified');
    return res.status(400).json({ message: 'Message content is required' });
  }

  if (content.length > 1000) {
    console.log('❌ Message too long');
    return res.status(400).json({ message: 'Message content must be less than 1000 characters' });
  }

  try {
    // Check if receiver exists
    const User = require('../models/User');
    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      console.log('❌ Receiver not found');
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // If inquiry is specified, verify it exists and user has access
    if (inquiryId) {
      const Inquiry = require('../models/Inquiry');
      const inquiry = await Inquiry.findById(inquiryId);
      if (!inquiry) {
        console.log('❌ Inquiry not found');
        return res.status(404).json({ message: 'Inquiry not found' });
      }

      // Check if user is involved in this inquiry
      const isSender = inquiry.user.toString() === req.user.id;
      const isCompanyAdmin = req.user.role === 'company_admin';

      if (!isSender && !isCompanyAdmin) {
        console.log('❌ User not authorized for this inquiry');
        return res.status(403).json({ message: 'You are not authorized to send messages for this inquiry' });
      }
    }

    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      conversationId,
      content: content.trim(),
      inquiry: inquiryId,
      messageType: messageType || 'text'
    });

    await message.save();

    // Populate sender and receiver info for response
    await message.populate('sender', 'name email');
    await message.populate('receiver', 'name email');

    console.log('✅ Message sent successfully:', message._id);
    res.status(201).json(message);
  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get conversation by conversation ID
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .populate('inquiry');

    // Check if user is part of this conversation
    const userMessages = messages.filter(msg =>
      msg.sender._id.toString() === req.user.id ||
      msg.receiver._id.toString() === req.user.id
    );

    if (userMessages.length === 0 && messages.length > 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get messages for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ project: req.params.projectId }).sort({ createdAt: 1 }).populate('sender receiver');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark messages as read
router.put('/read/:userId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all conversations for current user
router.get('/conversations/all', auth, async (req, res) => {
  try {
    // Find all unique conversation IDs where the user is involved
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user.id },
            { receiver: req.user.id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user.id] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate user information for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.lastMessage.sender === req.user.id
          ? conv.lastMessage.receiver
          : conv.lastMessage.sender;

        const User = require('../models/User');
        const otherUser = await User.findById(otherUserId).select('name email');

        // Check if it's a company conversation
        const Company = require('../models/Company');
        const company = await Company.findOne({ admin: otherUserId }).select('name logo');

        return {
          conversationId: conv._id,
          otherUser: otherUser,
          company: company,
          lastMessage: {
            content: conv.lastMessage.content,
            createdAt: conv.lastMessage.createdAt,
            sender: conv.lastMessage.sender
          },
          unreadCount: conv.unreadCount,
          totalMessages: conv.messageCount
        };
      })
    );

    res.json(populatedConversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mark conversation as read
router.put('/conversation/:conversationId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        receiver: req.user.id,
        read: false
      },
      { read: true }
    );
    res.json({ message: 'Conversation marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;