const axios = require("axios");

/**
 * Authentication Middleware
 * Validates JWT tokens by calling the Student/Auth service.
 * Secure by default (fail-closed). Optional bypass only for explicit local/dev usage.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const allowBypass = process.env.ALLOW_AUTH_BYPASS === "true";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.STUDENT_SERVICE_URL) {
    if (!allowBypass) {
      return res.status(503).json({ message: "Auth service is not configured" });
    }

    console.warn("[AUTH] Auth bypass enabled by ALLOW_AUTH_BYPASS=true");
    req.user = { id: "test-student-123", role: "student" };
    return next();
  }

  try {
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/auth/validate`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    req.user = response.data;
    return next();
  } catch (error) {
    if (allowBypass) {
      console.warn(
        `[AUTH] Validation failed (${error.message}), bypassing due to ALLOW_AUTH_BYPASS=true`
      );
      req.user = { id: "test-student-123", role: "student" };
      return next();
    }

    return res.status(401).json({ message: "Token validation failed" });
  }
};

module.exports = { authenticate };
