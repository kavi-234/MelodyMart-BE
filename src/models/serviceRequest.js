import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true },
  description: { type: String, default: '' },
  preferredDate: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  serviceFee: { type: Number },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
