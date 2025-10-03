const jwt = require("jsonwebtoken");

const UserVerification = async (req, res, next) => {
  console.log("➡️ Verifying user...");
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token found" });
    }

    const token = authHeader.split(" ")[1];

    console.log(token)

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded data to request
    next();
  } catch (err) {
    console.error("❌ User verification failed:", err);
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = UserVerification;
