/**
 * routes/jobRoutes.js
 * API routes for job recommendations
 */

const express = require('express');
const { getJobRecommendations, getStoredRecommendations } = require('../controllers/jobController');

const router = express.Router();

// POST /api/jobs/recommend/:resumeId  — Generate recommendations
router.post('/recommend/:resumeId', getJobRecommendations);

// GET  /api/jobs/:resumeId            — Get stored recommendations
router.get('/:resumeId', getStoredRecommendations);

module.exports = router;
