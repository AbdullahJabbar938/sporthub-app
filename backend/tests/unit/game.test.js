const mongoose = require('mongoose');
const User = require('../../models/User');
const Game = require('../../models/Game');

describe('Game Model Unit Tests', () => {
  let testUser;

  beforeEach(async () => {
    await User.deleteMany({});
    await Game.deleteMany({});

    testUser = new User({
      name: 'Organizer',
      email: 'organizer@test.com',
      password: 'password123'
    });
    await testUser.save();
  });

  test('should create game with correct default values', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const gameData = {
      sport: 'football',
      date: futureDate,
      time: '18:30',
      location: {
        coordinates: [-74.006, 40.7128],
        address: 'Central Park, New York'
      },
      maxPlayers: 10,
      organizer: testUser._id,
      participants: [testUser._id], // Explicitly add organizer
      currentPlayers: 1
    };

    const game = new Game(gameData);
    
    expect(game.sport).toBe('football');
    expect(game.currentPlayers).toBe(1);
    expect(game.status).toBe('open');
    expect(game.participants).toContainEqual(testUser._id);
  });

  test('isFull() should return correct status', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const gameData = {
      sport: 'football',
      date: futureDate,
      time: '18:30',
      location: {
        coordinates: [-74.006, 40.7128],
        address: 'Central Park, New York'
      },
      maxPlayers: 2,
      organizer: testUser._id,
      participants: [testUser._id],
      currentPlayers: 1
    };

    const game = new Game(gameData);
    expect(game.isFull()).toBe(false);

    const anotherUser = new User({
      name: 'Player',
      email: 'player@test.com',
      password: 'password123'
    });
    await anotherUser.save();
    
    game.participants.push(anotherUser._id);
    game.currentPlayers = 2;
    game.status = 'full';
    
    expect(game.isFull()).toBe(true);
    expect(game.status).toBe('full');
  });

  test('addParticipant() should add user correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const gameData = {
      sport: 'football',
      date: futureDate,
      time: '18:30',
      location: {
        coordinates: [-74.006, 40.7128],
        address: 'Central Park, New York'
      },
      maxPlayers: 5,
      organizer: testUser._id,
      participants: [testUser._id],
      currentPlayers: 1
    };

    const game = new Game(gameData);
    
    const newUser = new User({
      name: 'New Player',
      email: 'newplayer@test.com',
      password: 'password123'
    });
    await newUser.save();

    await game.addParticipant(newUser._id);
    
    expect(game.participants).toHaveLength(2);
    expect(game.currentPlayers).toBe(2);
    expect(game.participants).toContainEqual(newUser._id);
  });
});
