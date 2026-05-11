const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    // The random code the user shares
    code: {
      type:     String,
      required: true,
      unique:   true
    },

    // Which room this invite is for
    roomName: {
      type:     String,
      required: true
    },

    // Who created the invite
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      required: true
    },

    // Who has used this invite
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User"
      }
    ],

    // Optional: expire the invite after a set time
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },

    // Whether the invite is still active
    active: {
      type:    Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Invite", inviteSchema);