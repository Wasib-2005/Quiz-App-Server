const express = require("express");
const { Violation } = require("../models/violationSchema");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

/**
 * Record a violation
 */
router.post(
  "/",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizCode, reason, title } = req.body;

    if (!quizCode || !reason) {
      return res.status(400).json({ error: "Missing quizCode or reason" });
    }

    await Violation.create({
      quizCode,
      email: req.user.email,
      title,
      userId: req.user.id,
      reason,
    });

    // Count violations for this user and quiz
    const count = await Violation.countDocuments({
      quizCode,
      userId: req.user.id,
    });

    const banned = count >= 5;

    res.json({
      success: true,
      message: "Violation recorded",
      count,
      banned,
    });
  })
);

/**
 * Get all violations
 */
router.get(
  "/",
  UserVerification,
  asyncHandler(async (req, res) => {
    const violations = await Violation.find({ userId: req.user.id });
    res.json(violations);
  })
);

/**
 * Get violation count
 */
router.get(
  "/count",
  UserVerification,
  asyncHandler(async (req, res) => {
    const count = await Violation.countDocuments({ userId: req.user.id });
    const banned = count >= 5;
    res.json({ success: true, count, banned });
  })
);

module.exports = router;
