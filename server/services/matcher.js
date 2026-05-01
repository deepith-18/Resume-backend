// matcher.js

const ROLE_MAP = [ /* KEEP YOUR SAME ROLE_MAP */ ];

// ✅ SAFE NORMALIZATION
const normalize = (str) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(".js", "")
    .replace("c++", "cpp")
    .replace("c#", "csharp");
};

// ✅ SYNONYM HANDLING (CRUCIAL)
const skillMap = {
  js: "javascript",
  node: "nodejs",
  react: "reactjs",
  mongo: "mongodb",
  sql: "database",
  mysql: "database",
  postgresql: "database",
};

const mapSkill = (skill) => {
  const norm = normalize(skill);
  return skillMap[norm] || norm;
};

const generateRoleMatches = (skills) => {
  if (!skills || skills.length === 0) return [];

  // ✅ HANDLE BOTH FORMATS
  const skillNames = skills.map(s =>
    typeof s === "string"
      ? s.toLowerCase().trim()
      : (s.name || "").toLowerCase().trim()
  );

  const userSkills = skillNames.map(mapSkill);

  const results = ROLE_MAP.map(role => {
    const roleSkills = role.skills.map(mapSkill);

    let matchCount = 0;

    roleSkills.forEach(skill => {
      if (userSkills.includes(skill)) {
        matchCount++;
      }
    });

    const score = Math.min((matchCount / roleSkills.length) * 100, 100);

    return {
      title: role.title,
      matchScore: Math.round(score),
      match_score: Math.round(score),
      matched_skills: role.skills.filter(s =>
        userSkills.includes(mapSkill(s))
      ),
      missing_skills: role.skills.filter(s =>
        !userSkills.includes(mapSkill(s))
      ),
      reason: getReasonMessage(score),
      _matchCount: matchCount // debug only
    };
  });

  // ✅ SORT FIRST
  results.sort((a, b) => b.matchScore - a.matchScore);

  // ✅ SOFT FILTER (NOT STRICT)
  let filtered = results.filter(r => r._matchCount > 0);

  // ✅ FALLBACK (CRITICAL)
  if (filtered.length === 0) {
    return results.slice(0, 6);
  }

  return filtered.slice(0, 6);
};

// SAME FUNCTION (GOOD)
function getReasonMessage(score) {
  if (score >= 70) return "Top Career Match";
  if (score >= 40) return "Strong Potential";
  if (score >= 15) return "Good Alternative";
  return "Exploratory Match";
}

module.exports = { generateRoleMatches };