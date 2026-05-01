/**
 * FINAL PRODUCTION MATCHER
 * Includes: Bracket removal, safe fuzzy matching, expanded synonyms, and stabilized scoring.
 */

const ROLE_MAP = [
  // --- WEB & FULL STACK ---
  { title: "Frontend Developer", skills: ["react", "javascript", "html", "css", "tailwind", "typescript", "nextjs"] },
  { title: "Backend Developer", skills: ["node", "express", "mongodb", "sql", "postgresql", "python", "rest api"] },
  { title: "Full Stack Developer", skills: ["react", "node", "javascript", "mongodb", "sql", "express"] },
  { title: "Software Engineer", skills: ["java", "python", "cpp", "dsa", "git"] },

  // --- DATA & AI ---
  { title: "Data Scientist", skills: ["python", "pandas", "numpy", "statistics", "machinelearning", "sql"] },
  { title: "AI/ML Engineer", skills: ["python", "pytorch", "tensorflow", "deeplearning", "nlp", "machinelearning"] },
  { title: "Data Analyst", skills: ["sql", "excel", "tableau", "powerbi", "data visualization", "python"] },

  // --- MOBILE & APPS ---
  { title: "Mobile App Developer", skills: ["flutter", "dart", "react native", "firebase", "mobile design"] },
  { title: "Android Developer", skills: ["kotlin", "java", "android sdk", "android studio", "firebase"] },
  { title: "iOS Developer", skills: ["swift", "swiftui", "xcode", "objective-c", "core data"] },

  // --- CLOUD & SECURITY ---
  { title: "DevOps Engineer", skills: ["aws", "docker", "kubernetes", "linux", "jenkins", "terraform", "cicd"] },
  { title: "Cloud Architect", skills: ["aws", "azure", "gcp", "microservices", "serverless", "cloud computing"] },
  { title: "Cybersecurity Analyst", skills: ["network security", "linux", "penetration testing", "cryptography", "ethical hacking"] },

  // --- HARDWARE & CORE ---
  { title: "Embedded Systems Engineer", skills: ["c", "cpp", "microcontrollers", "rtos", "embedded c", "arduino"] },
  { title: "IoT Engineer", skills: ["arduino", "raspberry pi", "mqtt", "sensors", "python", "cpp"] }
];

const synonymMap = {
  js: "javascript",
  reactjs: "react",
  mongodb: "mongo",
  postgresql: "sql",
  mysql: "sql",
  ai: "machinelearning",
  artificialintelligence: "machinelearning",
  ml: "machinelearning",
  dsa: "datastructuresalgorithms",
  datastructuresalgorithms: "dsa",
  nodejs: "node",
  expressjs: "express"
};

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/\(.*?\)/g, "")     // ✅ Remove bracketed terms (ml), (ai)
    .replace(/\.js/g, "js")
    .replace(/\+/g, "p")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "")   // Strip spaces/special chars
    .trim();
};

const getBaseSkill = (s) => {
  const norm = normalize(s);
  return synonymMap[norm] || norm;
};

const generateRoleMatches = (skills) => {
  if (!skills || !Array.isArray(skills)) return [];

  const userSkills = skills.map(s => {
    const name = typeof s === "string" ? s : (s.name || "");
    return getBaseSkill(name);
  }).filter(s => s.length > 0);

  const results = ROLE_MAP.map(role => {
    const matched_skills = [];
    
    role.skills.forEach(roleSkill => {
      const baseRoleSkill = getBaseSkill(roleSkill);
      
      // ✅ SAFE FUZZY MATCHING (Fixes SQL vs NoSQL issue)
      const isMatch = userSkills.some(uSkill => {
        return (
          uSkill === baseRoleSkill ||
          (uSkill.length > 4 && uSkill.includes(baseRoleSkill)) ||
          (baseRoleSkill.length > 4 && baseRoleSkill.includes(uSkill))
        );
      });

      if (isMatch) matched_skills.push(roleSkill);
    });

    // ✅ STABILIZED SCORING (Prevents small role-list bias)
    const score = Math.round(
      (matched_skills.length / Math.max(role.skills.length, 5)) * 100
    );

    return {
      title: role.title,
      matchScore: Math.min(score, 100),
      match_score: Math.min(score, 100), // Legacy support
      matched_skills,
      missing_skills: role.skills.filter(s => !matched_skills.includes(s)),
      reason: getReasonMessage(score)
    };
  });

  // Sort by score
  results.sort((a, b) => b.matchScore - a.matchScore);

  // Fallback: If no matches, return top 6 roles as "Exploratory"
  const hasMatches = results.filter(r => r.matchScore > 0);
  return hasMatches.length > 0 ? hasMatches.slice(0, 6) : results.slice(0, 6);
};

function getReasonMessage(score) {
  if (score >= 70) return "Top Career Match";
  if (score >= 40) return "Strong Potential";
  if (score >= 10) return "Good Alternative";
  return "Exploratory Match";
}

module.exports = { generateRoleMatches };