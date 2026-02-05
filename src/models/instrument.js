import mongoose from 'mongoose';

const instrumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Guitar', 'Piano', 'Violin', 'Drums', 'Flute', 'Saxophone', 'Other']
  },
  brand: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  image: {
    data: Buffer,
    contentType: String
  }
}, { timestamps: true });

export default mongoose.model('Instrument', instrumentSchema);
