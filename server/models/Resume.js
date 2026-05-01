const express = require('express');
const router = express.Router();

const Resume = require('../models/Resume');
const { generateRoleMatches } = require('../services/matcher');

/**
 * GET /resume/:id
 * Fetch resume + generate role matches
 */
router.get("/resume/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Validate ID format (prevents crash)
    if (!id) {
      return res.status(400).json({ error: "Resume ID is required" });
    }

    const resume = await Resume.findById(id);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // ✅ Extract skills safely from parsedData
    const rawSkills = resume.parsedData?.skills || [];

    // ✅ Convert objects → strings
    const skillsForMatcher = rawSkills
      .map(skill => skill?.name)
      .filter(Boolean); // remove undefined/null

    console.log("✅ SKILLS EXTRACTED:", skillsForMatcher);

    // ⚠️ Safety: handle empty skills
    let matches = [];
    if (skillsForMatcher.length > 0) {
      matches = generateRoleMatches(skillsForMatcher);
    } else {
      console.log("⚠️ No skills found in resume");
    }

    console.log("✅ MATCH RESULTS:", matches);

    return res.status(200).json({
      success: true,
      resume,
      matches
    });

  } catch (err) {
    console.error("❌ Route Error:", err);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
});

module.exports = router;