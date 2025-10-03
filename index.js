const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// Models
const UserData = require("./models/userDataSchema");
const QuizData = require("./models/questionSchema");
const QuizAnswer = require("./models/quizAnswerSchema");

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

// ✅ Quiz Test Route (only check status, no quiz data returned)
// ✅ Quiz test route (basic info only)
app.get("/quizTest", UserVerification, async (req, res) => {
  const { quizCode } = req.query;
  const { user } = req;

  try {
    // 1️⃣ Find quiz
    const quizData = await QuizData.findById(quizCode);
    if (!quizData) {
      return res.status(404).json({ error: "❌ Wrong quiz code!" });
    }

    // 2️⃣ Check if user already answered
    const previousResult = await QuizAnswer.findOne({
      quizId: quizData._id,
      userId: user.id,
    });

    if (previousResult) {
      return res.status(400).json({
        error: "✅ You already answered this quiz",
      });
    }

    // 3️⃣ Check start & deadline
    const now = new Date();
    if (quizData.date && now < new Date(quizData.date)) {
      return res.status(403).json({
        error: "🕒 Quiz not started yet! Please wait until the start time.",
      });
    }

    if (quizData.dateLine && now > new Date(quizData.dateLine)) {
      return res.status(403).json({
        error: "⏰ Time’s up! The quiz deadline has passed.",
      });
    }

    // 4️⃣ Prepare total needed time (sum of all questions)
    const totalNeededTime = quizData.questions.reduce(
      (acc, q) => acc + Number(q.neededTime || 0),
      0
    );

    // 5️⃣ Send only safe/basic info (no answers)
    res.status(200).json({
      quizId: quizData._id,
      title: quizData.title,
      description: quizData.description,
      author: quizData.author,
      totalQuestions: quizData.questions.length,
      totalNeededTime,
      startDate: quizData.date,
      deadline: quizData.dateLine,
      success: "✅ Quiz is available to start!",
    });
  } catch (error) {
    console.error("❌ Error in /quizTest:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/quiz", UserVerification, async (req, res) => {
  const { quizCode } = req.query;
  const { user } = req;

  try {
    // 1️⃣ Find quiz
    const quizData = await QuizData.findById(quizCode);
    if (!quizData) {
      return res.status(404).json({ error: "❌ Wrong quiz code!" });
    }

    // 2️⃣ Check if user already answered this quiz
    const previousResult = await QuizAnswer.findOne({
      quizId: quizData._id,
      userId: user.id,
    });

    if (previousResult) {
      return res.status(400).json({
        error: "✅ You already answered this quiz",
        quizId: quizData._id,
        totalScore: previousResult.totalScore,
        answers: previousResult.answers,
        date: previousResult.date,
      });
    }

    // 3️⃣ Check start & deadline
    const now = new Date();
    if (quizData.date && now < new Date(quizData.date)) {
      return res.status(403).json({
        error: "🕒 Quiz not started yet! Please wait until the start time.",
      });
    }

    if (quizData.dateLine && now > new Date(quizData.dateLine)) {
      return res.status(403).json({
        error: "⏰ Time’s up! The quiz deadline has passed.",
      });
    }

    // 4️⃣ Remove "correct" field before sending
    const quizWithoutCorrect = quizData.toObject();
    quizWithoutCorrect.questions = quizWithoutCorrect.questions.map(
      ({ correct, ...rest }) => rest
    );

    res.status(200).json(quizWithoutCorrect);
  } catch (error) {
    console.error("❌ Error fetching quiz:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//
app.post("/submit_answers", UserVerification, async (req, res) => {
  try {
    const { quizCode, studentAnswers } = req.body;
    const { user } = req;

    // 1️⃣ Find quiz
    const quizData = await QuizData.findById(quizCode);
    if (!quizData) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // 2️⃣ Extract correct answers
    const quizAnswers = quizData.questions.map((q, index) => ({
      question: q.question,
      questionNo: index,
      correctAnswer: q.correct,
      score: q.score,
    }));

    // 3️⃣ Validate answers length
    if (studentAnswers.length !== quizAnswers.length) {
      return res.status(400).json({ error: "Invalid number of answers" });
    }

    // 4️⃣ Grade answers
    let totalScore = 0;
    const gradedAnswers = studentAnswers.map((ans, index) => {
      const correctAnswer = quizAnswers[index].correctAnswer;
      const score = quizAnswers[index].score;

      const isCorrect = Number(ans.answer) === Number(correctAnswer);
      if (isCorrect) totalScore += Number(score);

      return {
        ...ans,
        question: quizAnswers[index].question,
        questionNo: quizAnswers[index].questionNo,
        score,
        isCorrect,
      };
    });

    // 5️⃣ Save result in QuizAnswer collection
    const quizAnswerDoc = new QuizAnswer({
      quizId: quizData._id,
      userId: user.id,
      totalScore,
      answers: gradedAnswers,
    });

    await quizAnswerDoc.save();

    // 6️⃣ Send response
    res.status(200).json({
      message: "✅ Answers submitted successfully",
      totalScore,
      quizId: quizData._id,
      answers: gradedAnswers,
    });
  } catch (error) {
    console.error("❌ Error in /submit_answers:", error);
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
