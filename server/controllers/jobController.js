/**
 * controllers/jobController.js
 * Final Corrected Version - Handles mixed skill formats & safety checks
 */

const asyncHandler = require('express-async-handler');
const Resume = require('../models/Resume');
const JobMatch = require('../models/Job');
const { generateRoleMatches } = require('../services/matcher'); 
const { AppError } = require('../utils/errorHandler');

/**
 * POST /api/jobs/recommend/:resumeId
 * Generate job recommendations for an analyzed resume
 */
const getJobRecommendations = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;

  const resume = await Resume.findById(resumeId);
  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  if (resume.analysisStatus !== 'completed') {
    throw new AppError(
      `Resume is not yet analyzed. Current status: ${resume.analysisStatus}`,
      400
    );
  }

  // ─── 🔥 CRITICAL FIX: SKILL FORMATTING & NORMALIZATION ──────────────────────
  let rawSkills = resume.parsedData?.skills || [];

  if (rawSkills.length === 0) {
    throw new AppError('Resume has no extracted skills. Re-analyze the resume first.', 400);
  }

  // ✅ THE REPLACEMENT BLOCK (Handles strings, objects, and nested keys)
  const finalizedSkills = rawSkills.map(s => {
    if (typeof s === "string") {
      return { name: s.toLowerCase().trim(), level: 70 };
    }

    return {
      // Safely check common keys returned by different AI parsers
      name: (s.name || s.skill || s.value || "").toLowerCase().trim(),
      level: s.level || 70
    };
  }).filter(s => s.name !== "");

  // ✅ SAFETY CHECK: Ensure we actually have data left
  if (!finalizedSkills.length) {
    console.log("❌ NO VALID SKILLS AFTER CLEANING:", rawSkills);
    throw new AppError('No valid skills extracted from resume.', 400);
  }

  console.log("✅ FINAL SKILLS PASSED TO MATCHER:", finalizedSkills);
  // ──────────────────────────────────────────────────────────────────────────────

  // Check for existing recommendations (unless refresh=true is passed)
  const existing = await JobMatch.findOne({ resumeId }).sort({ createdAt: -1 });
  if (existing && !req.query.refresh) {
    return res.json({
      success: true,
      message: 'Existing job recommendations',
      data: formatJobMatchResponse(existing, resume),
    });
  }

  // Generate new recommendations
  const recommendations = generateRoleMatches(finalizedSkills);
  
  console.log("✅ MATCH RESULTS:", recommendations);

  // Update or Create the JobMatch entry
  const jobMatch = await JobMatch.findOneAndUpdate(
    { resumeId: resume._id },
    {
      recommendations: recommendations || [],
      topIndustries: resume.parsedData?.industries || ["Technology"],
      careerTrajectory: recommendations.length > 0 
        ? `Strongest alignment found in ${recommendations[0].title} roles.` 
        : "Generalist trajectory; consider specializing in a core framework.",
      developmentAreas: (recommendations.length > 0 && recommendations[0].missing_skills.length > 0)
        ? recommendations[0].missing_skills 
        : ["Broadening technical stack expertise"],
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
 * Retrieve stored job recommendations
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