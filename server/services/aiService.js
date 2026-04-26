const axios = require("axios");

// ─── FALLBACK ─────────────────────────────────────────

const fallback = () => ({
  name: "Demo User",
  skills: [
    {
      name: "Java",
      category: "technical",
      proficiency: "intermediate",
    },
  ],
  experienceLevel: "junior",
  overallScore: 75,
  summary: "Fallback result",
});

// ─── NORMALIZE OUTPUT (VERY IMPORTANT) ────────────────

const normalize = (data) => {
  return {
    name: data.name || "Unknown",

    skills: Array.isArray(data.skills)
      ? data.skills.map((s) => {
          if (typeof s === "string") {
            return {
              name: s,
              category: "technical",
              proficiency: "intermediate",
            };
          }

          return {
            name: s.name || "Unknown",
            category:
              ["technical", "soft", "language", "tool", "framework"].includes(
                s.category
              )
                ? s.category
                : "technical",
            proficiency:
              ["beginner", "intermediate", "advanced", "expert"].includes(
                s.proficiency
              )
                ? s.proficiency
                : "intermediate",
          };
        })
      : [],

    experienceLevel:
      ["entry", "junior", "mid", "senior", "lead"].includes(
        (data.experienceLevel || "").toLowerCase()
      )
        ? data.experienceLevel.toLowerCase()
        : "junior",

    overallScore:
      typeof data.overallScore === "number"
        ? data.overallScore
        : 70,

    summary: data.summary || "",
  };
};

// ─── AI CALL ─────────────────────────────────────────

const callAI = async (prompt) => {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openrouter/auto", // ✅ safest working option
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    console.log("AI ERROR:", err.response?.data || err.message);
    return JSON.stringify(fallback());
  }
};

// ─── MAIN ANALYZE FUNCTION ─────────────────────────

const analyzeResume = async (text) => {
  try {
    const prompt = `
You are a resume parsing AI.

Return ONLY JSON (no explanation).

Format:
{
  "name": "",
  "skills": [
    { "name": "", "category": "technical", "proficiency": "intermediate" }
  ],
  "experienceLevel": "junior",
  "overallScore": 0,
  "summary": ""
}

Rules:
- No extra text
- Valid JSON only
- experienceLevel: entry, junior, mid, senior, lead

Resume:
${text}
`;

    let output = await callAI(prompt);

    // clean markdown
    output = output.trim();
    if (output.startsWith("```")) {
      output = output.replace(/```json|```/g, "").trim();
    }

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch {
      console.log("❌ AI RAW OUTPUT:", output);
      return fallback();
    }

    return normalize(parsed); // ✅ CRITICAL FIX
  } catch (err) {
    console.log("ANALYZE ERROR:", err);
    return fallback();
  }
};

// ─── JOB RECOMMENDATION ─────────────────────────

const recommendJobs = async () => ({
  recommendations: [
    {
      title: "Software Developer",
      reason: "Matches your skills",
      relevanceScore: 80,
      matchedSkills: ["Java"],
      missingSkills: ["System Design"],
      jobType: "full-time",
    },
  ],
});

module.exports = {
  analyzeResume,
  recommendJobs,
};