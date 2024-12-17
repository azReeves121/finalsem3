const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  options: [{ type: String }],
  votes: [{ type: Number }],
});

module.exports = mongoose.model("Poll", pollSchema);
