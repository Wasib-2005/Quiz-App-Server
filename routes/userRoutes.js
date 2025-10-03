const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const UserData = require("../models/userDataSchema");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

router.post("/validation", asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing Authorization header" });

  const idToken = authHeader.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(idToken);

  let user = await UserData.findOne({ email: decoded.email });
  if (!user) {
    user = new UserData({ email: decoded.email, role: "student", permissions: [] });
    await user.save();
  }

  const token = jwt.sign({
    id: user._id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  }, process.env.JWT_SECRET, { expiresIn: "1h" });

  res.status(200).json({
    id: user._id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    token
  });
}));

module.exports = router;
