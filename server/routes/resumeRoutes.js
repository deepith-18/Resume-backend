const express = require('express');
const router = express.Router();

const {
  uploadResume,
  analyzeResumeById,
  getResume,
  listResumes,
} = require('../controllers/resumeController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// ✅ THIS IS CRITICAL ROUTE (YOU LOST THIS)
router.get('/', listResumes);

// Upload
router.post('/upload', upload.single('resume'), uploadResume);

// Analyze
router.post('/analyze/:resumeId', analyzeResumeById);

// Get single (KEEP LAST)
router.get('/:resumeId', getResume);

module.exports = router;