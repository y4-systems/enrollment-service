const request = require('supertest');

// ── Set env before anything loads ────────────────────────────────
process.env.PORT = '5003';
process.env.MONGO_URI = 'mongodb://localhost/test';
process.env.STUDENT_SERVICE_URL = 'http://localhost:5001';
process.env.COURSE_SERVICE_URL = 'http://localhost:5002';
process.env.GRADE_SERVICE_URL = 'http://localhost:5004';

// ── Mock mongoose so no real DB needed ───────────────────────────
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return { ...actual, connect: jest.fn().mockResolvedValue(true) };
});

// ── Mock axios so no real HTTP calls ─────────────────────────────
jest.mock('axios', () => ({
    get: jest.fn().mockRejectedValue({ code: 'ECONNREFUSED' }),
    post: jest.fn().mockRejectedValue({ code: 'ECONNREFUSED' }),
}));

let app, Enrollment;

beforeAll(() => {
    ({ app, Enrollment } = require('../src/server'));
});

afterEach(() => jest.clearAllMocks());

// ── Health Check ──────────────────────────────────────────────────
describe('GET / (Health Check)', () => {
    it('returns service info with status Running', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.service).toBe('Enrollment Service');
        expect(res.body.status).toBe('Running');
        expect(res.body).toHaveProperty('timestamp');
    });
});

// ── Swagger Docs ──────────────────────────────────────────────────
describe('GET /api-docs', () => {
    it('returns swagger documentation page', async () => {
        const res = await request(app).get('/api-docs/');
        expect(res.status).toBe(200);
    });
});

// ── Authentication Middleware ─────────────────────────────────────
describe('Authentication Middleware', () => {
    it('returns 401 when no token provided on POST /enroll', async () => {
        const res = await request(app)
            .post('/enroll')
            .send({ student_id: 'S001', course_id: 'C001' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/no token/i);
    });

    it('returns 401 when no token provided on DELETE /enroll/:id', async () => {
        const res = await request(app).delete('/enroll/507f1f77bcf86cd799439011');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/no token/i);
    });

    it('allows GET /enrollments without token (public)', async () => {
        Enrollment.find = jest.fn().mockResolvedValue([]);
        const res = await request(app).get('/enrollments/student/S001');
        // Should not be 401 — even though no enrollments, it should be 404 (not unauthorized)
        expect(res.status).not.toBe(401);
    });

    it('allows request with Bearer token (auth service unreachable — dev fallback)', async () => {
        Enrollment.findOne = jest.fn().mockResolvedValue(null);
        jest.spyOn(Enrollment.prototype, 'save').mockResolvedValue({
            _id: 'new123', student_id: 'S001', course_id: 'C001', status: 'ACTIVE'
        });

        const res = await request(app)
            .post('/enroll')
            .set('Authorization', 'Bearer fake-jwt-token-for-testing')
            .send({ student_id: 'S001', course_id: 'C001' });
        // Should pass auth (dev fallback) and reach the controller
        expect(res.status).toBe(201);
    });
});

// ── POST /enroll ──────────────────────────────────────────────
describe('POST /enroll', () => {
    const authHeader = { Authorization: 'Bearer fake-jwt-token-for-testing' };

    it('returns 400 when student_id is missing', async () => {
        const res = await request(app)
            .post('/enroll')
            .set(authHeader)
            .send({ course_id: 'C001' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/student_id and course_id are required/);
    });

    it('returns 400 when course_id is missing', async () => {
        const res = await request(app)
            .post('/enroll')
            .set(authHeader)
            .send({ student_id: 'S001' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/student_id and course_id are required/);
    });

    it('returns 400 when body is empty', async () => {
        const res = await request(app)
            .post('/enroll')
            .set(authHeader)
            .send({});
        expect(res.status).toBe(400);
    });

    it('returns 409 when duplicate active enrollment exists', async () => {
        Enrollment.findOne = jest.fn().mockResolvedValue({
            _id: 'existing123',
            student_id: 'S001',
            course_id: 'C001',
            status: 'ACTIVE'
        });

        const res = await request(app)
            .post('/enroll')
            .set(authHeader)
            .send({ student_id: 'S001', course_id: 'C001' });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already enrolled/i);
    });

    it('creates enrollment successfully when no duplicate', async () => {
        Enrollment.findOne = jest.fn().mockResolvedValue(null);
        jest.spyOn(Enrollment.prototype, 'save').mockResolvedValue({
            _id: 'new123', student_id: 'S001', course_id: 'C001', status: 'ACTIVE'
        });

        const res = await request(app)
            .post('/enroll')
            .set(authHeader)
            .send({ student_id: 'S001', course_id: 'C001' });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Enrollment created successfully');
    });
});

// ── GET /enrollments/student/:studentId ───────────────────────────────
describe('GET /enrollments/student/:studentId', () => {
    it('returns 404 when no enrollments found', async () => {
        Enrollment.find = jest.fn().mockResolvedValue([]);
        const res = await request(app).get('/enrollments/student/S999');
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/no enrollments found/i);
    });

    it('returns enrollments when found', async () => {
        const mockEnrollments = [
            { _id: '1', student_id: 'S001', course_id: 'C001', status: 'ACTIVE' },
            { _id: '2', student_id: 'S001', course_id: 'C002', status: 'ACTIVE' }
        ];
        Enrollment.find = jest.fn().mockResolvedValue(mockEnrollments);

        const res = await request(app).get('/enrollments/student/S001');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });

    it('returns 500 on database error', async () => {
        Enrollment.find = jest.fn().mockRejectedValue(new Error('DB error'));
        const res = await request(app).get('/enrollments/student/S001');
        expect(res.status).toBe(500);
        expect(res.body.message).toMatch(/error fetching/i);
    });
});

