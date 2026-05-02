const express = require('express');
const router = express.Router();

const {
  uploadResume,
  analyzeResumeById,
  getResume,
  listResumes,
  deleteResumeById,
} = require('../controllers/resumeController');

const multer = require('multer');

// ✅ FIX: use memory storage (required for APK uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ LIST
router.get('/', listResumes);

// ✅ 🔥 THIS IS REQUIRED (UPLOAD)
router.post('/upload', upload.single('resume'), uploadResume);

// ✅ ANALYZE
router.post('/analyze/:resumeId', analyzeResumeById);

// ✅ GET ONE
router.get('/:resumeId', getResume);

// ✅ DELETE
router.delete('/:resumeId', deleteResumeById);

module.exports = router;