const mongoose = require('mongoose');
const User = require('../models/User');

describe('Database Connection Test', () => {
  test('should connect to test database', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  test('should create and save a user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    expect(user._id).toBeDefined();
    expect(user.name).toBe('Test User');
  });
});
