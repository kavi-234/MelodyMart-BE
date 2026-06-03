import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instrument',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    items: [orderItemSchema],
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'LKR',
    },
    paymentProvider: {
      type: String,
      default: 'payhere',
    },
    cartFingerprint: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    payHerePaymentId: String,
    payHereStatusCode: String,
    payHereNotifyPayload: {
      merchant_id: String,
      order_id: String,
      payhere_amount: String,
      payhere_currency: String,
      status_code: String,
      payment_id: String,
      md5sig: String,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    paidAt: Date,
    failedAt: Date,
    customer: {
      name: String,
      email: String,
      phone: String,
      address: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);