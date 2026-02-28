const axios = require("axios");

const allowMocks = process.env.ALLOW_MOCK_SERVICES === "true";

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
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/students/${student_id}`
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
    const response = await axios.get(
      `${process.env.COURSE_SERVICE_URL}/courses/${course_id}`
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
