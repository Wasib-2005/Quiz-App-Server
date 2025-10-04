const express = require("express");
const mongoose = require("mongoose");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");
const QuizAnswer = require("../models/quizAnswerSchema");

const router = express.Router();

/**
 * GET /answers
 * Get answers for a specific quiz taken by the student
 */
router.get(
  "/answers",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizCode } = req.query;
    if (!quizCode)
      return res.status(400).json({ error: "quizCode is required" });

    const answersDoc = await QuizAnswer.findOne({
      quizId: quizCode,
      userId: req.user.id,
    });

    if (!answersDoc)
      return res.status(404).json({ error: "No answers found for this quiz" });

    res.json({
      quizId: answersDoc.quizId,
      totalScore: answersDoc.totalScore,
      getScore: answersDoc.getScore,
      answers: answersDoc.answers,
    });
  })
);

/**
 * GET /answers/all
 * Get all answers for all quizzes taken by the student
 */
router.get(
  "/answers/all",
  UserVerification,
  asyncHandler(async (req, res) => {
    const allAnswers = await QuizAnswer.find({ userId: req.user.id });

    res.json(allAnswers);
  })
);

/**
 * GET /answers/total-score
 * Get the total score across all quizzes taken by the student
 */
router.get(
  "/total_score",
  UserVerification,
  asyncHandler(async (req, res) => {
    try {
      const total = await QuizAnswer.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.user.id),
          },
        },
        {
          $group: {
            _id: "$userId",
            totalScore: { $sum: "$totalScore" },
            getScore: { $sum: "$getScore" },
          },
        },
      ]);

      res.json({
        success: true,
        totalScore: total.length ? total[0].totalScore : 0,
        getScore: total.length ? total[0].getScore : 0,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error calculating total score" });
    }
  })
);

module.exports = router;
