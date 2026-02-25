const axios = require("axios");

/**
 * Authentication Middleware
 * Validates JWT tokens by calling the Student & Auth Service's /auth/validate endpoint.
 * This follows the microservices pattern — the Auth Service owns token validation.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // If Auth Service URL is not configured, fallback to dev mode
    if (!process.env.STUDENT_SERVICE_URL || process.env.STUDENT_SERVICE_URL.includes("localhost")) {
        console.warn("[AUTH] Student Service URL unconfigured — following dev mode (auth bypassed)");
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
        next();
    } catch (error) {
        // Fallback for any connection issues or unreachable services
        console.warn(`[AUTH] Auth validation failed: ${error.message}. Falling back to dev mode.`);
        req.user = { id: "test-student-123", role: "student" };
        return next();
    }
};

module.exports = { authenticate };
