import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

// Instrument images — compressed and resized via Cloudinary transformations
const instrumentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'melodymart/instruments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
  },
});

export const uploadInstrumentImage = multer({
  storage: instrumentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'));
  },
});

// User avatars — square crop
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'melodymart/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG and PNG images are allowed for avatars'));
  },
});

// Verification documents — images and PDFs
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'melodymart/documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
  }),
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only images and PDF/DOC documents are allowed'));
  },
});
