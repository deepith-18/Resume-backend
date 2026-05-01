const CANON = {
  "node": "nodejs",
  "nodejs": "nodejs",
  "nodejs": "nodejs",
  "js": "javascript",
  "javascript": "javascript",
  "reactjs": "react",
  "react": "react",
  "reactnative": "reactnative",
  "mongodb": "mongodb",
  "mongo": "mongodb",
  "postgresql": "sql",
  "mysql": "sql",
  "sql": "sql",
  "nosql": "nosql",
  "ai": "machinelearning",
  "ml": "machinelearning",
  "machinelearning": "machinelearning",
  "c++": "cpp",
  "cpp": "cpp",
  "c#": "csharp",
  "csharp": "csharp",
  "dsa": "datastructuresalgorithms",
  "datastructures": "datastructuresalgorithms"
};

const ROLE_MAP = [
  { title: "Frontend Developer", skills: ["react", "javascript", "html", "css", "typescript", "tailwind"] },
  { title: "Backend Developer", skills: ["node", "express", "mongodb", "sql", "python", "restapi"] },
  { title: "Full Stack Developer", skills: ["react", "node", "javascript", "mongodb", "sql"] },
  { title: "Software Engineer", skills: ["java", "python", "cpp", "dsa", "git"] },
  { title: "AI/ML Engineer", skills: ["python", "machinelearning", "pytorch", "tensorflow", "deeplearning"] },
  { title: "Mobile App Developer", skills: ["flutter", "dart", "reactnative", "firebase"] }
];

const normalize = (s = "") => {
  if (typeof s !== 'string') return "";
  return s.toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\.js/g, "js")
    .replace(/[^a-z0-9+#]/g, "");
};

const canonical = (s) => {
  const n = normalize(s);
  return CANON[n] || n;
};

/**
 * FIXED: Handles both string arrays and object arrays [{name: 'Skill'}]
 */
const generateRoleMatches = (skills = []) => {
  if (!Array.isArray(skills) || skills.length === 0) return [];

  // ✅ FIX: Ensure we extract the 'name' property if skills are objects
  const rawSkillNames = skills.map(s => {
    if (typeof s === 'string') return s;
    if (s && typeof s === 'object' && s.name) return s.name;
    return "";
  });

  const userSkills = [...new Set(rawSkillNames.map(s => canonical(s)))].filter(Boolean);

  const results = ROLE_MAP.map(role => {
    const matched = [];

    role.skills.forEach(roleSkill => {
      const r = canonical(roleSkill);
      if (userSkills.includes(r)) matched.push(roleSkill);
    });

    const score = Math.round(
      (matched.length / Math.max(role.skills.length, 5)) * 100
    );

    return {
      title: role.title,
      matchScore: Math.min(score, 100),
      matched_skills: matched,
      missing_skills: role.skills.filter(s => !matched.includes(s)),
      reason:
        score >= 70
          ? "Top Career Match"
          : score >= 40
          ? "Strong Potential"
          : "Exploratory Match",
    };
  });

  return results
    .filter(r => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
};

module.exports = { generateRoleMatches, canonical };