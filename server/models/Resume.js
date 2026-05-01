const express = require('express');
const router = express.Router();
const Resume = require('../models/Resume');
const { generateRoleMatches } = require('../utils/matcher');

router.get("/resume/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // ✅ FIXED PATH: Get the objects from parsedData
    const rawSkills = resume.parsedData?.skills || [];

    // ✅ EXTRACTION: The matcher needs strings, not objects.
    // This maps [{name: 'Java', ...}, {name: 'Python', ...}] -> ['Java', 'Python']
    const skillsForMatcher = rawSkills.map(skill => skill.name);

    console.log("✅ SKILLS EXTRACTED FOR MATCHER:", skillsForMatcher);

    // Call the matching logic
    const matches = generateRoleMatches(skillsForMatcher);

    console.log("✅ MATCH RESULTS:", matches);

    res.json({
      success: true,
      resume,
      matches
    });

  } catch (err) {
    console.error("Route Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;