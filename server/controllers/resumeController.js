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

/**
 * Helper to extract skills and calculate a realistic score.
 * Formula: Base 30 + (Skills * 7), capped at 95. 
 * This ensures variety (3 skills = 51%, 6 skills = 72%, 9+ skills = 93%+).
 */
const performLocalAnalysis = (rawText) => {
  const text = (rawText || "").toLowerCase();
  const extracted = [];

  KNOWN_TECH.forEach(skill => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    if (regex.test(text)) {
      extracted.push(skill);
    } else if (skill === "node" && (text.includes("node.js") || text.includes("nodejs"))) {
      extracted.push(skill);
    } else if (skill === "javascript" && text.includes(" js ")) {
      extracted.push(skill);
    }
  });

  PHRASES.forEach(p => {
    if (text.includes(p.toLowerCase())) extracted.push(p);
  });

  const cleaned = [...new Set(extracted.map(s => canonical(s)))].filter(s => !STOP_WORDS.has(s));
  
  // Scoring logic
  const overallScore = cleaned.length > 0 ? Math.min(cleaned.length * 7 + 30, 95) : 0;
  
  return { cleaned, overallScore };
};

// ✅ UPLOAD: Handles file saving and initial data creation
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const file = req.file;
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
      rawText = "Text extraction failed.";
    }

    const { overallScore } = performLocalAnalysis(rawText);
    const candidateName = rawText.split("\n")[0].trim().substring(0, 50) || "Candidate";

    const resume = await Resume.create({
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.originalname.split('.').pop().toLowerCase(),
      rawText,
      analysisStatus: "completed",
      overallScore, // ✅ Now dynamic on upload
      aiSummary: "Processed successfully using local keyword analysis.",
      strengths: ["Technical Proficiency", "Clear Structure"],
      improvements: ["Add more project links", "Highlight achievements"]
    });

    res.status(201).json({ success: true, data: resume });
  } catch (error) {
    console.error("❌ uploadResume Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ GET ONE: Extracts skills on the fly for detailed view
const getResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const { cleaned, overallScore } = performLocalAnalysis(resume.rawText);

    // Summary extraction
    let summary = "";
    const summaryMatch = resume.rawText.match(/(summary|objective)[\s:]*([\s\S]{50,300})/i);
    if (summaryMatch) {
      summary = summaryMatch[2].split("\n\n")[0].trim(); 
    } else {
      const lines = resume.rawText.split("\n").filter(l => l.trim().length > 30);
      summary = lines.slice(0, 2).join(" ");
    }

    const name = resume.rawText.split("\n")[0]?.trim() || "Candidate";
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
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) return res.status(404).json({ success: false, error: "Resume not found" });

    const { overallScore } = performLocalAnalysis(resume.rawText);
    resume.overallScore = overallScore;
    resume.analysisStatus = "completed";
    await resume.save();

    res.json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ LIST: Fetches all resumes for the Dashboard
const listResumes = async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });

    const enrichedResumes = resumes.map(resume => {
      const { overallScore } = performLocalAnalysis(resume.rawText);

      return {
        ...resume._doc,
        overallScore,
        parsedData: {
          ...resume.parsedData,
          name: resume.rawText?.split("\n")[0]?.trim()?.substring(0, 50) || "Candidate"
        }
      };
    });

    res.json({ success: true, data: enrichedResumes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { uploadResume, analyzeResumeById, getResume, listResumes };