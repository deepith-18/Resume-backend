const CANON = {
  "node": "nodejs",
  "nodejs": "nodejs",
  "node.js": "nodejs",
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

// ✅ Pure JS: No type annotations
const normalize = (s) => {
  if (typeof s !== 'string' || !s) return "";
  
  return s.toLowerCase()
    .replace(/\.js/g, "js") 
    .replace(/[^a-z0-9+#]/g, ""); 
};

const canonical = (s) => {
  const n = normalize(s);
  return n ? (CANON[n] || n) : "";
};

const generateRoleMatches = (skills = []) => {
  if (!Array.isArray(skills) || skills.length === 0) return [];

  const userSkills = [...new Set(skills.map(s => {
    let nameToProcess = "";
    if (typeof s === 'string') {
      nameToProcess = s;
    } else if (s && typeof s === 'object') {
      nameToProcess = s.name || s.title || "";
    }
    return canonical(nameToProcess);
  }))].filter(Boolean);

  const results = ROLE_MAP.map(role => {
    const matched = [];
    
    role.skills.forEach(roleSkill => {
      const canonReq = canonical(roleSkill);
      if (canonReq && userSkills.includes(canonReq)) {
        matched.push(roleSkill);
      }
    });

    const score = Math.round((matched.length / Math.max(role.skills.length, 4)) * 100);

    return {
      title: role.title,
      matchScore: Math.min(score, 100),
      matched_skills: matched,
      missing_skills: role.skills.filter(s => !matched.includes(s)),
      reason: score >= 70 ? "Top Career Match" : score >= 40 ? "Strong Potential" : "Exploratory Match",
    };
  });

  return results
    .filter(r => r.matched_skills.length > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
};

module.exports = { generateRoleMatches, canonical };