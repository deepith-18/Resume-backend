const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  fileName: String,
  filePath: String,
  fileSize: Number,
  fileType: String,
  rawText: String,

  parsedData: {
    name: String,
    skills: [
      {
        name: String,
        category: String,
        proficiency: String,
      },
    ],
    experienceLevel: String,
  },

  analysisStatus: String,
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);