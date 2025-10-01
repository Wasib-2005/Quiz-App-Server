require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const admin = require("firebase-admin");

// ---------------- MODELS ----------------
const UserData = require("./models/UserData");

// ---------------- middleware ----------------
const UserVerification = require("./middleware/UserVerification");

// ---------------- FIREBASE ----------------
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ---------------- APP ----------------
const app = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.0.107:5173",
      "https://quiz-app-l3bk.onrender.com",
    ],
    credentials: true, // ✅ allow cookies
  })
);

app.use(express.json());
app.use(cookieParser());

// ---------------- ROUTES ----------------

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Quiz App Server running");
});

// ✅ Verify Firebase ID token and set cookie
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

    const tokenForPermissions = jwt.sign(
      {
        id: result._id,
        permissions: result.permissions,
        email: result.email,
        role: result.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ⚡ FIXED COOKIE SETTINGS
    res.cookie("tokenForPermissions", tokenForPermissions, {
      httpOnly: true,
      secure: true,           // Must be true in production for SameSite=None
      sameSite: "none",       // Allows cross-site cookies
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { _id, email, role, permissions } = result;
    res.status(200).json({ id: _id, email, role, permissions });
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
