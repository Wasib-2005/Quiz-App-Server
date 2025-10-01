const jwt = require("jsonwebtoken");
const UserData = require("../models/UserData");

const UserVerification = async (req, res, next) => {
  console.log("stuck here");
  try {
    const token = req.cookies.tokenForPermissions;
    if (!token) {
      return res.status(401).json({ error: "No token found" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded data to request
    next();
  } catch (err) {
    console.error("User verification failed ");
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = UserVerification;
