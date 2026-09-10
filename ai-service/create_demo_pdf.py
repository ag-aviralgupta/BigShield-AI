"""Creates a text-based PDF for the full ABC Industries verification demo."""
from pathlib import Path

lines = [
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
    "This is a mock SIH 2026 demonstration document only.",
]

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

target = Path(__file__).resolve().parent / "demo_abc_all_verifications.pdf"
target.write_bytes(pdf)
print(target)
