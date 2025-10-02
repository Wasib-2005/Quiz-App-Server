const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// Models
const UserData = require("./models/userDataSchema");
const QuizData = require("./models/questionSchema");

// Middleware
const UserVerification = require("./middleware/UserVerification");

// Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// App
const app = express();
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Quiz App Server running");
});

// User validation (Firebase → JWT)
app.post("/user_validation", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const idToken = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    let rawResult = await UserData.findOne({ email: decoded.email });
    if (!rawResult) {
      rawResult = new UserData({
        email: decoded.email,
        role: "student",
        permissions: [],
      });
      await rawResult.save();
    }

    const tokenForPermissions = jwt.sign(
      {
        id: rawResult._id,
        email: rawResult.email,
        role: rawResult.role,
        permissions: rawResult.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      id: rawResult._id,
      email: rawResult.email,
      role: rawResult.role,
      permissions: rawResult.permissions,
      token: tokenForPermissions,
    });
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

// ✅ Quiz route (protected)
app.get("/quiz", UserVerification, async (req, res) => {
  const { quizCode } = req.query;

  try {
    const quizData = await QuizData.findById(quizCode);

    if (!quizData) {
      return res.status(404).json({ error: "❌ Wrong quiz code!" });
    }

    const now = new Date();

    // Check start date if it exists
    if (quizData.date && now < new Date(quizData.date)) {
      return res.status(403).json({
        error: "🕒 Quiz not started yet! Please wait until the start time.",
      });
    }

    // Check deadline if it exists
    if (quizData.dateLine && now > new Date(quizData.dateLine)) {
      return res.status(403).json({
        error: "⏰ Time’s up! The quiz deadline has passed.",
      });
    }

    // Remove "correct" field before sending
    const quizWithoutCorrect = quizData.toObject(); // Convert to plain JS object
    quizWithoutCorrect.questions = quizWithoutCorrect.questions.map(
      ({ correct, ...rest }) => rest
    );

    res.json(quizWithoutCorrect);
  } catch (error) {
    console.error("❌ Error fetching quiz:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Connect DB + Start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT || 5000, () =>
      console.log(
        `🚀 Server running on http://localhost:${process.env.PORT || 5000}`
      )
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
