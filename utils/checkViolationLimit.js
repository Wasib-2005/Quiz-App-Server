const Violation = require("../models/violationSchema");

module.exports = async function checkViolationLimit(quizId, userId) {
  const violations = await Violation.find({
    quizCode: quizId,
    userId,
  });

  let violationCount = 0;

  violations.forEach((v) => {
    if (v.reason === "Internet disconnected during quiz. Quiz reset!") {
      violationCount += 0.6; // Each counts as 0.6 violation
    } else {
      violationCount += 1;
    }
  });

  if (violationCount >= 3) {
    const violationSummary = violations.map((v) => v.reason);
    throw {
      status: 403,
      message:
        "❌ You are banned from answering this quiz due to excessive violations.",
      violations: violationSummary,
    };
  }
};
