import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
  getAllInstruments, 
  getInstrument, 
  createInstrument, 
  updateInstrument, 
  deleteInstrument,
  getInstrumentImage 
} from '../controllers/instrument.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// Use memory storage to keep images in database
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Explicit mimetype allowlist
    const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = /jpeg|jpg|png|webp/;
    
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Public routes
router.get('/', getAllInstruments);
router.get('/:id', getInstrument);
router.get('/:id/image', getInstrumentImage);

// Admin only routes
router.post('/', protect, isAdmin, upload.single('image'), createInstrument);
router.put('/:id', protect, isAdmin, upload.single('image'), updateInstrument);
router.delete('/:id', protect, isAdmin, deleteInstrument);

export default router;
