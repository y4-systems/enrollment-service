const express = require("express");
const router = express.Router();
const {
    createEnrollment,
    getEnrollmentsByStudent,
    cancelEnrollment,
    getEnrollmentsByCourse,
    checkEnrollment,
    updateEnrollmentStatus,
    getAllEnrollments,
} = require("../controllers/enrollmentController");
const { authenticate } = require("../middleware/auth");

// Protected routes — JWT validated via Auth Service
router.get("/enrollments", authenticate, getAllEnrollments);
router.post("/enroll", authenticate, createEnrollment);
router.delete("/enroll/:id", authenticate, cancelEnrollment);
router.patch("/enrollments/:id/status", authenticate, updateEnrollmentStatus);

// Internal/Validation route
router.get("/enrollments/check", checkEnrollment);

// Read-only roster/student history
router.get("/enrollments/student/:studentId", getEnrollmentsByStudent);
router.get("/enrollments/course/:courseId", getEnrollmentsByCourse);

module.exports = router;