// ── GET /enrollments/course/:courseId ───────────────────────────────
describe('GET /enrollments/course/:courseId', () => {
    it('returns roster when found', async () => {
        Enrollment.find = jest.fn().mockResolvedValue([{ student_id: 'S001' }]);
        const res = await request(app).get('/enrollments/course/C202');
        expect(res.status).toBe(200);
        expect(res.body[0].student_id).toBe('S001');
    });
});

// ── GET /enrollments/check ──────────────────────────────────────────
describe('GET /enrollments/check', () => {
    it('returns isEnrolled: true for valid enrollment', async () => {
        Enrollment.findOne = jest.fn().mockResolvedValue({ status: 'ACTIVE' });
        const res = await request(app).get('/enrollments/check?studentId=S101&courseId=C202');
        expect(res.status).toBe(200);
        expect(res.body.isEnrolled).toBe(true);
    });

    it('returns isEnrolled: false for missing enrollment', async () => {
        Enrollment.findOne = jest.fn().mockResolvedValue(null);
        const res = await request(app).get('/enrollments/check?studentId=S999&courseId=C999');
        expect(res.status).toBe(200);
        expect(res.body.isEnrolled).toBe(false);
    });
});

// ── PATCH /enrollments/:id/status ──────────────────────────────────
describe('PATCH /enrollments/:id/status', () => {
    const authHeader = { Authorization: 'Bearer fake-jwt-token-for-testing' };

    it('updates status successfully', async () => {
        Enrollment.findByIdAndUpdate = jest.fn().mockResolvedValue({ status: 'COMPLETED' });
        const res = await request(app)
            .patch('/enrollments/507f1f77bcf86cd799439011/status')
            .set(authHeader)
            .send({ status: 'COMPLETED' });
        expect(res.status).toBe(200);
        expect(res.body.enrollment.status).toBe('COMPLETED');
    });

    it('returns 400 for invalid status', async () => {
        const res = await request(app)
            .patch('/enrollments/507f1f77bcf86cd799439011/status')
            .set(authHeader)
            .send({ status: 'INVALID' });
        expect(res.status).toBe(400);
    });
});

// ── DELETE /enroll/:id ────────────────────────────────────────
describe('DELETE /enroll/:id', () => {
    const authHeader = { Authorization: 'Bearer fake-jwt-token-for-testing' };

    it('returns 404 when enrollment not found', async () => {
        Enrollment.findById = jest.fn().mockResolvedValue(null);
        const res = await request(app)
            .delete('/enroll/507f1f77bcf86cd799439011')
            .set(authHeader);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 400 when enrollment is already cancelled', async () => {
        Enrollment.findById = jest.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439011',
            status: 'CANCELLED',
            save: jest.fn()
        });
        const res = await request(app)
            .delete('/enroll/507f1f77bcf86cd799439011')
            .set(authHeader);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already cancelled/i);
    });

    it('cancels enrollment successfully', async () => {
        const mockEnrollment = {
            _id: '507f1f77bcf86cd799439011',
            student_id: 'S001',
            course_id: 'C001',
            status: 'ACTIVE',
            save: jest.fn().mockResolvedValue(true)
        };
        Enrollment.findById = jest.fn().mockResolvedValue(mockEnrollment);

        const res = await request(app)
            .delete('/enroll/507f1f77bcf86cd799439011')
            .set(authHeader);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/cancelled successfully/i);
        expect(mockEnrollment.status).toBe('CANCELLED');
    });

    it('returns 500 on database error during cancel', async () => {
        Enrollment.findById = jest.fn().mockRejectedValue(new Error('DB error'));
        const res = await request(app)
            .delete('/enroll/507f1f77bcf86cd799439011')
            .set(authHeader);
        expect(res.status).toBe(500);
        expect(res.body.message).toMatch(/error cancelling/i);
    });
});

// ── Security Headers ──────────────────────────────────────────────
describe('Security Headers (Helmet)', () => {
    it('sets X-Content-Type-Options header', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets X-Frame-Options header', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('sets Content-Security-Policy header', async () => {
        const res = await request(app).get('/');
        expect(res.headers['content-security-policy']).toBeDefined();
    });
});

// ── CORS ──────────────────────────────────────────────────────────
describe('CORS Headers', () => {
    it('allows cross-origin requests', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'http://example.com');
        expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
});
