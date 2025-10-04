const mongoose = require("mongoose");

const roadmapSchema = new mongoose.Schema({
  day: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

module.exports = mongoose.model("Roadmap", roadmapSchema);
