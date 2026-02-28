# Enrollment Service

Enrollment Service is the course enrollment microservice in the University Student Management System (SE4010 Cloud Computing Assignment).

## Service Purpose
- Enroll students into courses.
- Track enrollment records and status.
- Provide enrollment lookup endpoints for other services.
- Integrate with Student Service and Course Service for validation.
- Integrate with Grade Service to initialize grade records (when Grade Service is available).

## API Endpoints
Base URL (Cloud Run): `https://enrollment-service-763150334229.us-central1.run.app`

- `POST /enroll` - Enroll a student in a course
- `GET /enrollments` - Get all enrollments
- `GET /enrollments/student/{studentId}` - Get enrollments by student
- `GET /enrollments/course/{courseId}` - Get course roster
- `GET /enrollments/check` - Check enrollment status
- `PATCH /enrollments/{id}/status` - Update enrollment status
- `DELETE /enroll/{id}` - Cancel enrollment
- `GET /api-docs` - Swagger/OpenAPI UI

## Environment Variables
Required runtime variables:

- `MONGO_URI` - MongoDB connection string (in Cloud Run, configured via Secret Manager)
- `STUDENT_SERVICE_URL` - Base URL of Student Service
- `COURSE_SERVICE_URL` - Base URL of Course Service
- `GRADE_SERVICE_URL` - Base URL of Grade Service
- `PORT` - Service port (Cloud Run uses `8080`)

### Local `.env` example
```env
PORT=5003
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/enrollmentdb
STUDENT_SERVICE_URL=https://student-service-<id>.us-central1.run.app
COURSE_SERVICE_URL=https://course-service-<id>.us-central1.run.app
GRADE_SERVICE_URL=https://grade-service-<id>.us-central1.run.app
```

## Run Locally
```bash
npm install
cp .env.example .env
# update .env values
npm run dev
```

Local docs:
- `http://localhost:5003/api-docs`

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
3. Build and Push Docker image to Docker Hub
4. Deploy to Google Cloud Run

Cloud deployment:
- Platform: Google Cloud Run (`us-central1`)
- Service: `enrollment-service`
- Image: `docker.io/nuwanifonseka/enrollment-service:latest`
- Secret mapping in deploy step: `MONGO_URI=MONGO_URI:latest`

## Security Notes (Secret Manager + Snyk + JWT)
- `MONGO_URI` is not deployed as plain text; it is mapped from Google Secret Manager.
- CI includes Snyk security scanning before build/deploy.
- API Gateway and service endpoints support JWT-based protected routes for authorized operations.
- Input validation and duplicate enrollment checks are enforced in business logic.

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
2. Call Student Service validation endpoint.
3. Call Course Service validation/capacity endpoint.
4. Save enrollment record in Enrollment DB.
5. Call Grade Service to create initial grade record (if configured/available).

## Repository Artifacts Checklist
This repository includes:
- Source code (`src/`)
- Tests (`tests/`)
- Dockerfile
- CI/CD workflow (`.github/workflows/main.yml`)
- OpenAPI/Swagger docs (`/api-docs`)
- README (this file)
