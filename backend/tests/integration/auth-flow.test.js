const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/register', () => {
    test('should register user successfully and return token', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Integration Test User',
          email: 'integration@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('Integration Test User');
      expect(response.body.user.email).toBe('integration@test.com');
      expect(response.body.user.password).toBeUndefined();

      // Verify user was saved to database
      const savedUser = await User.findOne({ email: 'integration@test.com' });
      expect(savedUser).toBeDefined();
      expect(savedUser.name).toBe('Integration Test User');
    });

    test('should not register duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/register')
        .send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'password123'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Second User',
          email: 'duplicate@test.com',
          password: 'password456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/email.*registered/i);

      // Verify only one user exists
      const users = await User.find({ email: 'duplicate@test.com' });
      expect(users).toHaveLength(1);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'missing-name@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Create a user before login tests
      await request(app)
        .post('/api/register')
        .send({
          name: 'Login Test',
          email: 'login@test.com',
          password: 'password123'
        });
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('login@test.com');
    });

    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid.*password/i);
    });

    test('should reject non-existent email', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid.*email/i);
    });
  });

  describe('GET /api/me', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Register and login to get token
      const registerRes = await request(app)
        .post('/api/register')
        .send({
          name: 'Me Test',
          email: 'me@test.com',
          password: 'password123'
        });
      
      authToken = registerRes.body.token;
      userId = registerRes.body.user._id;
    });

    test('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user._id).toBe(userId);
      expect(response.body.user.email).toBe('me@test.com');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});