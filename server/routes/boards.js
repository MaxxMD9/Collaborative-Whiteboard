const express      = require("express");
const Board        = require("../models/Board");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/boards 
// List all available rooms (name + id only, no full stroke data)
// Public - no auth required so the lobby page can show rooms before login
router.get("/", async (req, res) => {
  try {
    const boards = await Board.find({}, "roomName createdBy createdAt").populate(
      "createdBy",
      "username"
    );
    res.json({ boards });
  } catch (err) {
    console.error("List boards error:", err);
    res.status(500).json({ error: "Could not fetch boards" });
  }
});

// POST /api/boards
// Create a new room.
// Body: { roomName }
// Requires auth
router.post("/", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName || !roomName.trim()) {
      return res.status(400).json({ error: "roomName is required" });
    }

    const board = await Board.create({
      roomName: roomName.trim(),
      createdBy: req.user._id
    });

    res.status(201).json({ board });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "A room with that name already exists" });
    }
    console.error("Create board error:", err);
    res.status(500).json({ error: "Could not create board" });
  }
});

// GET /api/boards/:roomName
// Load a board's full state (all strokes) so a joining user can catch up.
// Requires auth
router.get("/:roomName", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json({ board });
  } catch (err) {
    console.error("Get board error:", err);
    res.status(500).json({ error: "Could not fetch board" });
  }
});

// DELETE /api/boards/:roomName
// Clear all strokes from a board (does NOT delete the room itself).
// Only the room creator can do this.
router.delete("/:roomName/strokes", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    // Only the creator can clear
    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the room creator can clear the board" });
    }

    board.strokes = [];
    await board.save();

    res.json({ message: "Board cleared" });
  } catch (err) {
    console.error("Clear board error:", err);
    res.status(500).json({ error: "Could not clear board" });
  }
});

module.exports = router;