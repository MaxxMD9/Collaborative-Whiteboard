const express      = require("express");
const crypto       = require("crypto");
const Invite       = require("../models/Invite");
const Board        = require("../models/Board");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ── POST /api/invites/create ──────────────────────────────────────────────────
// Room owner generates an invite code for their board.
// Body: { roomName }
// Requires auth
router.post("/create", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // Make sure the board exists
    const board = await Board.findOne({ roomName });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    // Only the board creator can generate invites
    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the room owner can create invites" });
    }

    // Generate a short random code e.g. "a3f9bc"
    const code = crypto.randomBytes(3).toString("hex");

    const invite = await Invite.create({
      code,
      roomName,
      createdBy: req.user._id
    });

    res.status(201).json({ invite });
  } catch (err) {
    console.error("Create invite error:", err);
    res.status(500).json({ error: "Could not create invite" });
  }
});

// ── POST /api/invites/join ────────────────────────────────────────────────────
// User submits an invite code to join a room.
// Body: { code }
// Requires auth
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const invite = await Invite.findOne({ code, active: true });

    if (!invite) {
      return res.status(404).json({ error: "Invalid or expired invite code" });
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      invite.active = false;
      await invite.save();
      return res.status(410).json({ error: "This invite has expired" });
    }

    // Record who used the invite
    if (!invite.usedBy.includes(req.user._id)) {
      invite.usedBy.push(req.user._id);
      await invite.save();
    }

    // Make sure the board exists, create it if not
    let board = await Board.findOne({ roomName: invite.roomName });
    if (!board) {
      board = await Board.create({
        roomName: invite.roomName,
        createdBy: invite.createdBy
      });
    }

    res.json({ roomName: invite.roomName, board });
  } catch (err) {
    console.error("Join invite error:", err);
    res.status(500).json({ error: "Could not join room" });
  }
});

// ── GET /api/invites/room/:roomName ───────────────────────────────────────────
// Get all active invites for a room (owner only).
// Requires auth
router.get("/room/:roomName", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomName: req.params.roomName });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the room owner can view invites" });
    }

    const invites = await Invite.find({
      roomName: req.params.roomName,
      active:   true
    }).populate("usedBy", "username");

    res.json({ invites });
  } catch (err) {
    console.error("Get invites error:", err);
    res.status(500).json({ error: "Could not fetch invites" });
  }
});

// ── DELETE /api/invites/:code ─────────────────────────────────────────────────
// Deactivate an invite code (owner only).
// Requires auth
router.delete("/:code", requireAuth, async (req, res) => {
  try {
    const invite = await Invite.findOne({ code: req.params.code });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const board = await Board.findOne({ roomName: invite.roomName });

    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the room owner can deactivate invites" });
    }

    invite.active = false;
    await invite.save();

    res.json({ message: "Invite deactivated" });
  } catch (err) {
    console.error("Deactivate invite error:", err);
    res.status(500).json({ error: "Could not deactivate invite" });
  }
});

module.exports = router;