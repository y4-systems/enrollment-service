const axios = require("axios");

const validateStudent = async (student_id) => {
  try {
    const response = await axios.get(
      `${process.env.STUDENT_SERVICE_URL}/students/${student_id}`
    );
    return response.data;
  } catch (error) {
    console.warn(`[MOCK] Student service unreachable. Mocking success for ${student_id}`);
    return { student_id, name: "Mock Student", status: "Valid" };
  }
};

const validateCourse = async (course_id) => {
  try {
    const response = await axios.get(
      `${process.env.COURSE_SERVICE_URL}/courses/${course_id}`
    );
    return response.data;
  } catch (error) {
    console.warn(`[MOCK] Course service unreachable. Mocking success for ${course_id}`);
    return { course_id, name: "Mock Course", capacity: 50 };
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
    console.warn(`[MOCK] Grade service unreachable. Mocking success for ${student_id} in ${course_id}`);
    return { message: "Mock grade record created" };
  }
};

module.exports = {
  validateStudent,
  validateCourse,
  createGradeRecord,
};