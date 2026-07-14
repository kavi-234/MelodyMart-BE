import Conversation from '../models/conversation.js';
import Message from '../models/message.js';
import User from '../models/user.js';

// POST /api/messages/conversations
export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    // Find existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { userId } },
          { $elemMatch: { userId: participantId } },
        ],
      },
    });

    if (conversation) {
      return res.status(200).json(conversation);
    }

    // Look up both users from the database for accurate info
    const [currentUser, participant] = await Promise.all([
      User.findById(userId).select('name avatar role').lean(),
      User.findById(participantId).select('name avatar role').lean(),
    ]);

    if (!participant) {
      return res.status(404).json({ message: 'Participant user not found' });
    }

    conversation = await Conversation.create({
      participants: [
        {
          userId,
          userName: currentUser?.name || 'Unknown',
          userRole: currentUser?.role || 'customer',
          userAvatar: currentUser?.avatar,
        },
        {
          userId: participantId,
          userName: participant.name,
          userRole: participant.role,
          userAvatar: participant.avatar,
        },
      ],
    });

    res.status(201).json(conversation);
  } catch (err) {
    console.error('createConversation error:', err);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
};

// GET /api/messages/conversations
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      'participants.userId': userId,
      archivedBy: { $ne: userId },
    })
      .sort({ lastActivity: -1 })
      .lean();

    res.json(conversations);
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// GET /api/messages/conversations/:conversationId/messages
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.userId;

    // Ensure user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': userId,
    });
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ conversationId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Message.countDocuments({ conversationId, deletedAt: null });

    res.json({
      messages: messages.reverse(),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text' } = req.body;
    const userId = req.user.userId;

    if (!conversationId || !content) {
      return res.status(400).json({ message: 'conversationId and content are required' });
    }

    // Ensure user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': userId,
    });
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sender = conversation.participants.find(
      p => p.userId.toString() === userId.toString()
    );

    const message = await Message.create({
      conversationId,
      senderId: userId,
      senderName: sender?.userName || 'Unknown',
      senderAvatar: sender?.userAvatar,
      content,
      messageType,
      status: 'sent',
    });

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content,
        senderId: userId,
        senderName: sender?.userName,
        timestamp: new Date(),
      },
      lastActivity: new Date(),
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// PATCH /api/messages/conversations/:conversationId/read
export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await Message.updateMany(
      { conversationId, senderId: { $ne: req.user.userId }, status: { $ne: 'read' } },
      { status: 'read' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};
