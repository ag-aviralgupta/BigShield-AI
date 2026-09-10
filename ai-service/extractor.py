import re


def _match(pattern, text, flags=re.IGNORECASE):
    found = re.search(pattern, text, flags)
    return found.group(1).strip() if found else None


def extract_fields(text):
    """Deterministic field extraction for the local demo PDFs."""
    normalized = text.upper()
    gst = re.search(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b", normalized)
    pan = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", normalized)
    turnover = _match(r"(?:ANNUAL\s+)?TURNOVER[^0-9]{0,30}(?:INR|RS\.?)?\s*([\d,]+(?:\.\d+)?)", text)
    local_content = _match(r"LOCAL\s+CONTENT[^0-9]{0,25}([0-9]{1,3}(?:\.\d+)?)\s*%", text)
    experience = _match(r"(?:RELEVANT\s+)?(?:WORK\s+)?EXPERIENCE[^0-9]{0,25}([0-9]{1,2}(?:\.\d+)?)\s*YEARS?", text)
    projects = _match(r"(?:RELEVANT\s+)?PROJECTS?[^0-9]{0,25}([0-9]+)", text)
    certificate = _match(r"(?:CERTIFICATE|AUTHORIZATION)\s*(?:NO\.?|NUMBER|#)\s*[:\-]?\s*([A-Z0-9\-]+)", normalized) or _match(r"\b(OEM-[A-Z]+-\d{4}-\d+)\b", normalized)
    udyam = _match(r"\b(UDYAM-[A-Z]{2}-\d{2}-\d{7})\b", normalized)
    expiry = _match(r"(?:EXPIRY|VALID\s+UPTO|VALID\s+TILL)[^0-9]{0,25}(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", text)
    company = _match(r"(?:COMPANY|BIDDER|ORGANISATION|ORGANIZATION)\s*NAME\s*[:\-]?\s*([^\n\r]+)", text)
    oem = _match(r"(?:OEM|MANUFACTURER)\s*(?:NAME)?\s*[:\-]?\s*([^\n\r]+)", text)
    declaration = bool(re.search(r"(?:LOCAL\s+CONTENT\s+DECLARATION|WE\s+HEREBY\s+DECLARE)", text, re.IGNORECASE))
    return {"gstin": gst.group(0) if gst else None, "pan": pan.group(0) if pan else None,
            "email": _match(r"([\w.\-]+@[\w.\-]+\.\w+)", text), "phone": _match(r"\b([6-9]\d{9})\b", text),
            "turnover": turnover, "local_content_percentage": local_content, "declaration_present": declaration,
            "experience_years": experience, "project_count": projects, "certificate_number": certificate,
            "udyam_number": udyam, "expiry_date": expiry, "company_name": company, "oem_name": oem}
