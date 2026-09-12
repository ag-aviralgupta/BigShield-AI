const pool = require("../db");
const fs = require("fs");
const path = require("path");
const { verificationConfig } = require("../services/verificationConfig");

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const normalizedType = (type) =>
  String(type || "").trim().toUpperCase().replace(/[ -]/g, "_");

const uploadDocument = async (req, res) => {
  try {
    const { bidderId, documentType } = req.body;
    if (!bidderId || !documentType) {
      return res.status(400).json({ message: "bidderId and documentType are required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No PDF document uploaded" });
    }

    const result = await pool.query(
      `INSERT INTO documents (bidder_id, document_type, file_name, file_path)
       VALUES ($1, $2, $3, $4)
       RETURNING id, bidder_id, document_type, file_name, uploaded_at`,
      [bidderId, normalizedType(documentType), req.file.originalname, req.file.path]
    );

    res.status(201).json({
      message: "Document uploaded successfully",
      document: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, bidder_id, document_type, file_name, uploaded_at
       FROM documents
       WHERE bidder_id = $1
       ORDER BY uploaded_at DESC`,
      [req.params.bidderId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

async function saveResult(documentId, requirementId, aiResult, config) {
  await pool.query(
    `DELETE FROM verification_results WHERE document_id = $1 AND requirement_id = $2`,
    [documentId, requirementId]
  );
  await pool.query(
    `INSERT INTO verification_results
       (document_id, requirement_id, submitted_value, verified_value, status, confidence, reason, extracted_fields)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      documentId,
      requirementId,
      aiResult[config.submitted] ?? aiResult.pan ?? null,
      aiResult[config.verified] ?? null,
      aiResult.status || "INVALID",
      aiResult.confidence || 0,
      aiResult.reason || null,
      JSON.stringify(aiResult.fields || {})
    ]
  );
}

const verifyDocument = (expectedType) => async (req, res) => {
  try {
    const config = verificationConfig[expectedType];
    const documentResult = await pool.query(
      `SELECT d.id document_id, d.document_type, d.file_path, b.id bidder_id,
              b.company_name, b.tender_id, b.gstin, b.pan
       FROM documents d
       JOIN bidders b ON b.id = d.bidder_id
       WHERE d.id = $1`,
      [req.params.documentId]
    );

    if (!documentResult.rows.length) {
      return res.status(404).json({ message: "Document not found" });
    }

    const document = documentResult.rows[0];
    if (normalizedType(document.document_type) !== expectedType) {
      return res.status(400).json({ message: `This document must be ${expectedType}` });
    }

    const requirement = await pool.query(
      `SELECT id FROM requirements WHERE tender_id = $1 AND name = $2 LIMIT 1`,
      [document.tender_id, config.requirement]
    );

    if (!requirement.rows.length) {
      return res.status(404).json({ message: `${config.requirement} requirement not found` });
    }

    // Resolve path portably across machines/environments
    const resolvedPath = fs.existsSync(document.file_path)
      ? document.file_path
      : fs.existsSync(path.join(__dirname, "../uploads", path.basename(document.file_path)))
        ? path.join(__dirname, "../uploads", path.basename(document.file_path))
        : path.resolve(document.file_path);

    const fileBuffer = fs.readFileSync(resolvedPath);
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer], { type: "application/pdf" }), path.basename(document.file_path));

    const response = await fetch(`${AI_URL}${config.endpoint}`, {
      method: "POST",
      body: formData
    });

    const aiResult = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ message: aiResult.detail || "AI verification failed" });
    }

    const field = expectedType === "GST" ? "submitted_gstin" : expectedType === "PAN" ? "submitted_pan" : null;
    const expected = expectedType === "GST" ? document.gstin : expectedType === "PAN" ? document.pan : null;

    if (field && expected && aiResult[field] && aiResult[field].toUpperCase() !== expected.toUpperCase()) {
      aiResult.status = "MISMATCH";
      aiResult.verified = false;
      aiResult[config.verified] = expected;
      aiResult.reason = `${expectedType} in the document does not match the bidder master record`;
      aiResult.confidence = 0.99;
    }

    await saveResult(document.document_id, requirement.rows[0].id, aiResult, config);

    res.json({
      message: `${config.requirement} verification completed`,
      bidder: document.company_name,
      result: aiResult
    });
  } catch (error) {
    res.status(502).json({
      message: "Verification failed. Check the AI service and PDF.",
      error: error.message
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  verifyGSTDocument: verifyDocument("GST"),
  verifyPANDocument: verifyDocument("PAN"),
  verifyITRDocument: verifyDocument("ITR"),
  verifyOEMDocument: verifyDocument("OEM_AUTHORIZATION"),
  verifyLocalContentDocument: verifyDocument("LOCAL_CONTENT"),
  verifyExperienceDocument: verifyDocument("EXPERIENCE"),
  verifyUdyamDocument: verifyDocument("UDYAM"),
  saveResult
};
