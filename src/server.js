require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const enrollmentRoutes = require("./routes/enrollmentRoutes");

const app = express();

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
const path = require("path");

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

// Swagger Documentation Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/api", enrollmentRoutes);

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    service: "Enrollment Service",
    status: "Running",
    timestamp: new Date(),
  });
});

// Validate Environment Variables
if (!process.env.PORT) {
  console.error("PORT not defined in environment");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not defined in environment");
  process.exit(1);
}

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, () => {
      console.log(`Enrollment Service running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });