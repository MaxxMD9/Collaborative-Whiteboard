const mongoose = require("mongoose");

// A single point in a stroke path
const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  { _id: false } // Don't create a separate _id for each point
);

// One stroke = one mouse-down -> mouse-up drawing action
const strokeSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true }, // client-generated UUID
    tool:      { type: String, enum: ["pencil", "brush", "eraser"], default: "pencil" },
    color:     { type: String, required: true },
    baseColor: { type: String },
    size:      { type: Number, required: true },
    points:    { type: [pointSchema], required: true },
    createdAt: { type: Number } // Unix timestamp from the client
  },
  { _id: false }
);

// A Board is a room that multiple users can draw on together
const boardSchema = new mongoose.Schema(
  {
    // Human-readable room name (e.g. "Main Room", "CSE 108 Group")
    roomName: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      maxlength: 50
    },

    // All strokes currently on the board
    strokes: {
      type:    [strokeSchema],
      default: []
    },

    // Which user created the room
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User"
    },

    // Canvas background color stored per board
    background: {
      type:    String,
      default: "#ffffff"
    },

    // Users who have joined this board via invite
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Board", boardSchema);