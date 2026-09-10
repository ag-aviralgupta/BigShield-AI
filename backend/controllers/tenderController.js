const pool = require("../db");

const getTenders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tenders ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tenders",
      error: error.message,
    });
  }
};

const requirementDefaults = [
  ["GST Registration", 20, true, /GST\s*(REGISTRATION|CERTIFICATE)?/i], ["PAN", 10, true, /\bPAN\b/i],
  ["ITR", 20, true, /\bITR|INCOME\s+TAX\s+RETURN/i], ["OEM Authorization", 15, true, /OEM\s+AUTHORIZATION/i],
  ["Local Content", 15, true, /LOCAL\s+CONTENT/i], ["Experience", 5, true, /EXPERIENCE/i],
  ["Blacklisting Status", 5, true, /BLACKLIST/i], ["Udyam Registration", 10, false, /UDYAM/i]
];
const uploadTender = async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, tenderNumber, description = "" } = req.body;
    if (!title || !tenderNumber || !req.file) return res.status(400).json({ message: "title, tenderNumber, and a PDF are required" });
    const form = new FormData(); form.append("file", new Blob([req.file.buffer], { type: "application/pdf" }), req.file.originalname);
    const response = await fetch(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/extract`, { method: "POST", body: form });
    const extracted = await response.json(); if (!response.ok) return res.status(502).json({ message: extracted.detail || "Tender text extraction failed" });
    await client.query("BEGIN");
    const tender = await client.query("INSERT INTO tenders (title,tender_number,description) VALUES ($1,$2,$3) RETURNING *", [title, tenderNumber, description]);
    const detected = requirementDefaults.filter(([, , , pattern]) => pattern.test(extracted.text || ""));
    for (const [name, weight, mandatory] of (detected.length ? detected : requirementDefaults)) await client.query("INSERT INTO requirements (tender_id,name,mandatory,weight) VALUES ($1,$2,$3,$4)", [tender.rows[0].id, name, mandatory, weight]);
    await client.query("COMMIT");
    res.status(201).json({ message: "Tender uploaded and requirements extracted for officer confirmation", tender: tender.rows[0], detected_requirements: (detected.length ? detected : requirementDefaults).map(([name, weight, mandatory]) => ({ name, weight, mandatory })) });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ message: "A tender with this tender number already exists" });
    res.status(500).json({ message: "Tender upload failed", error: error.message });
  }
  finally { client.release(); }
};

// Tender-level intelligence: this is intentionally explainable, so an officer
// can see why a bid needs attention instead of receiving an opaque AI score.
const getTenderIntelligence = async (req, res) => {
  try {
    const tenderId = req.params.tenderId;
    const [tender, bidders, requirements, evidence, decisions, duplicateGstin, duplicatePan] = await Promise.all([
      pool.query("SELECT id,title,tender_number FROM tenders WHERE id=$1", [tenderId]),
      pool.query("SELECT id,company_name,gstin,pan FROM bidders WHERE tender_id=$1 ORDER BY id", [tenderId]),
      pool.query("SELECT id FROM requirements WHERE tender_id=$1", [tenderId]),
      pool.query(`SELECT DISTINCT ON (d.bidder_id, vr.requirement_id) d.bidder_id, vr.status, vr.requirement_id, vr.reason FROM verification_results vr JOIN documents d ON d.id=vr.document_id JOIN bidders b ON b.id=d.bidder_id WHERE b.tender_id=$1 ORDER BY d.bidder_id, vr.requirement_id, vr.verified_at DESC`, [tenderId]),
      pool.query(`SELECT DISTINCT ON (bidder_id) bidder_id,decision,remarks,created_at FROM officer_decisions WHERE bidder_id IN (SELECT id FROM bidders WHERE tender_id=$1) ORDER BY bidder_id,created_at DESC`, [tenderId]),
      pool.query("SELECT gstin, array_agg(company_name) companies FROM bidders WHERE tender_id=$1 AND gstin IS NOT NULL AND gstin<>'' GROUP BY gstin HAVING count(*)>1", [tenderId]),
      pool.query("SELECT pan, array_agg(company_name) companies FROM bidders WHERE tender_id=$1 AND pan IS NOT NULL AND pan<>'' GROUP BY pan HAVING count(*)>1", [tenderId])
    ]);
    if (!tender.rows.length) return res.status(404).json({ message: "Tender not found" });
    const byBidder = new Map(bidders.rows.map(b => [b.id, []]));
    evidence.rows.forEach(row => byBidder.get(row.bidder_id)?.push(row));
    const signals = [];
    duplicateGstin.rows.forEach(row => signals.push({ severity: "HIGH", type: "IDENTITY_COLLISION", title: "GSTIN reused across bidders", detail: `${row.gstin} is listed for ${row.companies.join(", ")}.` }));
    duplicatePan.rows.forEach(row => signals.push({ severity: "HIGH", type: "IDENTITY_COLLISION", title: "PAN reused across bidders", detail: `${row.pan} is listed for ${row.companies.join(", ")}.` }));
    bidders.rows.forEach(bidder => {
      const records = byBidder.get(bidder.id) || [];
      const failures = records.filter(row => ["MISMATCH", "INVALID"].includes(row.status));
      const reviews = records.filter(row => row.status === "REVIEW");
      if (failures.length) signals.push({ severity: "HIGH", type: "EVIDENCE_CONFLICT", bidderId: bidder.id, title: `${bidder.company_name}: verification conflict`, detail: failures.map(x => x.reason).filter(Boolean).join(" ") || "One or more evidence checks failed." });
      if (reviews.length) signals.push({ severity: "MEDIUM", type: "HUMAN_REVIEW", bidderId: bidder.id, title: `${bidder.company_name}: human review needed`, detail: reviews.map(x => x.reason).filter(Boolean).join(" ") || "Evidence needs officer review." });
      if (requirements.rows.length && new Set(records.map(x => x.requirement_id)).size < requirements.rows.length) signals.push({ severity: "LOW", type: "EVIDENCE_GAP", bidderId: bidder.id, title: `${bidder.company_name}: evidence incomplete`, detail: `${new Set(records.map(x => x.requirement_id)).size}/${requirements.rows.length} requirements have verification evidence.` });
    });
    res.json({ tender: tender.rows[0], metrics: { bidders: bidders.rows.length, requirements: requirements.rows.length, verifiedEvidence: evidence.rows.filter(x => x.status === "VERIFIED").length, decisions: decisions.rows.length, highSignals: signals.filter(x => x.severity === "HIGH").length }, signals: signals.sort((a,b) => ({HIGH:0,MEDIUM:1,LOW:2}[a.severity] - ({HIGH:0,MEDIUM:1,LOW:2}[b.severity]))) });
  } catch (error) { res.status(500).json({ message: "Could not generate tender intelligence", error: error.message }); }
};

module.exports = { getTenders, uploadTender, getTenderIntelligence };
