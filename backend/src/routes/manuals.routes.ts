import { Router } from 'express';
import multer from 'multer';
import { 
  getManualById, 
  getManualSections, 
  searchManualSections,
  uploadManual,
  getManualStatus,
  updateManual,
  deleteManual,
  moveManual,
} from '../controllers/manuals.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Public routes (for dashboard)
router.post('/upload', upload.single('pdf'), uploadManual);
router.get('/:id/status', getManualStatus);
router.patch('/:id', updateManual);
router.patch('/:id/move', moveManual);
router.delete('/:id', deleteManual);

// Protected routes (require authentication)
router.get('/search-sections', authenticate, searchManualSections);
router.get('/:id', authenticate, getManualById);
router.get('/:id/sections', authenticate, getManualSections);

export default router;
