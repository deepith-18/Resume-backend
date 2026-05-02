const fs = require("fs");
const pdfParse = require("pdf-parse");
const Resume = require('../models/Resume');
const { generateRoleMatches, canonical } = require('../utils/matcher');

// --- CONSTANTS ---
const STOP_WORDS = new Set([
  "the", "and", "with", "for", "from", "this", "that", "are", "was",
  "bachelor", "master", "university", "college", "english", "education",
  "january", "february", "march", "april", "may", "june", "july", "august"
]);

const KNOWN_TECH = [
  "java", "python", "javascript", "react", "node", "mongodb", "sql",
  "html", "css", "git", "docker", "kubernetes", "redis", "typescript",
  "flutter", "dart", "firebase", "express", "cpp", "csharp",
  // ✅ NEW: Electrical & Electronics
  "matlab", "simulink", "arduino", "raspberry pi", "plc", "vlsi", "verilog", "pcb", "labview",
  // ✅ NEW: Aerospace & Mechanical
  "ansys", "autocad", "solidworks", "catia", "propulsion", "aerodynamics", "thermodynamics", "cad",
  // ✅ NEW: Civil & General Engineering
  "revit", "staad pro", "surveying", "project management", "six sigma", "lean"
];

const PHRASES = [
  "machine learning", "data science", "rest api", "deep learning", "computer vision",
  // ✅ NEW: Core Engineering Phrases
  "circuit design", "embedded systems", "structural analysis", "fluid dynamics", "power systems"
];

/**
 * Consistently extracts skills and calculates a realistic score.
 */
const performLocalAnalysis = (rawText, fileName = "") => {
  const text = (rawText + " " + fileName).toLowerCase();
  const extracted = [];

  KNOWN_TECH.forEach(skill => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    if (regex.test(text)) {
      extracted.push(skill);
    }
  });

  PHRASES.forEach(p => {
    if (text.includes(p.toLowerCase())) extracted.push(p);
  });

  const cleaned = [...new Set(extracted.map(s => canonical(s)))].filter(s => !STOP_WORDS.has(s));
  
  // ✅ ENHANCED SCORING:
  // If no technical keywords are found, we check for common engineering indicators 
  // to avoid a 0 score for high-quality non-CS resumes.
  const hasEngineeringTerms = /engineer|analysis|design|project|systems|technical/i.test(text);
  
  let score = cleaned.length > 0 
    ? Math.min(cleaned.length * 8 + 45, 95) 
    : (hasEngineeringTerms ? 50 : 40); // Higher floor for engineering profiles
  
  return { cleaned, overallScore: score };
};

// ✅ UPLOAD: Handles file saving with forensic fallback for bad PDFs
const uploadResume = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "User ID is required" });

    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const file = req.file;
    let rawText = "";

    try {
      const dataBuffer = file.buffer;
      if (file.mimetype === "application/pdf") {
        const pdfData = await pdfParse(dataBuffer);
        rawText = pdfData.text?.trim() || "";
      } else {
        rawText = dataBuffer.toString('utf8');
      }
    } catch (err) {
      console.error("❌ Extraction Error:", err.message);
      // Handles "bad XRef entry" by using filename for keyword matching
      rawText = `Resume for ${file.originalname.replace(/[-_.]/g, ' ')}`; 
    }

    const { overallScore } = performLocalAnalysis(rawText, file.originalname);
    const candidateName = rawText.length > 20 ? rawText.split("\n")[0].trim().substring(0, 50) : "Candidate";

    const resume = await Resume.create({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.originalname.split('.').pop().toLowerCase(),
      rawText: rawText || "Processed Document", 
      analysisStatus: "completed",
      overallScore: overallScore, 
      aiSummary: "Profile processed via local forensic indexing.",
      strengths: ["Technical Foundation", "Clear Structure"],
      improvements: ["Quantify achievements", "Update project links"]
    });

    res.status(201).json({ success: true, data: resume });
  } catch (error) {
    console.error("❌ uploadResume Final Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ GET ONE: Detailed analysis view
const getResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const { cleaned, overallScore } = performLocalAnalysis(resume.rawText, resume.fileName);

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
    const formattedSkills = cleaned.slice(0, 15).map(s => {
      const specialCases = {
        "nodejs": "Node.js",
        "machinelearning": "Machine Learning",
        "cpp": "C++",
        "csharp": "C#",
        "matlab": "MATLAB",
        "autocad": "AutoCAD",
        "vlsi": "VLSI",
        "pcb": "PCB",
        "ansys": "ANSYS"
      };

      return {
        name: specialCases[s] || s.charAt(0).toUpperCase() + s.slice(1),
        category: "technical",
        proficiency: "intermediate"
      };
    });

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

// ✅ ANALYZE: Recalculate score for existing records
const analyzeResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) return res.status(404).json({ success: false, error: "Resume not found" });

    const { overallScore } = performLocalAnalysis(resume.rawText, resume.fileName);
    resume.overallScore = overallScore;
    resume.analysisStatus = "completed";
    await resume.save();

    res.json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ LIST: Dashboard view with dynamic score enrichment
const listResumes = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) return res.json({ success: true, data: [] });

    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });

    const enrichedResumes = resumes.map(resume => {
      const { overallScore } = performLocalAnalysis(resume.rawText, resume.fileName);

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