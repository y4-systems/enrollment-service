# Enrollment Service

Enrollment Service is the course enrollment microservice in the University Student Management System (SE4010 Cloud Computing Assignment).

## Table of Contents
- [Features](#features)
- [Service Purpose](#service-purpose)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Security Notes (Secret Manager + Snyk + JWT)](#security-notes-secret-manager--snyk--jwt)
- [Inter-Service Communication Flow](#inter-service-communication-flow)
- [Testing](#testing)
- [Docker](#docker)
- [CI/CD and Deployment Notes](#cicd-and-deployment-notes)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Repository Artifacts Checklist](#repository-artifacts-checklist)

## Features
- JWT-protected write operations (`POST`, `PATCH`, `DELETE`) with fail-closed auth behavior.
- Enrollment lifecycle management (create, list, check, update status, cancel).
- Duplicate active enrollment prevention.
- Inter-service validation with Student, Course, and Grade services.
- MongoDB persistence via Mongoose.
- Swagger/OpenAPI docs at `/api-docs`.
- Security middleware stack: `helmet`, `cors`, rate limiter, and request logging.
- Automated tests with Jest + Supertest.
- Docker-ready deployment.

## Service Purpose
- Enroll students into courses.
- Track enrollment records and status.
- Provide enrollment lookup endpoints for other services.
- Integrate with Student Service and Course Service for validation.
- Integrate with Grade Service to initialize grade records.

## Architecture
```text
Client / API Gateway
        |
        v
Enrollment Service (Express, Port 5003 local / 8080 Cloud Run)
  - Auth middleware (JWT validation via Student Service)
  - Enrollment routes/controllers
  - Rate limiting + Helmet + CORS
  - Swagger docs (/api-docs)
        |
        +--> MongoDB (enrollmentdb)
        +--> Student Service (auth/validate + student checks)
        +--> Course Service (course/capacity checks)
        +--> Grade Service (initial grade creation)
```

## Requirements
- Node.js 18+ (recommended current LTS)
- npm 9+
- MongoDB (local or Atlas)
- Docker (optional, for containerized run)

## Quick Start
### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Update `.env` values to your environment.

### 3. Run the service
```bash
npm run dev
```

### 4. Verify service
- Health: `http://localhost:5003/`
- API docs: `http://localhost:5003/api-docs`

## Configuration
### Environment Variables
Required runtime variables:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string (Cloud Run maps from Secret Manager) |
| `STUDENT_SERVICE_URL` | Yes | Base URL of Student Service |
| `COURSE_SERVICE_URL` | Yes | Base URL of Course Service |
| `GRADE_SERVICE_URL` | Yes | Base URL of Grade Service |
| `ALLOW_AUTH_BYPASS` | No | Local/dev auth bypass switch (`true` only for controlled testing) |
| `ALLOW_MOCK_SERVICES` | No | Local/dev mock switch (`true` only for controlled testing) |
| `PORT` | No | Service port (Cloud Run uses `8080`, local default in `.env.example` is `5003`) |

### Local `.env` example
```env
PORT=5003
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/enrollmentdb
STUDENT_SERVICE_URL=https://student-service-<id>.us-central1.run.app
COURSE_SERVICE_URL=https://course-service-<id>.us-central1.run.app
GRADE_SERVICE_URL=https://grade-service-<id>.us-central1.run.app
ALLOW_AUTH_BYPASS=false
ALLOW_MOCK_SERVICES=false
```

## API Endpoints
Base URL (production): configured via deployment/environment

Base URL (local): `http://localhost:5003`

- `GET /` - Health check
- `POST /enroll` - Enroll a student in a course (protected)
- `GET /enrollments` - Get all enrollments (protected)
- `GET /enrollments/student/{studentId}` - Get enrollments by student
- `GET /enrollments/course/{courseId}` - Get course roster
- `GET /enrollments/check` - Check enrollment status
- `PATCH /enrollments/{id}/status` - Update enrollment status (protected)
- `DELETE /enroll/{id}` - Cancel enrollment (protected)
- `GET /api-docs` - Swagger/OpenAPI UI

## Security Notes (Secret Manager + Snyk + JWT)
- `MONGO_URI` is not deployed as plain text; it is mapped from Google Secret Manager.
- CI includes Snyk security scanning before build/deploy.
- API Gateway and service endpoints support JWT-based protected routes for authorized operations.
- Enrollment auth is fail-closed by default: failed token validation returns `401` (no implicit production bypass).
- Inter-service validation is fail-closed by default: unreachable dependencies return `503` (no implicit production mock success).
- Input validation and duplicate enrollment checks are enforced in business logic.
- Global rate limit is enabled with `express-rate-limit` (100 requests per 15-minute window per IP).

## Inter-Service Communication Flow
Enrollment Service communicates with other microservices:

- Student Service:
  - Validate student identity/existence before enrollment.
- Course Service:
  - Validate course and capacity before enrollment.
- Grade Service:
  - Create/initialize grade record after successful enrollment.

Typical `POST /enroll` flow:
1. Receive enrollment request (`student_id`, `course_id`).
2. Validate auth token via Student Service (`/auth/validate`) for protected routes.
3. Call Student Service validation endpoint.
4. Call Course Service validation/capacity endpoint.
5. Save enrollment record in Enrollment DB.
6. Call Grade Service to create initial grade record (if configured/available).

## Testing
Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Current test suite covers:
- Health and docs endpoints.
- Auth middleware behavior.
- Enrollment create/list/check/update/cancel routes.
- Basic security headers (Helmet) and CORS behavior.

## Docker
Build and run:
```bash
docker build -t enrollment-service .
docker run -p 5003:5003 --env-file .env enrollment-service
```

Container image repository:
- `docker.io/nuwanifonseka/enrollment-service`

## CI/CD and Deployment Notes
GitHub Actions workflow file:
- `.github/workflows/main.yml`

Pipeline stages:
1. Test
2. Snyk Security Scan (fails on high/critical)
3. Build and push Docker image to Docker Hub
4. Deploy to Google Cloud Run

Cloud deployment:
- Platform: Google Cloud Run (`us-central1`)
- Service: `enrollment-service`
- Image: `docker.io/nuwanifonseka/enrollment-service:latest`
- Secret mapping in deploy step: `MONGO_URI=MONGO_URI:latest`

## Project Structure
```text
enrollment-service/
|-- src/
|   |-- controllers/
|   |   `-- enrollmentController.js
|   |-- middleware/
|   |   `-- auth.js
|   |-- models/
|   |   `-- Enrollment.js
|   |-- routes/
|   |   `-- enrollmentRoutes.js
|   |-- services/
|   |   `-- externalServices.js
|   |-- server.js
|   `-- swagger.yaml
|-- tests/
|   `-- enrollment.test.js
|-- .github/workflows/main.yml
|-- Dockerfile
|-- package.json
`-- README.md
```

## Troubleshooting
### "MONGO_URI not defined in environment"
Set `MONGO_URI` in `.env` or environment before starting the service.

### Token validation returns `401`
Check:
1. Authorization header is present as `Bearer <token>`.
2. `STUDENT_SERVICE_URL` is reachable.
3. `ALLOW_AUTH_BYPASS` is `false` in production.

### Dependency services unavailable (`503`)
Check Student/Course/Grade service URLs and network connectivity. In local controlled testing, use mock/bypass flags only when intentional.

### Port conflict locally
Change `PORT` in `.env` and restart the app.

## Repository Artifacts Checklist
This repository includes:
- Source code (`src/`)
- Tests (`tests/`)
- Dockerfile
- CI/CD workflow (`.github/workflows/main.yml`)
- OpenAPI/Swagger docs (`/api-docs`)
- README (this file)
