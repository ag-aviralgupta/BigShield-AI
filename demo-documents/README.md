# BigShield AI - Demo Documents

This directory contains safe, synthetic, non-confidential PDF documents created specifically for testing and demonstrating the BigShield AI verification platform.

> [!NOTE]
> None of these files contain real personally identifiable information (PII) or confidential corporate records. All identities and numbers are synthetic test vectors.

---

## Directory Structure

```
demo-documents/
├── ABC-Industries/
│   └── demo_abc_compliance_doc.pdf     # Fully compliant low-risk bidder document
├── XYZ-Enterprises/
│   └── demo_xyz_compliance_doc.pdf     # Medium-risk bidder (OEM expiring soon)
├── TechPro-Solutions/
│   └── demo_techpro_compliance_doc.pdf # High-risk bidder (multiple compliance violations)
├── demo_tender_specification.pdf       # Sample tender document for new tender creation
└── generate_demo_pdfs.py               # Python generator to recreate these files anytime
```

---

## Demo Bidder Verification Matrix

| Bidder | Expected Outcome | Verification Details |
| :--- | :--- | :--- |
| **ABC Industries** | **LOW RISK / PASS (Score: ~100%)** | Valid Active GSTIN, Valid PAN, ITR Filed (Turnover ₹8.4 Cr), Valid OEM Authorization (Expires 2027), 72% Local Content (>= 60%), 8 Years Experience (>= 5 Years), Active Udyam Registration, Clear Blacklist. |
| **XYZ Enterprises** | **MEDIUM RISK / REVIEW REQUIRED** | Valid GSTIN and PAN, Valid ITR (Turnover ₹6.9 Cr), **OEM Authorization Expires Soon (2026-10-15 - Flagged for Review)**, 65% Local Content, 6 Years Experience, Active Udyam, Clear Blacklist. |
| **TechPro Solutions** | **HIGH RISK / FLAG FOR REVIEW / REJECT** | Valid GSTIN, Valid PAN, **ITR Not Filed (Turnover ₹0)**, **OEM Expired/Invalid (2025-01-10)**, **Low Local Content (45% < 60%)**, **Insufficient Experience (3 Years < 5 Years)**, **Listed on Blacklist Registry**. |

---

## How to Use in the Demo

1. In the BigShield AI web dashboard, select Tender `GEM/2026/SAFETY/001`.
2. Click on any bidder (e.g., **ABC Industries**).
3. In the **Upload Documents** section, choose the requirement type (e.g., `GST`, `PAN`, `ITR`, `OEM Authorization`, etc.).
4. Select the matching PDF from this directory (or use the all-in-one compliance PDF for that bidder).
5. Click **Upload Document**, then click **Verify** next to the uploaded document.
6. Observe the extracted fields, verification match against the mock registry, discrepancy alerts, recalculated compliance score, and officer decision workflow.
