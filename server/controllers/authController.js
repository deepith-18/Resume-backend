const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SIGNUP
exports.register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // 🔥 FIX: normalize email
    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "SECRET",
      { expiresIn: '7d' }
    );

    res.json({ success: true, token, user });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // 🔥 FIX: normalize email SAME WAY
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    console.log("LOGIN EMAIL:", email);
    console.log("FOUND USER:", user);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "SECRET",
      { expiresIn: '7d' }
    );

    res.json({ success: true, token, user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};