const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuizData",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserData",
    required: true,
  },
  date: { type: Date, default: Date.now },
  totalScore: { type: Number, required: true },
  answers: [
    {
      questionNo: Number,
      question: String,
      answer: String,
      isCorrect: Boolean,
      option: String,
      score: Number,
    },
  ],
});

module.exports = mongoose.model("quizanswer", answerSchema);
