const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Game = require('../../models/Game');

describe('Game Integration Tests', () => {
  let organizerToken;
  let organizerId;

  beforeEach(async () => {
    await User.deleteMany({});
    await Game.deleteMany({});

    const organizerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Game Organizer',
        email: 'organizer@test.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
    
    organizerToken = organizerRes.body.accessToken;
    organizerId = organizerRes.body.user.id;
  });

  describe('POST /api/games', () => {
    test('should create game successfully', async () => {
      const gameData = {
        sport: 'football',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '18:30',
        location: {
          address: 'Central Park, New York',
          coordinates: [-74.006, 40.7128]
        },
        maxPlayers: 10,
        description: 'Casual game'
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(gameData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.game).toBeDefined();
      expect(response.body.game.sport).toBe('football');
    });

    test('should not create game without auth', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/games', () => {
    beforeEach(async () => {
      const gameData = {
        sport: 'football',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '18:30',
        location: {
          address: 'Central Park, New York',
          coordinates: [-74.006, 40.7128]
        },
        maxPlayers: 10,
        organizer: organizerId,
        participants: [organizerId],
        currentPlayers: 1
      };

      const game = new Game(gameData);
      await game.save();
    });

    test('should list all games', async () => {
      const response = await request(app)
        .get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.games.length).toBeGreaterThan(0);
    });
  });
});