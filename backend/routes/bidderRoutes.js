const express = require("express");
const router = express.Router();

const { getBidders, getBidderSummaries, createBidder, verifyBlacklist } = require("../controllers/bidderController");

router.post("/", createBidder);
router.get("/:tenderId", getBidders);
router.get("/:tenderId/summary", getBidderSummaries);
router.post("/:bidderId/verify-blacklist", verifyBlacklist);

module.exports = router;
