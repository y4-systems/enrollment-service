# 📝 Enrollment Service

Microservice for managing student enrollments in courses. Part of the **University Student Management System** — SE4010 Cloud Computing Assignment.

> 🔥 **This is the integration service.** It communicates with Student, Course, and Grade services to validate data and trigger downstream actions.

## 🛠 Tech Stack

- Node.js 18 + Express
- MongoDB Atlas (via Mongoose)
- Docker + Docker Hub
- GitHub Actions CI/CD
- Google Cloud Run (cloud deployment)

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in MONGO_URI (from MongoDB Atlas) and service URLs

# 3. Start dev server
npm run dev

# Visit: http://localhost:5003/
# Swagger Docs: http://localhost:5003/api-docs
```

## 🐳 Run with Docker

```bash
docker build -t enrollment-service .
docker run -p 5003:5003 --env-file .env enrollment-service
```

## 🧪 Run Tests

```bash
npm test
```

## 📡 API Endpoints

| Method   | Endpoint                      | Auth | Description                        |
|----------|-------------------------------|------|------------------------------------|
| `GET`    | `/`                           | None | Health check                       |
| `POST`   | `/api/enroll`                | None | Enroll student in a course         |
| `GET`    | `/api/enrollments/:studentId` | None | Get all enrollments for a student  |
| `DELETE` | `/api/enroll/:id`            | None | Cancel an enrollment               |
| `GET`    | `/api-docs`                  | None | Swagger API documentation          |

### Enroll endpoint — used by clients

```
POST /api/enroll
{ "student_id": "S1001", "course_id": "C2002" }
```

### Cancel endpoint — sets status to CANCELLED

```
DELETE /api/enroll/:id
```

## 🔗 Inter-Service Communication

| Service          | Purpose                     | Endpoint Called         |
|------------------|-----------------------------|-------------------------|
| Student Service  | Validate student exists     | `GET /students/:id`     |
| Course Service   | Validate course exists      | `GET /courses/:id`      |
| Grade Service    | Create initial grade record | `POST /grades`          |

> If any external service is unreachable, the service gracefully falls back to mock data and logs a warning — ensuring fault tolerance during development and production.

## 🔐 Security Features

- **Helmet** — Secure HTTP headers
- **CORS** — Cross-origin resource sharing
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **Snyk SAST** — Automated vulnerability scanning in CI/CD
- **Input Validation** — Required fields checked before processing
- **Duplicate Prevention** — Prevents duplicate active enrollments

## 🔑 GitHub Secrets Required

| Secret             | Where to get it                                        |
|--------------------|--------------------------------------------------------|
| `SNYK_TOKEN`       | snyk.io → free account → API Token                    |
| `DOCKER_USERNAME`  | Your Docker Hub username                               |
| `DOCKER_PASSWORD`  | Docker Hub → Account Settings → Security → New Token   |
| `GCP_SA_KEY`       | GCP → IAM → Service Accounts → Create Key (JSON)      |
| `MONGO_URI`        | MongoDB Atlas → Connect → Drivers                      |

## ☁️ Setup Guide

### 1. MongoDB Atlas (Free)

- Go to [mongodb.com/atlas](https://mongodb.com/atlas) → sign up free
- Create a free M0 cluster
- Go to **Database Access** → Add a user with password
- Go to **Network Access** → Add IP `0.0.0.0/0` (allow all — fine for assignment)
- Go to **Connect** → **Drivers** → copy the connection string
- Replace `<password>` with your user's password and add `/enrollmentdb` before the `?` → save as `MONGO_URI` secret

### 2. Docker Hub

- Sign up at [hub.docker.com](https://hub.docker.com)
- Go to **Account Settings** → **Security** → **New Access Token**
- Add as `DOCKER_PASSWORD` secret in GitHub

### 3. Google Cloud Run (Free Tier)

- Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project
- Enable **Cloud Run API** and **IAM API**
- Go to **IAM** → **Service Accounts** → Create Service Account
- Grant roles: **Cloud Run Admin** + **Service Account User**
- Click the account → **Keys** → **Add Key** → **JSON** → download
- Copy the entire JSON content → paste as `GCP_SA_KEY` secret in GitHub

**That's it — the pipeline deploys automatically on every push to `main`!**
