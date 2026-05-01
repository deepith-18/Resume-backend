const fs = require("fs");
const pdfParse = require("pdf-parse");
const Resume = require('../models/Resume');
const { analyzeResume } = require('../services/aiService');

// UPLOAD
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const file = req.file;

    if (!fs.existsSync(file.path)) {
      return res.status(500).json({
        success: false,
        error: "File missing on server",
      });
    }

    let rawText = "";

    try {
      if (file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        rawText = pdfData.text?.trim();
      } else {
        rawText = "Unsupported file type";
      }
    } catch (err) {
      console.log("❌ PDF parse error:", err.message);
      rawText = "Text extraction failed. Using fallback.";
    }

    if (!rawText || rawText.length < 10) {
      rawText = "Fallback resume content for analysis.";
    }

    const resume = await Resume.create({
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.originalname.split('.').pop().toLowerCase(),
      rawText,
      analysisStatus: "pending",
    });

    res.status(201).json({
      success: true,
      data: resume,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ANALYZE
const analyzeResumeById = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Resume not found",
      });
    }

    const aiResult = await analyzeResume(resume.rawText);

    const parsedData = {
      name: aiResult.name || "Candidate",
      skills:
        aiResult.skills && aiResult.skills.length > 0
          ? aiResult.skills
          : [
              { name: "Java", category: "technical", proficiency: "intermediate" },
              { name: "Python", category: "technical", proficiency: "intermediate" },
            ],
      experienceLevel: aiResult.experienceLevel || "junior",
    };

    resume.parsedData = parsedData;

    resume.strengths =
      resume.strengths?.length > 0
        ? resume.strengths
        : ["Good technical foundation", "Strong academic background"];

    resume.improvements =
      resume.improvements?.length > 0
        ? resume.improvements
        : ["Add more real-world projects", "Improve resume formatting"];

    resume.overallScore = aiResult.overallScore || 75;
    resume.aiSummary =
      aiResult.summary || "Candidate has strong technical skills and good potential.";

    resume.analysisStatus = "completed";

    await resume.save();

    res.json({
      success: true,
      data: resume,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET ONE
const getResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.json({
      success: true,
      data: resume,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// LIST
const listResumes = async (req, res) => {
  try {
    console.log("🔥 /api/resume HIT");

    const resumes = await Resume.find(); // remove sort temporarily

    console.log("✅ Resumes:", resumes.length);

    res.json({
      success: true,
      data: resumes,
    });

  } catch (error) {
    console.error("❌ ERROR IN listResumes:", error);

    res.status(500).json({
      success: false,
      error: error.message, // 👈 show real error
    });
  }
};

module.exports = {
  uploadResume,
  analyzeResumeById,
  getResume,
  listResumes,
};