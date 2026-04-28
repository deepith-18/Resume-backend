/**
 * controllers/jobController.js
 * Final Corrected Version - Tiered Extraction & Robust Normalization
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

  // ─── 🔥 GUARANTEED SKILL EXTRACTION LOGIC ────────────────────────────────────
  let finalizedSkills = [];

  // 1️⃣ Try parsedData.skills
  if (resume.parsedData?.skills?.length) {
    finalizedSkills = resume.parsedData.skills;
  }

  // 2️⃣ Fallback: extract from rawText (THE REAL FIX)
  if (!finalizedSkills.length) {
    // Check both resume.rawText and resume.parsedData.rawText depending on your schema
    const textToScan = (resume.rawText || resume.parsedData?.rawText || "").toLowerCase();

    if (textToScan) {
      const COMMON_SKILLS = [
        "react", "node", "express", "mongodb", "javascript",
        "python", "java", "sql", "html", "css", "tailwind",
        "machine learning", "deep learning", "nlp", "typescript",
        "aws", "docker", "kubernetes", "flutter", "swift"
      ];

      finalizedSkills = COMMON_SKILLS
        .filter(skill => textToScan.includes(skill))
        .map(s => ({ name: s, level: 70 }));

      console.log("🔥 FALLBACK SKILLS FROM TEXT:", finalizedSkills);
    }
  }

  // 3️⃣ Normalize (Handles strings, objects, and nested keys)
  finalizedSkills = finalizedSkills.map(s => {
    if (typeof s === "string") {
      return { name: s.toLowerCase().trim(), level: 70 };
    }
    return {
      name: (s.name || s.skill || s.value || "").toLowerCase().trim(),
      level: s.level || 70
    };
  }).filter(s => s.name !== "");

  // ❌ Still empty → Stop
  if (!finalizedSkills.length) {
    console.log("❌ NO SKILLS FOUND EVEN AFTER FALLBACK SCANS");
    throw new AppError("No skills found in resume to generate recommendations.", 400);
  }

  console.log("✅ FINAL SKILLS PASSED TO MATCHER:", finalizedSkills);
  // ──────────────────────────────────────────────────────────────────────────────

  // 4. Cache Check (unless refresh=true is passed)
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

// ─── Helper for consistent API responses ──────────────────────────────────────

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