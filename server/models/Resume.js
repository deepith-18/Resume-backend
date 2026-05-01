const express = require('express');
const router = express.Router();

const Resume = require('../models/Resume');
const { generateRoleMatches } = require('../services/matcher');

/**
 * ✅ GET ALL RESUMES (THIS WAS MISSING)
 */
router.get("/", async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: resumes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ GET ONE RESUME + MATCHES
 */
router.get("/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const rawSkills = resume.parsedData?.skills || [];

    const skillsForMatcher = rawSkills
      .map(skill => skill?.name)
      .filter(Boolean);

    const matches = generateRoleMatches(skillsForMatcher);

    res.json({
      success: true,
      resume,
      matches
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = mongoose.model('Resume', resumeSchema);