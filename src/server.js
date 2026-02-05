import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import instrumentRoutes from './routes/instrument.routes.js';
import cartRoutes from './routes/cart.routes.js';
import lessonRoutes from './routes/lesson.routes.js';
import tutorRoutes from './routes/tutor.routes.js';
import userRoutes from './routes/user.routes.js';
import specialistRoutes from './routes/specialist.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('MelodyMart API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/me', userRoutes);
app.use('/api/specialists', specialistRoutes);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
