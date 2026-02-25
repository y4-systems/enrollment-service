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

    try {
        // Call Auth Service to validate the JWT
        const response = await axios.get(
            `${process.env.STUDENT_SERVICE_URL}/auth/validate`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        // Attach validated user data to request
        req.user = response.data;
        next();
    } catch (error) {
        // If Auth Service is unreachable, allow request with warning (fault tolerance)
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            console.warn("[AUTH] Auth service unreachable — allowing request (dev mode)");
            req.user = { id: "unknown", role: "student" };
            return next();
        }

        // If Auth Service returned 401/403, forward the error
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            return res.status(error.response.status).json({
                message: error.response.data.message || "Invalid or expired token",
            });
        }

        return res.status(401).json({ message: "Token validation failed" });
    }
};

module.exports = { authenticate };
