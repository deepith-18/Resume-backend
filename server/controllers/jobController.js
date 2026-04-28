/**
 * controllers/jobController.js
 * Optimized Job Recommendation Controller
 */

const asyncHandler = require('express-async-handler');
const Resume = require('../models/Resume');
const JobMatch = require('../models/Job');
// ✅ FIX 2: Ensure this path matches your filename (e.g., matcher.js or matchingService.js)
const { generateRoleMatches } = require('../services/matcher'); 
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
      `Resume is not yet analyzed. Current status: ${resume.analysisStatus}`,
      400
    );
  }

  // ─── 🔥 CRITICAL FIX 1: SKILL FORMATTING ────────────────────────────────────
  let rawSkills = resume.parsedData?.skills || [];

  if (rawSkills.length === 0) {
    throw new AppError('Resume has no extracted skills. Re-analyze the resume first.', 400);
  }

  // Convert string skills → object format if necessary
  if (typeof rawSkills[0] === "string") {
    rawSkills = rawSkills.map(s => ({
      name: s,
      level: 70 // default confidence
    }));
  }

  // Final Normalization structure
  const finalizedSkills = rawSkills.map(s => ({
    name: (s.name || "").toLowerCase().trim(),
    level: s.level || 70
  }));

  console.log("✅ FINAL SKILLS PASSED TO MATCHER:", finalizedSkills);
  // ──────────────────────────────────────────────────────────────────────────────

  // Check for existing recommendations (don't regenerate unless forced via ?refresh=true)
  const existing = await JobMatch.findOne({ resumeId }).sort({ createdAt: -1 });
  if (existing && !req.query.refresh) {
    return res.json({
      success: true,
      message: 'Existing job recommendations',
      data: formatJobMatchResponse(existing, resume),
    });
  }

  // Generate new recommendations using our improved matching engine
  const recommendations = generateRoleMatches(finalizedSkills);
  
  // ✅ DEBUG LOG
  console.log("✅ MATCH RESULTS:", recommendations);

  // Save to DB (Upsert: Update existing or create new)
  const jobMatch = await JobMatch.findOneAndUpdate(
    { resumeId: resume._id },
    {
      recommendations: recommendations || [],
      topIndustries: resume.parsedData?.industries || ["Technology"],
      careerTrajectory: recommendations.length > 0 
        ? `Strongest alignment found in ${recommendations[0].title} roles.` 
        : "Generalist trajectory; consider specializing in a core framework.",
      developmentAreas: recommendations.length > 0 
        ? recommendations[0].missing_skills 
        : ["Core technical stack expansion"],
      generatedAt: Date.now()
    },
    { upsert: true, new: true }
  );

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
  experienceLevel: resume?.parsedData?.experienceLevel || 'N/A',
  resumeScore: resume?.overallScore || 0,
  recommendations: jobMatch.recommendations,
  topIndustries: jobMatch.topIndustries,
  careerTrajectory: jobMatch.careerTrajectory,
  developmentAreas: jobMatch.developmentAreas,
  generatedAt: jobMatch.generatedAt,
});

module.exports = { getJobRecommendations, getStoredRecommendations };