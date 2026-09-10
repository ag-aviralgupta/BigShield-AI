const pool = require("../db");
const { calculateCompliance } = require("../services/complianceEngine");

const getComplianceReport = async (req, res) => {
  try {
    const { bidderId } = req.params;

    // Get bidder
    const bidderResult = await pool.query(
      `SELECT * FROM bidders WHERE id = $1`,
      [bidderId]
    );

    if (bidderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Bidder not found"
      });
    }

    const bidder = bidderResult.rows[0];

    // Get tender requirements
    const requirementsResult = await pool.query(
      `SELECT * FROM requirements
       WHERE tender_id = $1
       ORDER BY id`,
      [bidder.tender_id]
    );

    // Get verification results
    const resultsResult = await pool.query(
      `SELECT DISTINCT ON (vr.requirement_id) vr.*, d.file_name, d.document_type, vr.verified_at, vr.extracted_fields
       FROM verification_results vr
       JOIN documents d
       ON vr.document_id = d.id
       WHERE d.bidder_id = $1
       ORDER BY vr.requirement_id, vr.verified_at DESC`,
      [bidderId]
    );

    const report = calculateCompliance(
      requirementsResult.rows,
      resultsResult.rows
    );

    let officerDecision = null;
    try {
      const decision = await pool.query("SELECT decision,remarks,created_at FROM officer_decisions WHERE bidder_id=$1 ORDER BY created_at DESC LIMIT 1", [bidderId]);
      officerDecision = decision.rows[0] || null;
    } catch (_) { /* migration has not been applied yet */ }
    res.json({
      bidder: bidder.company_name,
      tender_id: bidder.tender_id,
      ...report,
      evidence: resultsResult.rows.map((row) => ({ ...row, file_path: undefined })),
      officerDecision
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to generate compliance report",
      error: error.message
    });
  }
};

const saveOfficerDecision = async (req, res) => {
  try {
    const { decision, remarks = "" } = req.body;
    if (!['ACCEPT', 'REVIEW', 'REJECT'].includes(decision)) return res.status(400).json({ message: "decision must be ACCEPT, REVIEW, or REJECT" });
    if (decision === 'REJECT' && !remarks.trim()) return res.status(400).json({ message: "Rejection remarks are required for the audit trail" });
    const bidder = await pool.query("SELECT id FROM bidders WHERE id=$1", [req.params.bidderId]);
    if (!bidder.rows.length) return res.status(404).json({ message: "Bidder not found" });
    await pool.query(`CREATE TABLE IF NOT EXISTS officer_decisions (id SERIAL PRIMARY KEY, bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE, decision VARCHAR(20) NOT NULL, remarks TEXT, officer_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    const result = await pool.query("INSERT INTO officer_decisions (bidder_id,decision,remarks) VALUES ($1,$2,$3) RETURNING *", [req.params.bidderId, decision, remarks]);
    res.status(201).json({ message: "Officer decision saved", decision: result.rows[0] });
  } catch (error) { res.status(500).json({ message: "Failed to save officer decision", error: error.message }); }
};

module.exports = { getComplianceReport, saveOfficerDecision };
