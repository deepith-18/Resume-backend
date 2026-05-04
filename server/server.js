// 1. Initial Environment Log
console.log("ENV CHECK:", process.env.MONGO_URI);

// 2. Dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// 3. Internal Imports
const connectDB = require('./utils/database');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const { errorHandler, notFound } = require('./utils/errorHandler');

// 4. ✅ Initialize App (Moved up so 'app' is defined before use)
const app = express();
const PORT = process.env.PORT || 5000;

// 5. ✅ Set Proxy Trust (Required for Render/Rate Limiting)
// This MUST come after 'const app = express()'
app.set('trust proxy', 1);

// 6. Setup Directories
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 7. Global Middleware
app.use(helmet());

app.use(cors({
  origin: [
    'http://127.0.0.1:5500', 
    'http://localhost:5500', 
    'https://aireumeanalyze.netlify.app' // ✅ Your Netlify URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 8. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// 9. Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 10. Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 11. Error Handling (Must be last)
app.use(notFound);
app.use(errorHandler);

// 12. Database & Server Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});