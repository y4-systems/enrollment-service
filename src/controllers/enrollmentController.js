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
        if (error.status) {
            return res.status(error.status).json({
                message: error.message,
                error: error.details || null,
            });
        }

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

exports.getEnrollmentsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const enrollments = await Enrollment.find({ course_id: courseId });

        if (!enrollments || enrollments.length === 0) {
            return res.status(404).json({
                message: "No enrollments found for this course",
            });
        }

        res.status(200).json(enrollments);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching course roster",
            error: error.message,
        });
    }
};

exports.checkEnrollment = async (req, res) => {
    try {
        const { studentId, courseId } = req.query;

        if (!studentId || !courseId) {
            return res.status(400).json({
                message: "studentId and courseId are required as query parameters",
            });
        }

        const enrollment = await Enrollment.findOne({
            student_id: studentId,
            course_id: courseId
        });

        if (!enrollment) {
            return res.status(200).json({
                isEnrolled: false,
                status: null
            });
        }

        res.status(200).json({
            isEnrolled: true,
            status: enrollment.status,
            enrollment_id: enrollment._id
        });

    } catch (error) {
        res.status(500).json({
            message: "Error checking enrollment validation",
            error: error.message,
        });
    }
};

exports.updateEnrollmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["ACTIVE", "CANCELLED", "WITHDRAWN", "COMPLETED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const enrollment = await Enrollment.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!enrollment) {
            return res.status(404).json({
                message: "Enrollment not found",
            });
        }

        res.status(200).json({
            message: `Enrollment status updated to ${status} successfully`,
            enrollment,
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating enrollment status",
            error: error.message,
        });
    }
};

exports.getAllEnrollments = async (req, res) => {
    try {
        // Fetch all enrollments, sorted by newest first
        const enrollments = await Enrollment.find().sort({ enrolled_at: -1 }).limit(100);

        if (!enrollments || enrollments.length === 0) {
            return res.status(404).json({
                message: "No enrollments found in the system",
            });
        }

        res.status(200).json(enrollments);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching all enrollments",
            error: error.message,
        });
    }
};
