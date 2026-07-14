import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userName: String,
        userRole: String,
        userAvatar: String,
        isOnline: { type: Boolean, default: false },
        lastSeen: { type: Date, default: Date.now },
      },
    ],
    lastMessage: {
      content: String,
      senderId: mongoose.Schema.Types.ObjectId,
      senderName: String,
      timestamp: Date,
    },
    lastActivity: { type: Date, default: Date.now },
    conversationType: { type: String, enum: ['direct'], default: 'direct' },
    archivedBy: [mongoose.Schema.Types.ObjectId],
    blockedBy: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ lastActivity: -1 });

export default mongoose.model('Conversation', conversationSchema);
