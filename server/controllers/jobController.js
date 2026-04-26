/**
 * controllers/jobController.js
 * Handles job recommendation generation and retrieval
 */

const asyncHandler = require('express-async-handler');
const Resume = require('../models/Resume');
const JobMatch = require('../models/Job');
const { recommendJobs } = require('../services/aiService');
const { AppError } = require('../utils/errorHandler');

/**
 * POST /api/jobs/recommend/:resumeId
 * Generate job recommendations for an analyzed resume
 */
const getJobRecommendations = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;

  // Fetch resume
  const resume = await Resume.findById(resumeId);
  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  // Must be analyzed first
  if (resume.analysisStatus !== 'completed') {
    throw new AppError(
      `Resume is not yet analyzed. Current status: ${resume.analysisStatus}. Please analyze the resume first.`,
      400
    );
  }

  if (!resume.parsedData || !resume.parsedData.skills || resume.parsedData.skills.length === 0) {
    throw new AppError('Resume has no extracted skills. Re-analyze the resume first.', 400);
  }

  // Check for existing recommendations (don't regenerate unless forced)
  const existing = await JobMatch.findOne({ resumeId }).sort({ createdAt: -1 });
  if (existing && !req.query.refresh) {
    return res.json({
      success: true,
      message: 'Existing job recommendations',
      data: formatJobMatchResponse(existing, resume),
    });
  }

  // Generate new recommendations
  const aiResult = await recommendJobs(resume.parsedData);

  // Save to DB
  const jobMatch = await JobMatch.create({
    resumeId: resume._id,
    recommendations: aiResult.recommendations || [],
    topIndustries: aiResult.topIndustries || [],
    careerTrajectory: aiResult.careerTrajectory || '',
    developmentAreas: aiResult.developmentAreas || [],
  });

  res.status(201).json({
    success: true,
    message: 'Job recommendations generated',
    data: formatJobMatchResponse(jobMatch, resume),
  });
});

/**
 * GET /api/jobs/:resumeId
 * Retrieve stored job recommendations for a resume
 */
const getStoredRecommendations = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;

  const jobMatch = await JobMatch.findOne({ resumeId }).sort({ createdAt: -1 });

  if (!jobMatch) {
    throw new AppError('No job recommendations found. Please generate recommendations first.', 404);
  }

  const resume = await Resume.findById(resumeId).select('parsedData.name parsedData.experienceLevel overallScore');

  res.json({
    success: true,
    data: formatJobMatchResponse(jobMatch, resume),
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const formatJobMatchResponse = (jobMatch, resume) => ({
  matchId: jobMatch._id,
  resumeId: jobMatch.resumeId,
  candidateName: resume?.parsedData?.name || 'Candidate',
  experienceLevel: resume?.parsedData?.experienceLevel,
  resumeScore: resume?.overallScore,
  recommendations: jobMatch.recommendations,
  topIndustries: jobMatch.topIndustries,
  careerTrajectory: jobMatch.careerTrajectory,
  developmentAreas: jobMatch.developmentAreas,
  generatedAt: jobMatch.generatedAt,
});

module.exports = { getJobRecommendations, getStoredRecommendations };
