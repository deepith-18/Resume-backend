// services/matcher.js

const ROLE_MAP = [
  { title: "Frontend Developer", skills: ["react", "javascript", "html", "css", "tailwind", "typescript", "nextjs"] },
  { title: "Backend Developer", skills: ["node", "express", "mongodb", "sql", "postgresql", "python", "rest api"] },
  { title: "Full Stack Developer", skills: ["react", "node", "javascript", "mongodb", "sql", "express"] },
  { title: "Software Engineer", skills: ["java", "python", "cpp", "dsa", "git"] },
  { title: "Data Scientist", skills: ["python", "pandas", "numpy", "statistics", "machinelearning", "sql"] },
  { title: "AI/ML Engineer", skills: ["python", "pytorch", "tensorflow", "deeplearning", "nlp", "machinelearning"] },
  { title: "Mobile App Developer", skills: ["flutter", "dart", "react native", "firebase"] },
  { title: "Embedded Systems Engineer", skills: ["c", "cpp", "microcontrollers", "rtos", "arduino"] }
];

const synonymMap = {
  js: "javascript",
  reactjs: "react",
  mongodb: "mongodb",
  postgresql: "sql",
  mysql: "sql",
  ai: "machinelearning",
  ml: "machinelearning",
  artificialintelligence: "machinelearning",
  dsa: "datastructuresalgorithms",
  nodejs: "node",
  expressjs: "express"
};

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\.js/g, "js")
    .replace(/\+/g, "p")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const getBaseSkill = (s) => {
  const norm = normalize(s);
  return synonymMap[norm] || norm;
};

const generateRoleMatches = (skills) => {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];

  const userSkills = skills.map(getBaseSkill).filter(Boolean);

  const results = ROLE_MAP.map(role => {
    const matched_skills = [];

    role.skills.forEach(roleSkill => {
      const baseRoleSkill = getBaseSkill(roleSkill);

      const isMatch = userSkills.some(uSkill =>
        uSkill === baseRoleSkill ||
        (uSkill.length > 4 && uSkill.includes(baseRoleSkill)) ||
        (baseRoleSkill.length > 4 && baseRoleSkill.includes(uSkill))
      );

      if (isMatch && !matched_skills.includes(roleSkill)) {
        matched_skills.push(roleSkill);
      }
    });

    const score = Math.round(
      (matched_skills.length / Math.max(role.skills.length, 5)) * 100
    );

    return {
      title: role.title,
      matchScore: Math.min(score, 100),
      matched_skills,
      missing_skills: role.skills.filter(s => !matched_skills.includes(s)),
      reason:
        score >= 70 ? "Top Career Match" :
        score >= 40 ? "Strong Potential" :
        "Exploratory Match"
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);

  const filtered = results.filter(r => r.matchScore > 0);
  return filtered.length > 0 ? filtered.slice(0, 6) : results.slice(0, 6);
};

module.exports = { generateRoleMatches };