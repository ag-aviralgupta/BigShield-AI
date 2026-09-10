const express = require("express");
const router = express.Router();

const { getRequirements } = require("../controllers/requirementController");

router.get("/:tenderId", getRequirements);

module.exports = router;