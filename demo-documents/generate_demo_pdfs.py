"""
Generates clean mock PDF documents for each demo bidder.
Uses standard Python without any third-party libraries.
"""
from pathlib import Path

def make_pdf(lines, output_path: Path):
    content = ["BT", "/F1 12 Tf", "72 760 Td", "16 TL"]
    for line in lines:
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content.extend([f"({safe}) Tj", "T*"])
    content.append("ET")
    stream = "\n".join(content).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(pdf)
    print(f"Generated: {output_path}")

BASE = Path(__file__).resolve().parent

# 1. ABC Industries (Compliant / Low Risk)
abc_lines = [
    "BIGSHIELD AI - DEMO BIDDER COMPLIANCE DOCUMENT",
    "Company Name: ABC Industries",
    "GSTIN: 07ABCDE1234F1Z5",
    "PAN: ABCDE1234F",
    "Annual Turnover: 84000000",
    "Financial Year: 2025-26",
    "Certificate Number: OEM-ABC-2026-001",
    "OEM Name: SafeTech Manufacturing Ltd.",
    "Expiry Date: 2027-08-30",
    "Local Content Declaration: Local Content: 72%",
    "Relevant Experience: 8 Years",
    "Relevant Projects: 12",
    "Udyam Registration Number: UDYAM-DL-01-0001234",
    "Profile: Fully Compliant Low-Risk Bidder (Demo).",
]
make_pdf(abc_lines, BASE / "ABC-Industries" / "demo_abc_compliance_doc.pdf")

# 2. XYZ Enterprises (Review Required / Medium Risk)
xyz_lines = [
    "BIGSHIELD AI - DEMO BIDDER COMPLIANCE DOCUMENT",
    "Company Name: XYZ Enterprises",
    "GSTIN: 07XYZDE5678G1Z2",
    "PAN: XYZDE5678G",
    "Annual Turnover: 69000000",
    "Financial Year: 2025-26",
    "Certificate Number: OEM-XYZ-2026-002",
    "OEM Name: SafeTech Manufacturing Ltd.",
    "Expiry Date: 2026-10-15",
    "Local Content Declaration: Local Content: 65%",
    "Relevant Experience: 6 Years",
    "Relevant Projects: 8",
    "Udyam Registration Number: UDYAM-DL-01-0005678",
    "Profile: Medium Risk - OEM Certificate Expiring Soon (Demo).",
]
make_pdf(xyz_lines, BASE / "XYZ-Enterprises" / "demo_xyz_compliance_doc.pdf")

# 3. TechPro Solutions (High Risk / Flags & Conflicts)
tech_lines = [
    "BIGSHIELD AI - DEMO BIDDER COMPLIANCE DOCUMENT",
    "Company Name: TechPro Solutions",
    "GSTIN: 07TECHP9012H1Z8",
    "PAN: TECHP9012H",
    "Annual Turnover: 0",
    "Financial Year: 2025-26",
    "Certificate Number: OEM-TECH-2026-003",
    "OEM Name: Unknown OEM",
    "Expiry Date: 2025-01-10",
    "Local Content Declaration: Local Content: 45%",
    "Relevant Experience: 3 Years",
    "Relevant Projects: 2",
    "Profile: High Risk - Expired OEM, Low Content, ITR Discrepancy, Blacklisted (Demo).",
]
make_pdf(tech_lines, BASE / "TechPro-Solutions" / "demo_techpro_compliance_doc.pdf")

# Also copy/generate demo tender PDF for tender creation testing
tender_lines = [
    "GEVERNMENT E-MARKETPLACE (GeM) - BID SPECIFICATION",
    "Tender Number: GEM/2026/SAFETY/001",
    "Tender Title: Industrial Safety Equipment Procurement",
    "Scope: Procurement of industrial safety equipment for eligible bidders.",
    "Mandatory Requirements:",
    "1. GST Registration Certificate (GSTIN)",
    "2. Permanent Account Number (PAN)",
    "3. Income Tax Returns (ITR) for last 3 assessment years",
    "4. OEM Authorization Certificate",
    "5. Local Content Declaration under Make in India (Minimum 60%)",
    "6. Prior Relevant Work Experience (Minimum 5 Years)",
    "7. Blacklisting Status Declaration",
    "Optional Requirement:",
    "8. Udyam Registration Certificate (MSME)",
]
make_pdf(tender_lines, BASE / "demo_tender_specification.pdf")
print("All demo documents generated successfully.")
