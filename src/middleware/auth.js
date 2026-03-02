const axios = require("axios");
const AUTH_TIMEOUT_MS = Number(process.env.AUTH_TIMEOUT_MS || 5000);

/**
 * Authentication Middleware
 * Validates JWT tokens by calling the Student/Auth service.
 * Secure by default (fail-closed).
 */

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.STUDENT_SERVICE_URL) {
    return res.status(503).json({ message: "Auth service is not configured" });
  }

  try {
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/auth/validate`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: AUTH_TIMEOUT_MS,
      }
    );

    const validated = response.data || {};
    if (!validated.id) {
      return res.status(401).json({ message: "Token validation response missing user id" });
    }

    req.user = {
      ...validated,
      id: validated.id,
      role: (validated.role || "student").toLowerCase(),
    };
    return next();
  } catch (error) {
    console.error("Token validation failed:", error.message);
    return res.status(401).json({ message: "Token validation failed" });
  }
};

module.exports = { authenticate };
