import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    avatar: String,
    provider: { type: String, default: 'google' }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
