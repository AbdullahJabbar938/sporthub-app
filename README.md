# SportHub
[![CI/CD](https://github.com/yourusername/sporthub-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/sporthub-app/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/yourusername/sporthub-app/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/sporthub-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Connect with local sports players. Discover, join, and organize casual games for football, basketball, tennis, and more.

## 🎯 Vision

To connect sports enthusiasts in their local area, making it easy to discover, join, and organize casual games. SportHub bridges the gap between players who want to play and games that need players.

## ✨ Features

### Core Features (MVP)
- **🔐 User Authentication** - Register, login, and manage your profile
- **🏆 Create Games** - Set sport, time, location, and player limits
- **🔍 Browse Games** - Discover upcoming games in your area
- **🤝 Join/Leave Games** - Participate in games that interest you
- **📊 My Games Dashboard** - Track games you're hosting or joining
- **📍 Location-Based** - Find games near you
- **🏷️ Sport Filters** - Filter by your favorite sports

### Technical Highlights
- **RESTful API** with JWT authentication
- **MongoDB Atlas** for scalable database
- **Google Maps API** for location services
- **CI/CD Pipeline** with automated testing
- **85%+ Test Coverage** across all features

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Google Maps API key

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/sporthub-app.git
cd sporthub-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials