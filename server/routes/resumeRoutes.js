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

// ✅ GET ALL RESUMES
router.get('/', listResumes);

// ✅ UPLOAD RESUME
router.post('/upload', upload.single('resume'), uploadResume);

// ✅ ANALYZE RESUME
router.post('/analyze/:resumeId', analyzeResumeById);

// ✅ GET SINGLE RESUME (KEEP LAST)
router.get('/:resumeId', getResume);

module.exports = router;