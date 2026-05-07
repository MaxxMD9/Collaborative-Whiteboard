const jwt   = require("jsonwebtoken");
const User  = require("../models/User");
const Board = require("../models/Board");

// Socket.IO authentication middleware 
// Runs once when a client first connects. Rejects the connection if no valid
// JWT is provided in the handshake auth object.
//
// On the client side, the socket should be created like:
//   const socket = io("http://localhost:3001", {
//     auth: { token: localStorage.getItem("token") }
//   });

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    // Attach user to socket so handlers can refference it
    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}

// Register all Socket.IO events 
function registerSocketHandlers(io) {

  // Apply auth middleware to every incoming connection
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`[Socket] ${socket.user.username} connected (${socket.id})`);

    // JOIN ROOM 
    // Client emits: socket.emit("room:join", "Main Room")
    // Server sends back the full board state so the client can render existing strokes.
    socket.on("room:join", async (roomName) => {
      try {
        // Leave whatever room was joined before (one room at a time per socket)
        if (socket.currentRoom) {
          socket.leave(socket.currentRoom);
          console.log(`[Socket] ${socket.user.username} left room "${socket.currentRoom}"`);
        }

        // Find or create the board for this room
        let board = await Board.findOne({ roomName });
        if (!board) {
          board = await Board.create({ roomName, createdBy: socket.user._id });
        }

        socket.join(roomName);
        socket.currentRoom = roomName;

        console.log(`[Socket] ${socket.user.username} joined room "${roomName}"`);

        // Send the full board state only to the socket that just joined
        socket.emit("board:state", {
          strokes:    board.strokes,
          background: board.background
        });

        // Notify everyone else in the room
        socket.to(roomName).emit("room:user_joined", {
          username: socket.user.username
        });
      } catch (err) {
        console.error("[Socket] room:join error:", err);
        socket.emit("error", { message: "Could not join room" });
      }
    });

    // STROKE CREATED 
    // Client emits when a drawing stroke is completed (mouse up).
    // Broadcasts the stroke to all OTHER clients in the room and persists it.
    //
    // Client side (from App.jsx stopDrawing):
    //   socket.emit("stroke:create", finishedStroke)
    socket.on("stroke:create", async (stroke) => {
      const room = socket.currentRoom;
      if (!room) return;

      try {
        // Broadcsat to everyone else in the room immediately so it seems like it is live
        socket.to(room).emit("stroke:create", stroke);

        // Persist to MongoDB
        await Board.findOneAndUpdate(
          { roomName: room },
          { $push: { strokes: stroke } }
        );
      } catch (err) {
        console.error("[Socket] stroke:create error:", err);
      }
    });

    // UNDO 
    // Client emits when Ctrl+Z is pressed.
    // Removes the last stroke from the DB and broadcasts to the room.
    //
    // Client side (from App.jsx undoStroke):
    //   socket.emit("stroke:undo")
    socket.on("stroke:undo", async () => {
      const room = socket.currentRoom;
      if (!room) return;

      try {
        const board = await Board.findOneAndUpdate(
          { roomName: room },
          { $pop: { strokes: 1 } }, // 1 = remove last element
          { new: true }
        );

        if (!board) return;

        // Tell all clients (including sender) to re-sync with the new state
        io.to(room).emit("board:state", {
          strokes:    board.strokes,
          background: board.background
        });
      } catch (err) {
        console.error("[Socket] stroke:undo error:", err);
      }
    });

    // REDO 
    // True collaborative redo is complex - for now, the client
    // manages its own redo stack locally and just pushes the stroke back.
    //
    // Client side (from App.jsx redoStroke):
    //   socket.emit("stroke:create", restoredStroke)
    // (Reuse stroke:create - no separate redo event needed on the server)

    // CLEAR BOARD 
    // Client emits when the CLEAR button is pressed.
    //
    // Client side (from App.jsx clearBoard):
    //   socket.emit("board:clear")
    socket.on("board:clear", async () => {
      const room = socket.currentRoom;
      if (!room) return;

      try {
        await Board.findOneAndUpdate(
          { roomName: room },
          { $set: { strokes: [] } }
        );

        // Notify everyone in the room (including sender)
        io.to(room).emit("board:cleared");
      } catch (err) {
        console.error("[Socket] board:clear error:", err);
      }
    });

    // CURSOR POSITION 
    // Broadcasts other users' cursor positions as they draw.
    // This is optional but nice to have - the client can emit this during
    // onPointerMove if you want live cursor presence indicators.

    // Client side:
    //   socket.emit("cursor:move", { x, y })
    socket.on("cursor:move", (point) => {
      const room = socket.currentRoom;
      if (!room) return;

      socket.to(room).emit("cursor:move", {
        username: socket.user.username,
        x: point.x,
        y: point.y
      });
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log(`[Socket] ${socket.user.username} disconnected`);

      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("room:user_left", {
          username: socket.user.username
        });
      }
    });
  });
}

module.exports = { registerSocketHandlers };