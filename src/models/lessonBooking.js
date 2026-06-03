import mongoose from 'mongoose';

const lessonBookingSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  bookingStatus: {
    type: String,
    enum: ['Pending Payment', 'Confirmed', 'Cancelled', 'Completed'],
    default: 'Pending Payment',
  },
}, { timestamps: true });

lessonBookingSchema.index({ lesson: 1, student: 1 }, { unique: true });

export default mongoose.model('LessonBooking', lessonBookingSchema);
