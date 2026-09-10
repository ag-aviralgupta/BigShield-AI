const pool = require("../db");
const { verificationConfig } = require("../services/verificationConfig");
const { saveResult } = require("./documentController");
const { calculateCompliance } = require("../services/complianceEngine");

const getBidders = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const result = await pool.query(
      `SELECT * FROM bidders
       WHERE tender_id = $1
       ORDER BY id`,
      [tenderId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch bidders",
      error: error.message,
    });
  }
};

const createBidder = async (req, res) => {
  try {
    const { tenderId, companyName, gstin = null, pan = null } = req.body;
    if (!tenderId || !companyName?.trim()) return res.status(400).json({ message: "tenderId and companyName are required" });
    const tender = await pool.query("SELECT id FROM tenders WHERE id=$1", [tenderId]);
    if (!tender.rows.length) return res.status(404).json({ message: "Tender not found" });
    const result = await pool.query(
      "INSERT INTO bidders (tender_id,company_name,gstin,pan) VALUES ($1,$2,$3,$4) RETURNING *",
      [tenderId, companyName.trim(), gstin?.trim().toUpperCase() || null, pan?.trim().toUpperCase() || null]
    );
    res.status(201).json({ message: "Bidder added to tender", bidder: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Could not add bidder", error: error.message });
  }
};

const getBidderSummaries = async (req, res) => {
  try {
    const tenderId = req.params.tenderId;
    const [bidders, requirements, results, decisions] = await Promise.all([
      pool.query("SELECT * FROM bidders WHERE tender_id=$1 ORDER BY id", [tenderId]),
      pool.query("SELECT * FROM requirements WHERE tender_id=$1 ORDER BY id", [tenderId]),
      pool.query(`SELECT DISTINCT ON (d.bidder_id,vr.requirement_id) d.bidder_id,vr.* FROM verification_results vr JOIN documents d ON d.id=vr.document_id JOIN bidders b ON b.id=d.bidder_id WHERE b.tender_id=$1 ORDER BY d.bidder_id,vr.requirement_id,vr.verified_at DESC`, [tenderId]),
      pool.query(`SELECT DISTINCT ON (bidder_id) bidder_id,decision,remarks,created_at FROM officer_decisions WHERE bidder_id IN (SELECT id FROM bidders WHERE tender_id=$1) ORDER BY bidder_id,created_at DESC`, [tenderId])
    ]);
    const latestDecision = new Map(decisions.rows.map(row => [row.bidder_id, row]));
    res.json(bidders.rows.map((bidder) => {
      const decision = latestDecision.get(bidder.id) || null;
      const compliance = calculateCompliance(requirements.rows, results.rows.filter((row) => row.bidder_id === bidder.id));
      return { ...bidder, ...compliance, officerDecision: decision, finalStatus: decision?.decision || "PENDING_OFFICER" };
    }));
  } catch (error) { res.status(500).json({ message: "Failed to build bidder summaries", error: error.message }); }
};

const verifyBlacklist = async (req, res) => {
  try {
    const bidderResult = await pool.query("SELECT * FROM bidders WHERE id=$1", [req.params.bidderId]);
    if (!bidderResult.rows.length) return res.status(404).json({ message: "Bidder not found" });
    const bidder = bidderResult.rows[0];
    const requirement = await pool.query("SELECT id FROM requirements WHERE tender_id=$1 AND name=$2 LIMIT 1", [bidder.tender_id, verificationConfig.BLACKLIST.requirement]);
    if (!requirement.rows.length) return res.status(404).json({ message: "Blacklisting Status requirement not found" });
    const response = await fetch(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/verify-blacklist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: bidder.company_name }) });
    const result = await response.json(); if (!response.ok) return res.status(response.status).json({ message: result.detail || "Blacklist verification failed" });
    const existing = await pool.query("SELECT id FROM documents WHERE bidder_id=$1 AND document_type='BLACKLIST' LIMIT 1", [bidder.id]);
    let documentId = existing.rows[0]?.id;
    if (!documentId) { const created = await pool.query("INSERT INTO documents (bidder_id,document_type,file_name,file_path) VALUES ($1,'BLACKLIST','External blacklist check','') RETURNING id", [bidder.id]); documentId = created.rows[0].id; }
    await saveResult(documentId, requirement.rows[0].id, result, verificationConfig.BLACKLIST);
    res.json({ message: "Blacklist verification completed", bidder: bidder.company_name, result });
  } catch (error) { res.status(502).json({ message: "Blacklist verification failed", error: error.message }); }
};

module.exports = { getBidders, getBidderSummaries, createBidder, verifyBlacklist };   
