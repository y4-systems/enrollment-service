const Enrollment = require("../models/Enrollment");

const {
    validateStudent,
    validateCourse,
    createGradeRecord,
} = require("../services/externalServices");

exports.createEnrollment = async (req, res) => {
    try {
        const { student_id, course_id } = req.body;

        // Validate input
        if (!student_id || !course_id) {
            return res.status(400).json({
                message: "student_id and course_id are required",
            });
        }

        // Validate student via Student Service
        await validateStudent(student_id);

        // Validate course via Course Service
        await validateCourse(course_id);

        // Prevent duplicate enrollment
        const existing = await Enrollment.findOne({
            student_id,
            course_id,
            status: "ACTIVE",
        });

        if (existing) {
            return res.status(409).json({
                message: "Student already enrolled in this course",
            });
        }

        // Create enrollment
        const enrollment = new Enrollment({
            student_id,
            course_id,
        });

        await enrollment.save();

        // Trigger Grade Service
        await createGradeRecord(student_id, course_id);

        res.status(201).json({
            message: "Enrollment created successfully",
            enrollment,
        });

    } catch (error) {
        // Handle external service errors via Axios
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            return res.status(error.response.status).json({
                message: error.response.data.message || "External service error",
                service_details: error.response.data
            });
        } else if (error.request) {
            // The request was made but no response was received (e.g. connection refused)
            return res.status(503).json({
                message: "A required external microservice is currently unreachable.",
                error: error.message
            });
        }

        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

exports.getEnrollmentsByStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        const enrollments = await Enrollment.find({ student_id: studentId });

        if (!enrollments || enrollments.length === 0) {
            return res.status(404).json({
                message: "No enrollments found for this student",
            });
        }

        res.status(200).json(enrollments);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching enrollments",
            error: error.message,
        });
    }
};

exports.cancelEnrollment = async (req, res) => {
    try {
        const { id } = req.params;

        const enrollment = await Enrollment.findById(id);

        if (!enrollment) {
            return res.status(404).json({
                message: "Enrollment not found",
            });
        }

        if (enrollment.status === "CANCELLED") {
            return res.status(400).json({
                message: "Enrollment is already cancelled",
            });
        }

        enrollment.status = "CANCELLED";
        await enrollment.save();

        res.status(200).json({
            message: "Enrollment cancelled successfully",
            enrollment,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error cancelling enrollment",
            error: error.message,
        });
    }
};