const Enrollment = require("../models/Enrollment");

const {
    validateStudent,
    validateCourse,
    createGradeRecord,
} = require("../services/externalServices");
const { isValidObjectId, sanitizeFilter } = require("mongoose");

const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,120}$/;

function sanitizeIdentifier(value, fieldName) {
    if (typeof value !== "string") {
        const err = new Error(`${fieldName} must be a string`);
        err.status = 400;
        throw err;
    }

    const trimmed = value.trim();
    if (!SAFE_ID_REGEX.test(trimmed)) {
        const err = new Error(`${fieldName} has invalid format`);
        err.status = 400;
        throw err;
    }

    return trimmed;
}

function isAdmin(req) {
    return (req.user?.role || "").toLowerCase() === "admin";
}

function canAccessStudent(req, studentId) {
    if (isAdmin(req)) return true;
    return req.user?.id && String(req.user.id) === String(studentId);
}

function handleKnownError(res, error, fallbackMessage) {
    if (error?.status) {
        return res.status(error.status).json({
            message: error.message || fallbackMessage,
        });
    }
    return res.status(500).json({
        message: fallbackMessage,
        error: error.message,
    });
}

exports.createEnrollment = async (req, res) => {
    try {
        const rawStudentId = req.body?.student_id;
        const rawCourseId = req.body?.course_id;

        // Validate input
        if (!rawStudentId || !rawCourseId) {
            return res.status(400).json({
                message: "student_id and course_id are required",
            });
        }
        const student_id = sanitizeIdentifier(rawStudentId, "student_id");
        const course_id = sanitizeIdentifier(rawCourseId, "course_id");

        if (!canAccessStudent(req, student_id)) {
            return res.status(403).json({
                message: "Students can only create enrollments for their own account",
            });
        }

        // Validate student via Student Service
        await validateStudent(student_id);

        // Validate course via Course Service
        await validateCourse(course_id);

        // Prevent duplicate enrollment
        const existing = await Enrollment.findOne(sanitizeFilter({
            student_id,
            course_id,
            status: "ACTIVE",
        }));

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

        return handleKnownError(res, error, "Internal server error");
    }
};

exports.getEnrollmentsByStudent = async (req, res) => {
    try {
        const studentId = sanitizeIdentifier(req.params?.studentId, "studentId");
        if (!canAccessStudent(req, studentId)) {
            return res.status(403).json({
                message: "Access denied for requested student enrollments",
            });
        }

        const enrollments = await Enrollment.find(sanitizeFilter({ student_id: studentId }));
        res.status(200).json(Array.isArray(enrollments) ? enrollments : []);
    } catch (error) {
        return handleKnownError(res, error, "Error fetching enrollments");
    }
};

exports.cancelEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid enrollment id format",
            });
        }

        const enrollment = await Enrollment.findById(id);

        if (!enrollment) {
            return res.status(404).json({
                message: "Enrollment not found",
            });
        }

        if (!canAccessStudent(req, enrollment.student_id)) {
            return res.status(403).json({
                message: "Access denied for this enrollment",
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
        return handleKnownError(res, error, "Error cancelling enrollment");
    }
};

exports.getEnrollmentsByCourse = async (req, res) => {
    try {
        const courseId = sanitizeIdentifier(req.params?.courseId, "courseId");
        let query = sanitizeFilter({ course_id: courseId });
        if (!isAdmin(req)) {
            const userId = sanitizeIdentifier(req.user?.id, "userId");
            query = sanitizeFilter({ ...query, student_id: userId });
        }
        const enrollments = await Enrollment.find(query);
        res.status(200).json(Array.isArray(enrollments) ? enrollments : []);
    } catch (error) {
        return handleKnownError(res, error, "Error fetching course roster");
    }
};

exports.checkEnrollment = async (req, res) => {
    try {
        const { studentId: rawStudentId, courseId: rawCourseId } = req.query;

        if (!rawStudentId || !rawCourseId) {
            return res.status(400).json({
                message: "studentId and courseId are required as query parameters",
            });
        }
        const studentId = sanitizeIdentifier(rawStudentId, "studentId");
        const courseId = sanitizeIdentifier(rawCourseId, "courseId");

        const enrollment = await Enrollment.findOne(sanitizeFilter({
            student_id: studentId,
            course_id: courseId
        }));

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
        return handleKnownError(res, error, "Error checking enrollment validation");
    }
};

exports.updateEnrollmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid enrollment id format",
            });
        }

        const validStatuses = ["ACTIVE", "CANCELLED", "WITHDRAWN", "COMPLETED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const enrollment = await Enrollment.findById(id);
        if (!enrollment) {
            return res.status(404).json({
                message: "Enrollment not found",
            });
        }

        if (!canAccessStudent(req, enrollment.student_id)) {
            return res.status(403).json({
                message: "Access denied for this enrollment",
            });
        }

        enrollment.status = status;
        await enrollment.save();

        res.status(200).json({
            message: `Enrollment status updated to ${status} successfully`,
            enrollment,
        });

    } catch (error) {
        return handleKnownError(res, error, "Error updating enrollment status");
    }
};

exports.getAllEnrollments = async (req, res) => {
    try {
        const query = isAdmin(req)
            ? {}
            : sanitizeFilter({ student_id: sanitizeIdentifier(req.user?.id, "userId") });
        const enrollments = await Enrollment.find(query).sort({ enrolled_at: -1 }).limit(100);
        res.status(200).json(Array.isArray(enrollments) ? enrollments : []);
    } catch (error) {
        return handleKnownError(res, error, "Error fetching all enrollments");
    }
};
