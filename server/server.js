require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");

const authRoutes  = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const { registerSocketHandlers } = require("./sockets/whiteboard");

//  App setup 
const app    = express();
const server = http.createServer(app); // Wrap Express so Socket.IO can share the same port

//  Socket.IO 
const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

//  Middleware 
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json()); // Parse JSON request bodies

//  Routes 
app.use("/api/auth",   authRoutes);
app.use("/api/boards", boardRoutes);

// Health-check endpoint - useful for deployment platforms
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

//  Socket.IO handlers 
registerSocketHandlers(io);

//  Database + server start 
const PORT      = process.env.PORT     || 3001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is not set in your .env file.");
  console.error("Copy .env.example to .env and fill in your MongoDB Atlas connection string.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });