const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student_id: {
      type: String,
      required: true,
    },
    course_id: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "WITHDRAWN", "COMPLETED"],
      default: "ACTIVE",
    },
    enrolled_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);