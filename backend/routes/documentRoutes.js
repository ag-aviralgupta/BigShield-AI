const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  uploadDocument,
  getDocuments,
  verifyGSTDocument, verifyPANDocument, verifyITRDocument, verifyOEMDocument,
  verifyLocalContentDocument, verifyExperienceDocument, verifyUdyamDocument
} = require("../controllers/documentController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});


const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Only PDF files are accepted")) });


router.post(
  "/upload",
  upload.single("document"),
  uploadDocument
);


router.get(
  "/bidder/:bidderId",
  getDocuments
);

router.post(
  "/:documentId/verify-gst",
  verifyGSTDocument
);

router.post(
  "/:documentId/verify-pan",
  verifyPANDocument
);
router.post("/:documentId/verify-itr", verifyITRDocument);
router.post("/:documentId/verify-oem", verifyOEMDocument);
router.post("/:documentId/verify-local-content", verifyLocalContentDocument);
router.post("/:documentId/verify-experience", verifyExperienceDocument);
router.post("/:documentId/verify-udyam", verifyUdyamDocument);

module.exports = router;
