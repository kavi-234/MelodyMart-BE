import express from 'express';
import { getAllInstruments, getInstrument, createInstrument, updateInstrument, deleteInstrument, getInstrumentImage } from '../controllers/instrument.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { uploadInstrumentImage } from '../utils/upload.js';

const router = express.Router();

router.get('/',          getAllInstruments);
router.get('/:id',       getInstrument);
router.get('/:id/image', getInstrumentImage);

router.post('/',    protect, isAdmin, uploadInstrumentImage.single('image'), createInstrument);
router.put('/:id',  protect, isAdmin, uploadInstrumentImage.single('image'), updateInstrument);
router.delete('/:id', protect, isAdmin, deleteInstrument);

export default router;
