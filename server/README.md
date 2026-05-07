# Whiteboard Server

Backend for the Collaborative Whiteboard app. Built with Node.js, Express, Socket.IO, MongoDB, and JWT authentication.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file in this folder (see `.env.example` for the required variables)

3. Start the development server:
```bash
npm run dev
```

You should see:
```
Connected to MongoDB
Server running on http://localhost:3001
```

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Create a new account | No |
| POST | `/api/auth/login` | Log in | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Boards
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/boards` | List all rooms | No |
| POST | `/api/boards` | Create a new room | Yes |
| GET | `/api/boards/:roomName` | Get a board's full state | Yes |
| DELETE | `/api/boards/:roomName/strokes` | Clear a board | Yes |

Protected routes require an `Authorization: Bearer <token>` header.

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `room:join` | Client -> Server | Join a room |
| `board:state` | Server -> Client | Full board state on join |
| `stroke:create` | Client -> Server | New stroke completed |
| `stroke:undo` | Client -> Server | Undo last stroke |
| `board:clear` | Client -> Server | Clear the board |
| `cursor:move` | Client -> Server | Broadcast cursor position |
| `room:user_joined` | Server -> Client | User joined notification |
| `room:user_left` | Server -> Client | User left notification |