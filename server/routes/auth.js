const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");

const router = express.Router();

// Helper: sign a JWT for a given user ID
function signToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/register 
// Create a new account.
// Body: { username, email, password }
// Returns: { user, token }
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic presence check before hitting the DB
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email, and password are required" });
    }

    // Check for duplicate username or email
    const existing = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });

    if (existing) {
      const field = existing.username === username ? "Username" : "Email";
      return res.status(409).json({ error: `${field} is already taken` });
    }

    // Create user - password gets hashed automatically by the pre-save hook
    const user  = await User.create({ username, email, password });
    const token = signToken(user._id);

    res.status(201).json({ user, token });
  } catch (err) {
    // Mongoose validation errors (minlength, regex, etc.)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// POST /api/auth/login 
// Log in with email + password.
// Body should be: { email, password }
// Returns: { user, token }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fetch the user with intentionally vague error message so we don't reveal whether the email exists in the system
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id);

    // user.toJSON() strips the password field automatically
    res.json({ user, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// GET /api/auth/me 
// Return the currently logged-in user's profile.
// This will requires: Authorization: Bearer <token>
const { requireAuth } = require("../middleware/auth");

router.get("/me", requireAuth, (req, res) => {
  // req.user was populated by requireAuth middleware
  res.json({ user: req.user });
});

module.exports = router;