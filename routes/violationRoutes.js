const express = require("express");
const UserVerification = require("../middleware/UserVerification");
const asyncHandler = require("../middleware/asyncHandler");
const Violation = require("../models/violationSchema");

const router = express.Router();

// Get violations for logged-in user
router.get(
  "/",
  UserVerification,
  asyncHandler(async (req, res) => {
    const violations = await Violation.find({ userId: req.user.id }).sort({
      timestamp: -1,
    });
    res.json(violations);
  })
);

// Record a violation
router.post(
  "/",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { quizCode, reason, timestamp, email } = req.body;

    if (!quizCode || !reason || !timestamp) {
      return res
        .status(400)
        .json({ error: "Missing required violation fields" });
    }

    const violation = await Violation.create({
      userId: req.user.id,
      email: req.user.email,
      quizCode,
      reason,
      timestamp,
    });

    res.json({ success: true, violation });
  })
);

// NEW ROUTE — Get violation count based on filter
router.get(
  "/count",
  UserVerification,
  asyncHandler(async (req, res) => {
    const { userId, email, quizCode, id } = req.query;

    const filter = {};

    if (userId) filter.userId = userId;
    if (email) filter.email = email;
    if (quizCode) filter.quizCode = quizCode;
    if (id) filter._id = id;
    if (!userId && !email && !quizCode && !id) filter.userId = req.user.id;
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        error:
          "At least one filter (userId, email, quizCode, or id) is required",
      });
    }

    const violations = await Violation.find(filter);

    res.json({
      count: violations.length,
      violations: violations.map((v) => ({
        id: v._id,
        quizCode: v.quizCode,
        reason: v.reason,
        timestamp: v.timestamp,
        email: v.email,
      })),
    });
  })
);

module.exports = router;
