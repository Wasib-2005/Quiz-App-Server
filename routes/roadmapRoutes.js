const express = require("express");
const Roadmap = require("../models/roadmapSchema");

const router = express.Router();

// GET all roadmap milestones
router.get("/", async (req, res) => {
  try {
    const roadmap = await Roadmap.find().sort({ date: 1 });
    res.json(roadmap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new milestone
router.post("/", async (req, res) => {
  try {
    const milestone = new Roadmap(req.body);
    await milestone.save();
    res.status(201).json(milestone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT to update milestone completion
router.put("/:id", async (req, res) => {
  try {
    const milestone = await Roadmap.findByIdAndUpdate(
      req.params.id,
      { completed: req.body.completed },
      { new: true }
    );
    res.json(milestone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
