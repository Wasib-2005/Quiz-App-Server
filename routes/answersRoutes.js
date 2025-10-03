const express = require("express");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");
const QuizAnswer = require("../models/quizAnswerSchema");

const router = express.Router();

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
      answers: answersDoc.answers,
    });
  })
);

router.get("/answers/all", UserVerification, async (req,res) => {
  
});

module.exports = router;
