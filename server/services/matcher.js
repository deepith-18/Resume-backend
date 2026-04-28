/**
 * Expanded Role Library covering Web, Mobile, Data, Cloud, Design, and Hardware
 */
const ROLE_MAP = [
  // --- WEB & FULL STACK ---
  { title: "Frontend Developer", skills: ["react", "javascript", "html", "css", "tailwind", "typescript", "nextjs"] },
  { title: "Backend Developer", skills: ["node", "express", "mongodb", "sql", "postgresql", "python", "rest api"] },
  { title: "Full Stack Developer", skills: ["react", "node", "javascript", "mongodb", "sql", "express"] },
  { title: "Software Engineer", skills: ["java", "python", "c++", "dsa", "problem solving", "git"] },

  // --- DATA & AI ---
  { title: "Data Scientist", skills: ["python", "pandas", "numpy", "statistics", "machine learning", "sql"] },
  { title: "AI/ML Engineer", skills: ["python", "pytorch", "tensorflow", "deep learning", "nlp", "neural networks"] },
  { title: "Data Analyst", skills: ["sql", "excel", "tableau", "powerbi", "data visualization", "python"] },

  // --- MOBILE & APPS ---
  { title: "Mobile App Developer", skills: ["flutter", "dart", "react native", "firebase", "mobile design"] },
  { title: "Android Developer", skills: ["kotlin", "java", "android sdk", "android studio", "firebase"] },
  { title: "iOS Developer", skills: ["swift", "swiftui", "xcode", "objective-c", "core data"] },

  // --- CLOUD & SECURITY ---
  { title: "DevOps Engineer", skills: ["aws", "docker", "kubernetes", "linux", "jenkins", "terraform", "cicd"] },
  { title: "Cloud Architect", skills: ["aws", "azure", "gcp", "microservices", "serverless", "cloud computing"] },
  { title: "Cybersecurity Analyst", skills: ["network security", "linux", "penetration testing", "cryptography", "ethical hacking"] },

  // --- DESIGN & PRODUCT ---
  { title: "UI/UX Designer", skills: ["figma", "adobe xd", "prototyping", "wireframing", "user research", "ui design"] },
  { title: "Product Manager", skills: ["agile", "scrum", "jira", "product strategy", "market research", "leadership"] },

  // --- HARDWARE & CORE ---
  { title: "Embedded Systems Engineer", skills: ["c", "c++", "microcontrollers", "rtos", "embedded c", "arduino"] },
  { title: "IoT Engineer", skills: ["arduino", "raspberry pi", "mqtt", "sensors", "python", "c++"] },
  { title: "Aerospace Engineer", skills: ["matlab", "cad", "simulink", "thermodynamics", "aerodynamics"] }
];

/**
 * Generates matches by comparing user skills against the expanded role map
 */
const generateRoleMatches = (skills) => {
  // Ensure we have an array and extract names to lowercase
  const skillNames = (skills || []).map(s => (s.name || "").toLowerCase().trim());

  return ROLE_MAP.map(role => {
    // Flexible matching: checks if any user skill contains the required role skill 
    // or vice versa (e.g., "PostgreSQL" matches "sql")
    const matched = role.skills.filter(reqSkill =>
      skillNames.some(userSkill => 
        userSkill.includes(reqSkill) || reqSkill.includes(userSkill)
      )
    );

    // Calculate score based on percentage of skills matched
    const score = Math.round((matched.length / role.skills.length) * 100);

    return {
      title: role.title,
      matchScore: score,
      matched_skills: matched,
      missing_skills: role.skills.filter(s => !matched.includes(s)),
    };
  })
  // We keep any match with at least one skill found
  .filter(r => r.matchScore > 0) 
  .sort((a, b) => b.matchScore - a.matchScore)
  // Limit to top 6 most relevant roles
  .slice(0, 6);
};

module.exports = { generateRoleMatches };