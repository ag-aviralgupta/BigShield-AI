const express = require("express");
const router = express.Router();

const {
  getComplianceReport, saveOfficerDecision
} = require("../controllers/complianceController");

router.get(
  "/bidder/:bidderId",
  getComplianceReport
);
router.post("/bidder/:bidderId/decision", saveOfficerDecision);

module.exports = router;
