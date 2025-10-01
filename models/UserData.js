const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    permissions: {
      type: [String], // e.g. ["create_quiz", "view_results"]
      default: [],
    },
    data: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("userdatas", userDataSchema);
