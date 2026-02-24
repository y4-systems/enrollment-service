const express = require("express");
const router = express.Router();
const {
    createEnrollment,
    getEnrollmentsByStudent,
    cancelEnrollment,
} = require("../controllers/enrollmentController");

router.post("/enroll", createEnrollment);
router.get("/enrollments/:studentId", getEnrollmentsByStudent);
router.delete("/enroll/:id", cancelEnrollment);

module.exports = router;