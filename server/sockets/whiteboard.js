const jwt   = require("jsonwebtoken");
const User  = require("../models/User");
const Board = require("../models/Board");

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.userId);
    if (!user) return next(new Error("User not found"));
    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}

function registerSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`[Socket] ${socket.user.username} connected (${socket.id})`);

    socket.on("room:join", async (roomName) => {
      try {
        if (socket.currentRoom) {
          socket.leave(socket.currentRoom);
          console.log(`[Socket] ${socket.user.username} left room "${socket.currentRoom}"`);
        }
        let board = await Board.findOne({ roomName });
        if (!board) board = await Board.create({ roomName, createdBy: socket.user._id });
        socket.join(roomName);
        socket.currentRoom = roomName;
        console.log(`[Socket] ${socket.user.username} joined room "${roomName}"`);
        socket.emit("board:state", {
          strokes:    board.strokes,
          shapes:     board.shapes,
          textBoxes:  board.textBoxes,
          equations:  board.equations,
          images:     board.images,
          fills:      board.fills || [],
          background: board.background
        });
        socket.to(roomName).emit("room:user_joined", { username: socket.user.username });
      } catch (err) {
        console.error("[Socket] room:join error:", err);
        socket.emit("error", { message: "Could not join room" });
      }
    });

    socket.on("stroke:create", async (stroke) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("stroke:create", stroke);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { strokes: stroke } });
      } catch (err) { console.error("[Socket] stroke:create error:", err); }
    });

    socket.on("shape:create", async (shape) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("shape:create", shape);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { shapes: shape } });
      } catch (err) { console.error("[Socket] shape:create error:", err); }
    });

    socket.on("textbox:create", async (textBox) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("textbox:create", textBox);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { textBoxes: textBox } });
      } catch (err) { console.error("[Socket] textbox:create error:", err); }
    });

    socket.on("textbox:update", async (textBox) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("textbox:update", textBox);
        await Board.findOneAndUpdate(
          { roomName: room, "textBoxes.id": textBox.id },
          { $set: { "textBoxes.$": textBox } }
        );
      } catch (err) { console.error("[Socket] textbox:update error:", err); }
    });

    socket.on("equation:create", async (equation) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("equation:create", equation);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { equations: equation } });
      } catch (err) { console.error("[Socket] equation:create error:", err); }
    });

    socket.on("equation:update", async (equation) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("equation:update", equation);
        await Board.findOneAndUpdate(
          { roomName: room, "equations.id": equation.id },
          { $set: { "equations.$": equation } }
        );
      } catch (err) { console.error("[Socket] equation:update error:", err); }
    });

    socket.on("fill:create", async (fill) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("fill:create", fill);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { fills: fill } });
      } catch (err) { console.error("[Socket] fill:create error:", err); }
    });

    socket.on("fill:create", async (fill) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("fill:create", fill);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { fills: fill } });
      } catch (err) { console.error("[Socket] fill:create error:", err); }
    });

    socket.on("image:create", async (image) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("image:create", image);
        await Board.findOneAndUpdate({ roomName: room }, { $push: { images: image } });
      } catch (err) { console.error("[Socket] image:create error:", err); }
    });

    socket.on("image:update", async (image) => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        socket.to(room).emit("image:update", image);
        await Board.findOneAndUpdate(
          { roomName: room, "images.id": image.id },
          { $set: { "images.$": image } }
        );
      } catch (err) { console.error("[Socket] image:update error:", err); }
    });

    socket.on("stroke:undo", async () => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        const board = await Board.findOneAndUpdate(
          { roomName: room },
          { $pop: { strokes: 1 } },
          { new: true }
        );
        if (!board) return;
        io.to(room).emit("board:state", {
          strokes:    board.strokes,
          shapes:     board.shapes,
          textBoxes:  board.textBoxes,
          equations:  board.equations,
          images:     board.images,
          fills:      board.fills || [],
          background: board.background
        });
      } catch (err) { console.error("[Socket] stroke:undo error:", err); }
    });

    socket.on("board:clear", async () => {
      const room = socket.currentRoom;
      if (!room) return;
      try {
        await Board.findOneAndUpdate(
          { roomName: room },
          { $set: { strokes: [], shapes: [], textBoxes: [], equations: [], images: [], fills: [] } }
        );
        io.to(room).emit("board:cleared");
      } catch (err) { console.error("[Socket] board:clear error:", err); }
    });

    socket.on("cursor:move", (point) => {
      const room = socket.currentRoom;
      if (!room) return;
      socket.to(room).emit("cursor:move", { username: socket.user.username, x: point.x, y: point.y });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] ${socket.user.username} disconnected`);
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("room:user_left", { username: socket.user.username });
      }
    });
  });
}

module.exports = { registerSocketHandlers };