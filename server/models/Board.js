const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  { x: { type: Number, required: true }, y: { type: Number, required: true } },
  { _id: false }
);

const strokeSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    tool:      { type: String, enum: ["pencil", "brush", "eraser"], default: "pencil" },
    color:     { type: String, required: true },
    baseColor: { type: String },
    size:      { type: Number, required: true },
    points:    { type: [pointSchema], required: true },
    createdAt: { type: Number }
  },
  { _id: false }
);

const shapeSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    type:      { type: String, default: "shape" },
    shapeType: { type: String, required: true },
    fillMode:  { type: String, default: "hollow" },
    opacity:   { type: Number, default: 1 },
    color:     { type: String, required: true },
    size:      { type: Number, required: true },
    start:     { type: { x: Number, y: Number }, required: true },
    end:       { type: { x: Number, y: Number }, required: true },
    createdAt: { type: Number }
  },
  { _id: false }
);

const textBoxSchema = new mongoose.Schema(
  {
    id:         { type: String, required: true },
    x:          { type: Number, required: true },
    y:          { type: Number, required: true },
    value:      { type: String, default: "" },
    color:      { type: String, required: true },
    fontSize:   { type: Number, required: true },
    fontFamily: { type: String, default: "Arial" },
    createdAt:  { type: Number }
  },
  { _id: false }
);

const equationSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    x:         { type: Number, required: true },
    y:         { type: Number, required: true },
    latex:     { type: String, required: true },
    color:     { type: String, required: true },
    fontSize:  { type: Number, required: true },
    createdAt: { type: Number }
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    src:       { type: String, required: true },
    x:         { type: Number, required: true },
    y:         { type: Number, required: true },
    width:     { type: Number, required: true },
    height:    { type: Number, required: true },
    createdAt: { type: Number }
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    roomName: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      maxlength: 50
    },
    strokes:   { type: [strokeSchema],   default: [] },
    shapes:    { type: [shapeSchema],    default: [] },
    textBoxes: { type: [textBoxSchema],  default: [] },
    equations: { type: [equationSchema], default: [] },
    images:    { type: [imageSchema],    default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    background: { type: String, default: "#ffffff" },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
