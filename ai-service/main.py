from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
from extractor import extract_fields
import json, os, tempfile

BASE_DIR = Path(__file__).resolve().parent
def load_mock(name):
    with open(BASE_DIR / name, encoding="utf-8") as file: return json.load(file)
gst_database, pan_database, itr_database = (load_mock(x) for x in ("mock_gst.json", "mock_pan.json", "mock_itr.json"))
oem_database, blacklist_database, udyam_database = (load_mock(x) for x in ("mock_oem.json", "mock_blacklist.json", "mock_udyam.json"))
app = FastAPI(title="BigShield AI Service", version="1.0.0")

def result(status, reason, confidence=0.0, **values):
    return {"status": status, "verified": status == "VERIFIED", "reason": reason, "confidence": confidence, **values}

async def pdf_fields(file):
    if file.content_type and file.content_type != "application/pdf": raise HTTPException(400, "Only PDF files are supported")
    name = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
            name = temp.name; temp.write(await file.read())
        reader = PdfReader(name); text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return extract_fields(text), text, len(reader.pages)
    except Exception as exc: raise HTTPException(400, f"Could not read PDF: {exc}")
    finally:
        if name and os.path.exists(name): os.unlink(name)

@app.get("/")
def home(): return {"message": "BigShield AI Service Running", "mode": "rule-based demo"}
@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    fields, text, pages = await pdf_fields(file); return {"filename": file.filename, "pages": pages, "fields": fields, "text": text}
class GSTRequest(BaseModel): gstin: str
@app.post("/verify-gst")
def verify_gst(data: GSTRequest):
    gstin = data.gstin.upper().strip(); record = gst_database.get(gstin)
    if not record: return result("MISMATCH", "GSTIN not found in verified database", .95, submitted_gstin=gstin, verified_gstin=None)
    return result("VERIFIED", "GSTIN matches verification database and is ACTIVE", .98, submitted_gstin=gstin, verified_gstin=gstin, company=record["company"], gst_status=record["status"])
@app.post("/verify-gst-document")
async def verify_gst_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); gstin = fields["gstin"]
    return result("INVALID", "GSTIN could not be extracted from document", .2, fields=fields) if not gstin else {**verify_gst(GSTRequest(gstin=gstin)), "fields": fields}
@app.post("/verify-pan-document")
async def verify_pan_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); pan = fields["pan"]
    if not pan: return result("INVALID", "PAN could not be extracted from document", .2, fields=fields)
    record = pan_database.get(pan.upper())
    if not record: return result("MISMATCH", "PAN not found in verified database", .95, submitted_pan=pan, verified_pan=None, fields=fields)
    return result("VERIFIED", "PAN matches verification database and is ACTIVE", .98, submitted_pan=pan, verified_pan=pan, company=record["company"], fields=fields)
@app.post("/verify-itr-document")
async def verify_itr_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); pan = fields["pan"]
    if not pan: return result("INVALID", "PAN could not be extracted from ITR document", .2, fields=fields)
    record = itr_database.get(pan.upper()); submitted = fields["turnover"]; submitted_number = float(submitted.replace(",", "")) if submitted else None
    common = {"pan": pan, "submitted_pan": pan, "submitted_turnover": submitted, "fields": fields}
    if not record: return result("MISMATCH", "PAN not found in verified ITR database", .95, verified_turnover=None, filing_status=None, **common)
    common.update({"verified_turnover": record["turnover"], "filing_status": record["filing_status"], "financial_year": record["financial_year"], "company": record["company"]})
    if record["filing_status"] != "FILED": return result("MISMATCH", "ITR filing status is NOT_FILED", .97, **common)
    if submitted_number is not None and submitted_number != record["turnover"]: return result("MISMATCH", "Declared turnover does not match verified ITR record", .96, **common)
    return result("VERIFIED", "ITR verified successfully", .97, **common)
@app.post("/verify-oem-document")
async def verify_oem_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); number = fields["certificate_number"]
    if not number: return result("INVALID", "OEM certificate number could not be extracted", .2, fields=fields)
    record = oem_database.get(number)
    if not record: return result("MISMATCH", "OEM certificate is not found in verification database", .95, certificate_number=number, fields=fields)
    common = {"certificate_number": number, "company": record["company"], "oem": record["oem"], "expiry_date": record["expiry_date"], "fields": fields}
    if record["status"] == "INVALID" or not record["verified"]: return result("MISMATCH", "OEM authorization is invalid or expired", .98, **common)
    if record["status"] == "EXPIRING_SOON": return result("REVIEW", "OEM authorization is valid but expires soon", .9, **common)
    return result("VERIFIED", "OEM authorization is valid", .97, **common)
@app.post("/verify-local-content-document")
async def verify_local_content_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); submitted = fields["local_content_percentage"]; threshold = 60
    if submitted is None: return result("INVALID", "Local content percentage could not be extracted", .2, submitted_percentage=None, required_percentage=threshold, fields=fields)
    status = "VERIFIED" if float(submitted) >= threshold else "MISMATCH"; reason = "Local content meets the 60% tender threshold" if status == "VERIFIED" else "Local content is below the 60% tender threshold"
    return result(status, reason, .96, submitted_percentage=float(submitted), required_percentage=threshold, fields=fields)
@app.post("/verify-experience-document")
async def verify_experience_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); years = fields["experience_years"]; minimum = 5
    if years is None: return result("INVALID", "Relevant experience years could not be extracted", .2, submitted_years=None, required_years=minimum, fields=fields)
    status = "VERIFIED" if float(years) >= minimum else "MISMATCH"; reason = "Experience meets tender requirement" if status == "VERIFIED" else "Experience is below the 5-year requirement"
    return result(status, reason, .95, submitted_years=float(years), required_years=minimum, project_count=fields["project_count"], fields=fields)
@app.post("/verify-udyam-document")
async def verify_udyam_document(file: UploadFile = File(...)):
    fields, _, _ = await pdf_fields(file); number = fields["udyam_number"]
    if not number: return result("INVALID", "Udyam registration number could not be extracted", .2, fields=fields)
    record = udyam_database.get(number)
    if not record: return result("MISMATCH", "Udyam registration not found in verification database", .95, registration_number=number, fields=fields)
    return result("VERIFIED", "Udyam registration is ACTIVE", .97, registration_number=number, company=record["company"], fields=fields)
class BlacklistRequest(BaseModel): company_name: str
@app.post("/verify-blacklist")
def verify_blacklist(data: BlacklistRequest):
    record = blacklist_database.get(data.company_name)
    if not record: return result("REVIEW", "Company not found in mock blacklist database", .65, company=data.company_name)
    if record["status"] == "BLACKLISTED": return result("MISMATCH", "Company is listed as blacklisted", .99, company=data.company_name, blacklist_status="BLACKLISTED")
    return result("VERIFIED", "No blacklist record found", .98, company=data.company_name, blacklist_status="CLEAR")
