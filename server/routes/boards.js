const express = require("express");
const Board = require("../models/Board");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/boards
 * Only return boards the user owns or is a member of
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const boards = await Board.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    }).populate("createdBy", "username");

    res.json({ boards });
  } catch (err) {
    console.error("List boards error:", err);
    res.status(500).json({ error: "Could not fetch boards" });
  }
});

/**
 * POST /api/boards
 * Create a board (creator automatically becomes member)
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName || !roomName.trim()) {
      return res.status(400).json({ error: "roomName is required" });
    }

    const board = await Board.create({
      roomName: roomName.trim(),
      createdBy: req.user._id,
      members: [req.user._id] // important fix
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

/**
 * GET /api/boards/:roomName
 * Only allow access if user is owner or member
 */
router.get("/:roomName", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    const userId = req.user._id.toString();

    const isOwner = board.createdBy?.toString() === userId;
    const isMember = board.members?.some(
      (id) => id.toString() === userId
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ board });
  } catch (err) {
    console.error("Get board error:", err);
    res.status(500).json({ error: "Could not fetch board" });
  }
});

/**
 * DELETE /api/boards/:roomName/strokes
 * Only creator can clear board
 */
router.delete("/:roomName/strokes", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only creator can clear board" });
    }

    board.strokes = [];
    await board.save();

    res.json({ message: "Board cleared" });
  } catch (err) {
    console.error("Clear board error:", err);
    res.status(500).json({ error: "Could not clear board" });
  }
});

// DELETE /api/boards/:roomName
// Delete a board entirely. Only the creator can do this.
router.delete("/:roomName", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the room owner can delete this board" });
    }

    await Board.deleteOne({ roomName: req.params.roomName });

    res.json({ message: "Board deleted" });
  } catch (err) {
    console.error("Delete board error:", err);
    res.status(500).json({ error: "Could not delete board" });
  }
});

module.exports = router;