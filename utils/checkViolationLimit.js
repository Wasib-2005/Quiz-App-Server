const { Violation } = require("../models/violationSchema");

module.exports = async function checkViolationLimit(quizCode, userId) {
  const count = await Violation.countDocuments({ quizCode, userId });

  if (count >= 5) {
    throw { status: 403, message: "You are banned from this quiz due to violations." };
  }

  return true;
};
