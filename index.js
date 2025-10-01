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
const serviceAccount = require("./config/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ---------------- APP ----------------
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"], // your frontend
    credentials: true,
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
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);

    let rawResult = await UserData.findOne({ email: decoded.email });

    // If no user data found → auto-create student role
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

    // Sign a short-lived JWT for permissions
    const tokenForPermissions = jwt.sign(
      {
        id: result._id,
        permissions: result.permissions,
        email: result.email,
        role: result?.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("tokenForPermissions", tokenForPermissions, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    const { _id, email, role, permissions } = result;
    res.status(200).json({ id: _id, email, role, permissions });
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

// quiz req
app.get("/quiz", UserVerification, async (req, res) => {
  console.log("quiz req");
});

// ---------------- DB + SERVER ----------------
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
