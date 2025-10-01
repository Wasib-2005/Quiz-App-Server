require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const admin = require("firebase-admin");

// ---------------- MODELS ----------------
const UserData = require("./models/UserData");

// ---------------- MIDDLEWARE ----------------
const UserVerification = require("./middleware/UserVerification");

// ---------------- FIREBASE ----------------
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ---------------- APP ----------------
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.0.107:5173",
      "https://quiz-app-beryl-pi.vercel.app/",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ---------------- ROUTES ----------------

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Quiz App Server running");
});

// ✅ Verify Firebase ID token and return JWT
app.post("/user_validation", async (req, res) => {
  console.log("➡️ Received /user_validation request");
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
      console.log("🌱 Created new student user:", decoded.email);
    }

    const result = rawResult.toObject();

    // JWT valid for session only (e.g., short-lived token)
    const tokenForPermissions = jwt.sign(
      {
        id: result._id,
        permissions: result.permissions,
        email: result.email,
        role: result.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // ✅ Session lifetime: adjust as needed
    );

    const { _id, email, role, permissions } = result;

    // ❌ DO NOT set cookie — send JWT in response
    res.status(200).json({
      id: _id,
      email,
      role,
      permissions,
      token: tokenForPermissions,
    });
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

// quiz route (protected)
app.get("/quiz", UserVerification, async (req, res) => {
  console.log("➡️ Quiz request received");
  res.json({ message: "Quiz data would go here" });
});

// ---------------- DB + SERVER ----------------
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
