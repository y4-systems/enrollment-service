const axios = require("axios");

const allowMocks = process.env.ALLOW_MOCK_SERVICES === "true";
const SAFE_SEGMENT_REGEX = /^[A-Za-z0-9_-]{1,120}$/;

const sanitizePathSegment = (value, fieldName) => {
  if (typeof value !== "string" || !SAFE_SEGMENT_REGEX.test(value.trim())) {
    const err = new Error(`${fieldName} has invalid format`);
    err.status = 400;
    throw err;
  }
  return encodeURIComponent(value.trim());
};

const handleServiceFailure = (serviceName, error, mockData) => {
  if (allowMocks) {
    console.warn(
      `[MOCK] ${serviceName} unreachable. Returning mock response because ALLOW_MOCK_SERVICES=true.`
    );
    return mockData;
  }

  const err = new Error(`${serviceName} is unreachable`);
  err.status = 503;
  err.details = error.message;
  throw err;
};

const validateStudent = async (student_id) => {
  try {
    const safeStudentId = sanitizePathSegment(student_id, "student_id");
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/students/${safeStudentId}`
    );
    return response.data;
  } catch (error) {
    return handleServiceFailure("Student service", error, {
      student_id,
      name: "Mock Student",
      status: "Valid",
    });
  }
};

const validateCourse = async (course_id) => {
  try {
    const safeCourseId = sanitizePathSegment(course_id, "course_id");
    const response = await axios.get(
      `${process.env.COURSE_SERVICE_URL}/courses/${safeCourseId}`
    );
    return response.data;
  } catch (error) {
    return handleServiceFailure("Course service", error, {
      course_id,
      name: "Mock Course",
      capacity: 50,
    });
  }
};

const createGradeRecord = async (student_id, course_id) => {
  try {
    const response = await axios.post(
      `${process.env.GRADE_SERVICE_URL}/grades`,
      { student_id, course_id }
    );
    return response.data;
  } catch (error) {
    return handleServiceFailure("Grade service", error, {
      message: "Mock grade record created",
    });
  }
};

module.exports = {
  validateStudent,
  validateCourse,
  createGradeRecord,
};
