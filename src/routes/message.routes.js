import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
} from '../controllers/message.controller.js';
import User from '../models/user.js';

const router = express.Router();

// All messaging routes require auth
router.use(protect);

// Conversations
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.patch('/conversations/:conversationId/read', markConversationAsRead);

// Messages
router.post('/', sendMessage);

// User search for starting new conversations
router.get('/users/search', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    const currentUserId = req.user.userId;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ name: searchRegex }, { email: searchRegex }],
      verificationStatus: 'APPROVED',
      isVerified: true,
    })
      .select('_id name email avatar role')
      .limit(Number(limit))
      .lean();

    const result = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`,
      role: u.role,
    }));

    res.json(result);
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

export default router;
