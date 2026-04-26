/**
 * routes/resumeRoutes.js
 * API routes for resume upload and analysis
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadResume, analyzeResumeById, getResume, listResumes } = require('../controllers/resumeController');

const router = express.Router();

// ─── Multer Configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent collisions
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `resume_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/octet-stream', // Some systems send this for .docx
  ];

  const allowedExts = ['.pdf', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF and DOCX files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
    files: 1,
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET    /api/resume              — List all resumes
router.get('/', listResumes);

// POST   /api/resume/upload       — Upload a new resume
router.post('/upload', upload.single('resume'), uploadResume);

// GET    /api/resume/:resumeId    — Get resume details
router.get('/:resumeId', getResume);

// POST   /api/resume/analyze/:resumeId — Trigger AI analysis
router.post('/analyze/:resumeId', analyzeResumeById);

module.exports = router;
