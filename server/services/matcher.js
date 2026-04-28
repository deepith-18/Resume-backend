const ROLE_MAP = [
  {
    title: "Frontend Developer",
    skills: ["react", "javascript", "html", "css"],
  },
  {
    title: "Backend Developer",
    skills: ["node", "express", "mongodb", "sql"],
  },
  {
    title: "Full Stack Developer",
    skills: ["react", "node", "mongodb"],
  },
  {
    title: "Data Scientist",
    skills: ["python", "machine learning", "pandas"],
  },
  {
    title: "AI Engineer",
    skills: ["python", "deep learning", "nlp"],
  },
];

const generateRoleMatches = (skills) => {
  const skillNames = skills.map(s => s.name.toLowerCase());

  return ROLE_MAP.map(role => {
    const matched = role.skills.filter(skill =>
      skillNames.includes(skill)
    );

    const score = Math.round((matched.length / role.skills.length) * 100);

    return {
      title: role.title,
      matchScore: score,
      matched_skills: matched,
      missing_skills: role.skills.filter(s => !matched.includes(s)),
    };
  })
    .filter(r => r.matchScore > 20)
    .sort((a, b) => b.matchScore - a.matchScore);
};

module.exports = { generateRoleMatches };