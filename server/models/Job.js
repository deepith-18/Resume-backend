/**
 * models/Job.js — Mongoose schema for job listings and match results
 */

const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },

    // Recommended jobs (AI-generated)
    recommendations: [
      {
        title: { type: String, required: true },
        company: String,               // Suggested company type
        industry: String,
        salaryRange: {
          min: Number,
          max: Number,
          currency: { type: String, default: 'USD' },
        },
        location: String,
        remote: Boolean,
        relevanceScore: {
          type: Number,
          min: 0,
          max: 100,
          required: true,
        },
        matchedSkills: [String],        // Skills that matched
        missingSkills: [String],        // Skills to develop
        reasoning: String,              // AI explanation for recommendation
        jobType: {
          type: String,
          enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
          default: 'full-time',
        },
        experienceRequired: String,
        responsibilities: [String],
        benefits: [String],
        applyUrl: String,               // Placeholder URL
      },
    ],

    // Overall matching metadata
    topIndustries: [String],
    careerTrajectory: String,           // AI insight on career path
    developmentAreas: [String],         // Suggested skills to learn

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: top recommendation
jobMatchSchema.virtual('topRecommendation').get(function () {
  if (!this.recommendations || this.recommendations.length === 0) return null;
  return this.recommendations.reduce((best, job) =>
    job.relevanceScore > best.relevanceScore ? job : best
  );
});

module.exports = mongoose.model('JobMatch', jobMatchSchema);
