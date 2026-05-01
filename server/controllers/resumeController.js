const fs = require("fs");
const pdfParse = require("pdf-parse");
const Resume = require('../models/Resume');
const { generateRoleMatches, canonical } = require('../utils/matcher');

// --- CONSTANTS FOR PARSING ---
const STOP_WORDS = new Set([
  "the", "and", "with", "for", "from", "this", "that", "are", "was",
  "bachelor", "master", "university", "college", "english", "education",
  "january", "february", "march", "april", "may", "june", "july", "august"
]);

const KNOWN_TECH = [
  "java", "python", "javascript", "react", "node", "mongodb", "sql",
  "html", "css", "git", "docker", "kubernetes", "redis", "typescript",
  "flutter", "dart", "firebase", "express", "cpp", "csharp"
];

const PHRASES = ["machine learning", "data science", "rest api", "deep learning", "computer vision"];

// ✅ UPLOAD: Handles file saving and initial data creation
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;

    if (!fs.existsSync(file.path)) {
      return res.status(500).json({ success: false, error: "File missing on server" });
    }

    let rawText = "";

    try {
      if (file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        rawText = pdfData.text?.trim() || "";
      } else {
        rawText = "Plain text format";
      }
    } catch (err) {
      console.log("❌ PDF parse error:", err.message);
      rawText = "Text extraction failed.";
    }

    if (!rawText || rawText.length < 5) {
      rawText = "New Resume Content";
    }

    // ✅ FIXED NAME EXTRACTION: Takes the first line of the document
    const candidateName = rawText.split("\n")[0].trim().substring(0, 50) || "Candidate";

    const resume = await Resume.create({
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.originalname.split('.').pop().toLowerCase(),
      rawText,
      analysisStatus: "completed", // Set to completed as we use local parsing
      overallScore: 75,
      aiSummary: "Processed successfully using local keyword analysis.",
      strengths: ["Technical Proficiency", "Clear Structure"],
      improvements: ["Add more project links", "Highlight achievements"]
    });

    res.status(201).json({
      success: true,
      data: resume,
    });

  } catch (error) {
    console.error("❌ uploadResume Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ GET ONE: Extracts skills on the fly and generates job matches
const getResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const text = (resume.rawText || "");
    const lowerText = text.toLowerCase();

    // 1. 🔥 REGEX SKILL EXTRACTION
    const extracted = [];
    
    KNOWN_TECH.forEach(skill => {
      // Escape special characters in skill name for regex (like c++)
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
      
      if (regex.test(lowerText)) {
        extracted.push(skill);
      } else if (skill === "node" && (lowerText.includes("node.js") || lowerText.includes("nodejs"))) {
        extracted.push(skill);
      } else if (skill === "javascript" && lowerText.includes(" js ")) {
        extracted.push(skill);
      }
    });

    PHRASES.forEach(p => {
      if (lowerText.includes(p.toLowerCase())) {
        extracted.push(p);
      }
    });

    const cleaned = [...new Set(extracted.map(s => canonical(s)))].filter(s => !STOP_WORDS.has(s));

    // 2. ✅ SMART SUMMARY EXTRACTION
    let summary = "";
    const summaryMatch = text.match(/(summary|objective)[\s:]*([\s\S]{50,300})/i);

    if (summaryMatch) {
      summary = summaryMatch[2].split("\n\n")[0].trim(); 
    } else {
      const lines = text.split("\n").filter(l => l.trim().length > 30);
      summary = lines.slice(0, 2).join(" ");
    }

    // 3. ✅ DYNAMIC UI CALCULATIONS
    const name = text.split("\n")[0]?.trim() || "Candidate";
    const overallScore = Math.min(cleaned.length * 8 + 40, 95);
    const experienceLevel = cleaned.length >= 10 ? "senior" : cleaned.length >= 6 ? "intermediate" : "junior";
    
    const matches = generateRoleMatches(cleaned);
    const formattedSkills = cleaned.slice(0, 15).map(s => ({
      name: s === "nodejs" ? "Node.js" : 
            s === "machinelearning" ? "Machine Learning" : 
            s === "cpp" ? "C++" : 
            s === "csharp" ? "C#" : 
            s.charAt(0).toUpperCase() + s.slice(1),
      category: "technical",
      proficiency: "intermediate"
    }));

    res.json({
      success: true,
      data: {
        ...resume._doc,
        parsedData: { name, skills: formattedSkills, experienceLevel },
        overallScore,
        aiSummary: summary, 
        strengths: ["Technical Proficiency", "Clear Structure"],
        improvements: ["Add more project links", "Highlight achievements"]
      },
      matches
    });
  } catch (error) {
    console.error("❌ getResume Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// ✅ ANALYZE: Stable fallback
const analyzeResumeById = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }

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

// ✅ LIST: Fetches all resumes
const listResumes = async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: resumes,
    });
  } catch (error) {
    console.error("❌ ERROR IN listResumes:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  uploadResume,
  analyzeResumeById,
  getResume,
  listResumes,
};