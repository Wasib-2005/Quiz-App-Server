const express = require("express");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");
const QuizData = require("../models/questionSchema");
const QuizAnswer = require("../models/quizAnswerSchema");
const validateQuizAccess = require("../utils/validateQuizAccess");

const router = express.Router();

// Count quizzes taken by user
router.get("/taken", UserVerification, asyncHandler(async (req, res) => {
  const count = await QuizAnswer.countDocuments({ userId: req.user.id });
  res.json({ success: true, count });
}));

// Quiz test route
router.get(
  "/quizTest",
  UserVerification,
  asyncHandler(async (req, res) => {
    try {
      const quiz = await validateQuizAccess(
        req.query.quizCode,
        req.user.id
      );

      const totalNeededTime = quiz.questions.reduce(
        (a, q) => a + Number(q.neededTime || 0),
        0
      );

      res.json({
        quizId: quiz._id,
        title: quiz.title,
        description: quiz.description,
        author: quiz.author,
        totalQuestions: quiz.questions.length,
        totalNeededTime,
        startDate: quiz.date,
        deadline: quiz.dateLine,
        success: "Quiz is available to start!",
      });
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Server error", violations: err.violations });
    }
  })
);


// Fetch quiz questions
router.get("/", UserVerification, asyncHandler(async (req, res) => {
  try {
    const quiz = await validateQuizAccess(req.query.quizCode, req.user.id);
    quiz.questions = quiz.questions.map(({ correct, ...rest }) => rest);
    res.json(quiz);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}));

// Submit quiz answers
router.post("/submit_answers", UserVerification, asyncHandler(async (req, res) => {
  const { quizCode, studentAnswers } = req.body;
  const quizData = await QuizData.findById(quizCode).lean();
  if (!quizData) return res.status(404).json({ error: "Quiz not found" });

  const gradedAnswers = studentAnswers.map((ans, index) => {
    const correctAnswer = quizData.questions[index].correct;
    const score = quizData.questions[index].score;
    const isCorrect = Number(ans.answer) === Number(correctAnswer);
    return { ...ans, question: quizData.questions[index].question, questionNo: index, score, isCorrect };
  });

  const totalScore = gradedAnswers.reduce((acc, ans) => ans.isCorrect ? acc + Number(ans.score) : acc, 0);

  await QuizAnswer.create({ quizId: quizData._id, userId: req.user.id, totalScore, answers: gradedAnswers });
  res.json({ message: "Answers submitted", totalScore, quizId: quizData._id, answers: gradedAnswers });
}));

module.exports = router;
