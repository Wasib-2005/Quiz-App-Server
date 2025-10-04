const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema({
  quizCode: { type: String, required: true },
  email: { type: String, required: true },
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserData", required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = {
  Violation: mongoose.model("Violation", violationSchema)
};
