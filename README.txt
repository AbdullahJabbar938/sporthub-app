SportHub

PROJECT TITLE
SportHub - Agile Programming Assignment 2 Project

SHORT DESCRIPTION
SportHub is a full-stack web application which was developed to help users discover, create, join, and manage local sports games and activities. The system was built as part of the SWE6011 Agile Programming module. It includes the main features such as user registration, login, profile management, game creation, browsing available games, and joining or leaving games. The project was mainly focused on delivering the core functions in a simple and practical way.

TECHNOLOGIES USED
Frontend
- React.js
- React Router
- CSS

Backend
- Node.js
- Express.js

Database
- MongoDB Atlas
- Mongoose

Testing / Development Tools
- Jest
- Postman
- Git and GitHub
- Jira

SYSTEM REQUIREMENTS
Hardware
- Processor: Intel Core i5 or equivalent
- RAM: Minimum 8 GB, but 16 GB is more better for smoother working
- Storage: Enough free space for dependencies and project files
- Internet connection for MongoDB Atlas and package installation

Software
- Windows 10/11, macOS, or Linux
- Node.js
- npm
- MongoDB Atlas account or MongoDB connection string
- Code editor such as Visual Studio Code
- Web browser such as Chrome or Edge

PROJECT STRUCTURE
SportHub/
|-- backend/
|-- frontend/
|-- docs/
|-- package.json
|-- README.md

INSTALLATION STEPS
1. Download or extract the SportHub project folder.
2. Open the project in Visual Studio Code or another code editor.
3. Open a terminal in the root folder of project.
4. Install root dependencies if needed:
   npm install
5. Go to the backend folder and install backend dependencies:
   cd backend
   npm install
6. Go to the frontend folder and install frontend dependencies:
   cd ../frontend
   npm install

ENVIRONMENT VARIABLES
Create .env files only if needed. Do not put the real secrets in coursework submission.

Example backend .env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
NODE_ENV=development

Example frontend .env
VITE_API_URL=http://localhost:5000/api

If your frontend is Create React App based instead of Vite, you can use:
REACT_APP_API_URL=http://localhost:5000/api

DEFAULT PORTS
- Frontend: 3000 or 5173 depending on the setup
- Backend: 5000
- MongoDB Atlas: cloud database connection

HOW TO RUN THE BACKEND
1. Open terminal in the backend folder:
   cd backend
2. Start the backend server:
   npm start
   or in development mode:
   npm run dev

The backend should normally run on:
http://localhost:5000

HOW TO RUN THE FRONTEND
1. Open terminal in the frontend folder:
   cd frontend
2. Start the frontend:
   npm start
   or if using Vite:
   npm run dev

The frontend should normally run on:
http://localhost:3000
or
http://localhost:5173

TEST / RUN COMMANDS
Root
npm install

Backend
cd backend
npm install
npm start
npm run test

Frontend
cd frontend
npm install
npm start
npm test

If Vite is used on frontend:
npm run dev

MAIN FEATURES
- User registration
- User login and logout
- User profile management
- Create sports games
- Browse games
- View game details
- Join games
- Leave games
- Dashboard features
- Basic testing support

NOTES FOR SUBMISSION
- Keep this README file in the root of the project folder
- Do not submit real .env files with secrets
- It is better to submit .env.example instead of the actual environment file
- Remove node_modules before zipping the project unless your lecturer specifically asks it
- Make sure the project opens and runs correctly before final uploading

AUTHOR
Prepared for SWE6011 Agile Programming Assignment 2. This README was written to explain the project structure, setup process, and basic run instructions in a simple way.
