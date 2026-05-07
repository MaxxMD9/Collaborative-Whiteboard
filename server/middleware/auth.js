const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// Middleware: require a valid JWT on protected routes 
// Attach this to any Exppress route that needs a logged-in user.
//
// Clients must send the token in the Authorization header like:
//   Authorization: Bearer <token>
//
// If valid the req.user is populated with the full User document.
// If invalid or missing the request is rejected with 401.

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from DB to make sure the account still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user; // available to the next handler as req.user
    next();
  } catch (err) {
    // JsonWebTokenError or TokenExpiredError
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };