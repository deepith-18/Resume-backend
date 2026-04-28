/**
 * controllers/jobController.js
 * Final Corrected Version - Includes Auto-Extraction & Robust Normalization
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

  // 1. Fetch Resume
  const resume = await Resume.findById(resumeId);
  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  // 2. Status Check
  if (resume.analysisStatus !== 'completed') {
    throw new AppError(
      `Resume is not yet analyzed. Current status: ${resume.analysisStatus}`,
      400
    );
  }

  // ─── 🔥 SKILL EXTRACTION & AUTO-RECOVERY ─────────────────────────────────────
  let rawSkills = resume.parsedData?.skills || [];

  // ✅ FORCE SKILL EXTRACTION FROM TEXT IF EMPTY
  if (rawSkills.length === 0) {
    const text = resume.parsedData?.rawText || "";
    console.log("⚠️ No skills found in parsedData. Attempting auto-extraction from rawText...");

    const COMMON_SKILLS = [
      "react", "node", "express", "mongodb", "javascript",
      "python", "java", "sql", "html", "css", "tailwind",
      "machine learning", "deep learning", "nlp", "typescript",
      "aws", "docker", "kubernetes", "flutter", "swift"
    ];

    const foundSkills = COMMON_SKILLS.filter(skill =>
      text.toLowerCase().includes(skill)
    );

    // Map found strings to the expected object format
    rawSkills = foundSkills.map(s => ({
      name: s,
      level: 70 // default confidence for recovered skills
    }));

    if (rawSkills.length > 0) {
      console.log("🔥 AUTO-EXTRACTED SKILLS:", rawSkills);
    }
  }

  // 3. Final Normalization (Handles strings, objects, and nested keys)
  const finalizedSkills = rawSkills.map(s => {
    if (typeof s === "string") {
      return { name: s.toLowerCase().trim(), level: 70 };
    }

    return {
      // Safely check common keys returned by different AI parsers (name, skill, or value)
      name: (s.name || s.skill || s.value || "").toLowerCase().trim(),
      level: s.level || 70
    };
  }).filter(s => s.name !== "");

  // ✅ SAFETY CHECK: Ensure we actually have data left after all attempts
  if (!finalizedSkills.length) {
    console.log("❌ NO VALID SKILLS AFTER CLEANING AND RECOVERY:", resume.parsedData?.rawText ? "Raw text existed" : "Raw text empty");
    throw new AppError('No valid skills could be extracted. Please ensure the resume contains technical keywords.', 400);
  }

  console.log("✅ FINAL SKILLS PASSED TO MATCHER:", finalizedSkills);
  // ──────────────────────────────────────────────────────────────────────────────

  // 4. Cache Check (unless refresh=true)
  const existing = await JobMatch.findOne({ resumeId }).sort({ createdAt: -1 });
  if (existing && !req.query.refresh) {
    return res.json({
      success: true,
      message: 'Existing job recommendations',
      data: formatJobMatchResponse(existing, resume),
    });
  }

  // 5. Generate Recommendations
  const recommendations = generateRoleMatches(finalizedSkills);
  console.log("✅ MATCH RESULTS:", recommendations);

  // 6. Persistence (Upsert)
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