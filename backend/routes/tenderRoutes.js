const express = require("express");
const multer = require("multer");
const router = express.Router();

const { getTenders, uploadTender, getTenderIntelligence } = require("../controllers/tenderController");

router.get("/", getTenders);
router.get("/:tenderId/intelligence", getTenderIntelligence);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Only PDF files are accepted")) });
router.post("/upload", upload.single("document"), uploadTender);

module.exports = router;
