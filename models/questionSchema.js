const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [(arr) => arr.length === 4, "There must be exactly 4 options"],
  },
  correct: { type: String, required: true },
  neededTime: { type: String, required: true },
  score: { type: String, required: true },
});

const quizSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // ✅ Added
    author: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    questions: { type: [questionSchema], required: true },
    date: { type: Date },
    dateLine: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("quizzes", quizSchema);
