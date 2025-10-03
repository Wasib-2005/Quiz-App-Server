const QuizData = require("../models/questionSchema");
const QuizAnswer = require("../models/quizAnswerSchema");
const checkViolationLimit = require("./checkViolationLimit");

module.exports = async function validateQuizAccess(quizCode, userId) {
  const quiz = await QuizData.findById(quizCode);
  if (!quiz) throw { status: 404, message: "Quiz not found" };

  const answered = await QuizAnswer.findOne({
    quizId: quiz._id,
    userId,
  });
  if (answered)
    throw { status: 400, message: "You already answered this quiz" };

  const now = new Date();
  if (quiz.date && now < new Date(quiz.date))
    throw { status: 403, message: "Quiz has not started yet" };

  if (quiz.dateLine && now > new Date(quiz.dateLine))
    throw { status: 403, message: "Quiz deadline has passed" };

  // NEW: Check violation limit
  await checkViolationLimit(quiz._id, userId);

  return quiz;
};
