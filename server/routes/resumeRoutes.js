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

// ✅ LIST
router.get('/', listResumes);

// ✅ 🔥 THIS IS REQUIRED (UPLOAD)
router.post('/upload', upload.single('resume'), uploadResume);

// ✅ ANALYZE
router.post('/analyze/:resumeId', analyzeResumeById);

// ✅ GET ONE
router.get('/:resumeId', getResume);

module.exports = router;