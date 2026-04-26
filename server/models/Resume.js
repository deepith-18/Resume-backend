/**
 * models/Resume.js — Mongoose schema for uploaded and analyzed resumes
 */

const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['technical', 'soft', 'language', 'tool', 'framework', 'other'],
    default: 'other',
  },
  proficiency: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate',
  },
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  duration: String,          // e.g. "2 years"
  startDate: String,
  endDate: String,
  description: String,
  technologies: [String],
}, { _id: false });

const educationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  field: String,
  graduationYear: String,
  gpa: String,
}, { _id: false });

const resumeSchema = new mongoose.Schema(
  {
    // File metadata
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
  fileType: {
  type: String,
  enum: ['pdf', 'docx', 'doc'],
  required: true,
},
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
      required: true,
    },

    // Extracted raw text
   rawText: {
  type: String,
  default: "No text extracted",
},

    // AI-parsed structured data
    parsedData: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedIn: String,
      summary: String,
      totalExperienceYears: Number,
      experienceLevel: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
      },
      skills: [skillSchema],
      experience: [experienceSchema],
      education: [educationSchema],
      certifications: [String],
      languages: [String],
    },

    // Analysis metadata
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    analysisError: String,
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    strengths: [String],
    improvements: [String],
    aiSummary: String,

    // Processing timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    analyzedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: formatted file size
resumeSchema.virtual('fileSizeFormatted').get(function () {
  const kb = this.fileSize / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
});

// Index for faster queries
resumeSchema.index({ analysisStatus: 1, createdAt: -1 });
resumeSchema.index({ 'parsedData.skills.name': 1 });

module.exports = mongoose.model('Resume', resumeSchema);
