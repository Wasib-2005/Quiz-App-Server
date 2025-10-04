const express = require("express");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");
const QuizData = require("../models/questionSchema");
const QuizAnswer = require("../models/quizAnswerSchema");
const validateQuizAccess = require("../utils/validateQuizAccess");

const router = express.Router();

// Count quizzes taken by user
router.get(
  "/taken",
  UserVerification,
  asyncHandler(async (req, res) => {
    const count = await QuizAnswer.countDocuments({ userId: req.user.id });
    res.json({ success: true, count });
  })
);

// Quiz test route
router.get(
  "/quizTest",
  UserVerification,
  asyncHandler(async (req, res) => {
    try {
      const quiz = await validateQuizAccess(req.query.quizCode, req.user.id);

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
      res.status(err.status || 500).json({
        error: err.message || "Server error",
        violations: err.violations,
      });
    }
  })
);

// Fetch quiz questions
router.get(
  "/",
  UserVerification,
  asyncHandler(async (req, res) => {
    try {
      const quiz = await validateQuizAccess(req.query.quizCode, req.user.id);
      quiz.questions = quiz.questions.map(({ correct, ...rest }) => rest);
      res.json(quiz);
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Server error" });
    }
  })
);

router.get(
  "/all_quiz_teacher",
  UserVerification,
  asyncHandler(async (req, res) => {
    const quizzes = await QuizData.find({ userId: req.user.id });
    res.status(200).json(quizzes);
  })
);

router.get(
  "/teacher/:quizId",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizId } = req.params;

    const quiz = await QuizData.findOne({ _id: quizId, userId: req.user.id });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found or access denied" });
    }

    res.status(200).json(quiz);
  })
);


// 📘 Create new quiz
router.post(
  "/create",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { title, author, description, questions, date, dateLine } =
      req.body.quiz;

    if (!title || !questions?.length) {
      return res.status(400).json({ error: "Missing quiz title or questions" });
    }

    const quiz = await QuizData.create({
      author: author || req.user.name || req.user.name || "Unknown",
      userId: req.user.id, // ✅ Add user ID from token
      title,
      description,
      questions,
      date,
      dateLine,
    });

    res.status(201).json({ success: true, quiz });
  })
);

// 🛠️ Update existing quiz (only if created by same user)
router.put(
  "/update/:quizId",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const { title, description, questions, date, dateLine } = req.body;

    const quiz = await QuizData.findOne({ _id: quizId, userId: req.user.id });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found or access denied" });
    }

    quiz.title = title ?? quiz.title;
    quiz.description = description ?? quiz.description;
    quiz.questions = questions ?? quiz.questions;
    quiz.date = date ?? quiz.date;
    quiz.dateLine = dateLine ?? quiz.dateLine;

    await quiz.save();

    res.json({ success: true, quiz });
  })
);

// ✅ Delete a quiz
router.delete(
  "/:quizId",
  UserVerification,
  asyncHandler(async (req, res) => {
    const quiz = await QuizData.findOneAndDelete({
      _id: req.params.quizId,
      userId: req.user.id,
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found or access denied" });
    }

    res.json({ success: true, message: "Quiz deleted" });
  })
);

// Submit quiz answers
router.post(
  "/submit_answers",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizCode, studentAnswers } = req.body;
    console.log(studentAnswers);

    const quizData = await QuizData.findById(quizCode).lean();
    if (!quizData) return res.status(404).json({ error: "Quiz not found" });

    const gradedAnswers = studentAnswers.map((ans, index) => {
      const correctAnswer = quizData.questions[index].correct;
      const score = Number(quizData.questions[index].score || 0);
      const isCorrect = Number(ans.answer) === Number(correctAnswer);

      return {
        ...ans,
        question: quizData.questions[index].question,
        questionNo: index + 1,
        score,
        isCorrect,
      };
    });

    // ✅ Total possible score (sum of all question scores)
    const totalScore = quizData.questions.reduce(
      (acc, q) => acc + Number(q.score || 0),
      0
    );

    // ✅ Student’s score (sum of scores for correct answers)
    const getScore = gradedAnswers.reduce(
      (acc, ans) => (ans.isCorrect ? acc + Number(ans.score) : acc),
      0
    );

    const savedAnswer = await QuizAnswer.create({
      quizId: quizData._id,
      userId: req.user.id,
      totalScore,
      getScore,
      answers: gradedAnswers,
    });

    res.json({
      message: "Answers submitted",
      totalScore,
      getScore,
      quizId: quizData._id,
      answers: gradedAnswers,
    });
  })
);

module.exports = router;
