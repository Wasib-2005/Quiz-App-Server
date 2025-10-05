const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const quizRoutes = require("./routes/quizRoutes");
const answersRoutes = require("./routes/answersRoutes");
const violationRoutes = require("./routes/violationRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");

const app = express();

app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.error("❌ CORS blocked for origin:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, try again later." },
  })
);

app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/answers", answersRoutes);
app.use("/api/violation", violationRoutes);
app.use("/api/roadmap", roadmapRoutes);



app.get("/", (req, res) => res.send("🚀 Quiz App Server running"));

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
      maxPoolSize: 10,
    });
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port", process.env.PORT || 5000)
    );
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
})();
