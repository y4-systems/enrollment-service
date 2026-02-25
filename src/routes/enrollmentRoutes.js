const express = require("express");
const router = express.Router();
const {
    createEnrollment,
    getEnrollmentsByStudent,
    cancelEnrollment,
} = require("../controllers/enrollmentController");
const { authenticate } = require("../middleware/auth");

// Protected routes — JWT validated via Auth Service
router.post("/enroll", authenticate, createEnrollment);
router.delete("/enroll/:id", authenticate, cancelEnrollment);

// Public route — read-only
router.get("/enrollments/:studentId", getEnrollmentsByStudent);

module.exports = router;