const calculateCompliance = (requirements, results) => {
  let score = 0;
  let totalWeight = 0;
  let mandatoryFailure = false;

  const report = requirements.map((req) => {
    const result = results.find((r) => r.requirement_id === req.id);

    let status = result ? result.status : "MISSING";

    // REVIEW means evidence is valid but needs human attention (for example, an
    // OEM certificate expiring soon). It must lower the score without becoming
    // an automatic mandatory-failure/high-risk verdict.
    if (req.mandatory && !["VERIFIED", "REVIEW"].includes(status)) {
      mandatoryFailure = true;
    }

    if (result && status === "VERIFIED") {
      score += req.weight;
    }

    totalWeight += req.weight;

    return {
      requirement: req.name,
      mandatory: req.mandatory,
      weight: req.weight,
      status,
      submitted_value: result?.submitted_value || null,
      verified_value: result?.verified_value || null,
      confidence: result?.confidence || null,
      reason: result?.reason || "Document not verified"
    };
  });

  const complianceScore =
    totalWeight > 0
      ? Math.round((score / totalWeight) * 100)
      : 0;

  let risk = "LOW";

  if (mandatoryFailure || complianceScore < 60) {
    risk = "HIGH";
  } else if (complianceScore < 85) {
    risk = "MEDIUM";
  }

  let recommendation = "PASS";

  if (risk === "MEDIUM") {
    recommendation = "REVIEW REQUIRED";
  }

  if (risk === "HIGH") {
    recommendation = "FLAG FOR REVIEW";
  }

  return {
    complianceScore,
    risk,
    recommendation,
    mandatoryFailure,
    requirements: report,
    discrepancies: report.filter((item) => !["VERIFIED", "MISSING"].includes(item.status)).map((item) => ({ affected_requirement: item.requirement, severity: item.mandatory ? "HIGH" : "MEDIUM", message: item.reason, evidence: { submitted: item.submitted_value, verified: item.verified_value } }))
  };
};

module.exports = { calculateCompliance };
