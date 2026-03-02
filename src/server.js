require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const enrollmentRoutes = require("./routes/enrollmentRoutes");

const app = express();
app.set("trust proxy", 1);

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("node:path");

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

// Swagger Documentation Options
const swaggerOptions = {
  customCss: '.swagger-ui { background-color: white; }',
  customSiteTitle: "Enrollment Service API Docs"
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Routes
// Support both root and /api prefixed routes so gateway base-path differences
// do not break enrollment endpoints.
app.use("/", enrollmentRoutes);
app.use("/api", enrollmentRoutes);

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    service: "Enrollment Service",
    status: "Running",
    timestamp: new Date(),
  });
});

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'enrollmentdb' });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

// Start server only when run directly (not during tests)
if (require.main === module) {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not defined in environment");
    process.exit(1);
  }

  (async () => {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Enrollment Service running on port ${PORT}`);
      console.log("Enrollment Service v4 — PURE ROUTES (NO /api PREFIX)");
    });
  })().catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
}

const Enrollment = require("./models/Enrollment");
module.exports = { app, Enrollment };
