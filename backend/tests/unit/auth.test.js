const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('User Registration Unit Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  test('should hash password before saving user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    expect(user.password).not.toBe('password123');
    expect(user.password).toHaveLength(60);
  });

  test('should not return password in user object', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();
    
    const userObject = user.getPublicProfile();
    expect(userObject.password).toBeUndefined();
  });

  test('should validate email format', async () => {
    const userData = {
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123'
    };

    const user = new User(userData);
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  test('should require minimum password length', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: '12345'
    };

    const user = new User(userData);
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  test('should compare passwords correctly', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    const isMatch = await user.comparePassword('password123');
    const isNotMatch = await user.comparePassword('wrongpassword');

    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });
});