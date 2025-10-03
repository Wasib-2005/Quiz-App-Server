const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema({
  quizCode: { type: String, required: true },
  email:{type:String,require:true},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserData", required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("violation", violationSchema);
