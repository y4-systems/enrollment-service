const axios = require("axios");

const allowMocks = process.env.ALLOW_MOCK_SERVICES === "true";
const SAFE_SEGMENT_REGEX = /^[A-Za-z0-9_-]{1,120}$/;
const SERVICE_TIMEOUT_MS = Number(process.env.SERVICE_TIMEOUT_MS || 5000);

const isInvalidServiceUrl = (rawUrl) => {
  const value = String(rawUrl || "").trim();
  if (!value) return true;
  if (/placeholder/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return !(parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return true;
  }
};

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
  if (isInvalidServiceUrl(process.env.STUDENT_SERVICE_URL)) {
    return handleServiceFailure(
      "Student service",
      new Error("Invalid STUDENT_SERVICE_URL configuration"),
      { student_id, name: "Mock Student", status: "Valid" }
    );
  }
  try {
    const safeStudentId = sanitizePathSegment(student_id, "student_id");
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/students/${safeStudentId}`,
      { timeout: SERVICE_TIMEOUT_MS }
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
  if (isInvalidServiceUrl(process.env.COURSE_SERVICE_URL)) {
    return handleServiceFailure(
      "Course service",
      new Error("Invalid COURSE_SERVICE_URL configuration"),
      { course_id, name: "Mock Course", capacity: 50 }
    );
  }
  try {
    const safeCourseId = sanitizePathSegment(course_id, "course_id");
    const response = await axios.get(
      `${process.env.COURSE_SERVICE_URL}/courses/${safeCourseId}`,
      { timeout: SERVICE_TIMEOUT_MS }
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
  if (isInvalidServiceUrl(process.env.GRADE_SERVICE_URL)) {
    return handleServiceFailure(
      "Grade service",
      new Error("Invalid GRADE_SERVICE_URL configuration"),
      { message: "Mock grade record created" }
    );
  }
  try {
    const response = await axios.post(
      `${process.env.GRADE_SERVICE_URL}/grades`,
      { student_id, course_id },
      { timeout: SERVICE_TIMEOUT_MS }
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
