require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Claim = require('../src/models/Claim');

describe('SST Lost & Found REST API Test Suite', () => {
  let userToken;
  let userId;
  let testItemId;

  beforeAll(async () => {
    // Connect to test database or local instance
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sst_lost_found';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    // Clean up test items and user created in this test
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
    if (testItemId) {
      await Item.findByIdAndDelete(testItemId);
      await Claim.deleteMany({ item: testItemId });
    }
    await mongoose.connection.close();
  });

  // 1. Health & Discovery Endpoints
  describe('GET /api/health', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('healthy');
    });
  });

  describe('GET /api/items/stats', () => {
    it('should return aggregated platform statistics', async () => {
      const res = await request(app).get('/api/items/stats');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toHaveProperty('totalReports');
      expect(res.body.stats).toHaveProperty('recoveryRate');
    });
  });

  // 2. Authentication Flow
  describe('Authentication Endpoints', () => {
    const testRoll = '24bcs10001';
    const testEmail = `testuser.${testRoll}@sst.scaler.com`;

    it('should reject registration with non-sst.scaler.com email domain', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Domain User',
          email: 'invalid@gmail.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('sst.scaler.com');
    });

    it('should reject registration with invalid email format (missing studentId part)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Format User',
          email: 'invalid_email@sst.scaler.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('<username>.<studentId>@');
    });

    it('should register a new user successfully and auto-derive studentId from email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Integration Test User',
          email: testEmail,
          password: 'password123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.studentId).toBe(testRoll);

      userToken = res.body.token;
      userId = res.body.user._id;
    });

    it('should prevent duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail,
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should log in existing user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    it('should fetch authenticated user profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Integration Test User');
    });
  });

  // 3. Item Management & Filtering
  describe('Item Endpoints', () => {
    it('should create a new item report as authenticated user', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Automated Test Blue Umbrella',
          description: 'Left near water cooler in North Block during rain',
          reportType: 'lost',
          category: 'Bottles & Bags',
          location: {
            building: 'North Block',
            room: '1st Floor Water Cooler',
            campusZone: 'North Campus',
          },
          privateIdentifyingInfo: 'Handle has a blue ribbon tied to it',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.title).toBe('Automated Test Blue Umbrella');
      testItemId = res.body.item._id;
    });

    it('should conceal private identifying info from public item list', async () => {
      const res = await request(app).get('/api/items?search=Umbrella');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      const foundItem = res.body.items.find((i) => i._id.toString() === testItemId.toString());
      if (foundItem) {
        expect(foundItem.privateIdentifyingInfo).toBeUndefined();
      }
    });

    it('should allow item owner to update their report', async () => {
      const res = await request(app)
        .put(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Automated Test Blue Umbrella (Updated)',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.title).toBe('Automated Test Blue Umbrella (Updated)');
    });

    it('should reject unauthorized delete attempts from unauthenticated client', async () => {
      const res = await request(app).delete(`/api/items/${testItemId}`);
      expect(res.statusCode).toEqual(401);
    });

    it('should successfully flag an item report', async () => {
      const res = await request(app)
        .post(`/api/items/${testItemId}/flag`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Testing moderation flag recording',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-admin attempt to directly resolve an item report', async () => {
      const res = await request(app)
        .patch(`/api/items/${testItemId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'resolved' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('claim');
    });

    it('should reject status: resolved in ordinary updateItem endpoint for non-admin', async () => {
      const res = await request(app)
        .put(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'resolved' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should safely handle search inputs containing regex metacharacters', async () => {
      const res = await request(app).get('/api/items?search=Umbrella.*+?^${}()|[]');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  // 4. Security & CORS Verification
  describe('Security, Roles & CORS', () => {
    it('should enforce role: user on registration and ignore client-supplied role: admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker.25bcs99999@sst.scaler.com',
          password: 'password123',
          role: 'admin',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.user.role).toBe('user');
      await User.findByIdAndDelete(res.body.user._id);
    });

    it('should allow CORS requests from permitted development origins (e.g. 5175)', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5175')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(res.statusCode);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5175');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block CORS requests from unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com');

      expect(res.statusCode).toEqual(403);
    });
  });
});
