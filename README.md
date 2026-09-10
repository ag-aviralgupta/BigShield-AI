# BIGSHIELD AI

Local SIH 2026 prototype for AI-assisted GeM bid compliance verification. It uses PDF text extraction, deterministic field rules, mock verification registries and explainable weighted scoring. It is a decision-support tool: only an officer can accept, review, or reject a bid.

## Architecture

React/Vite frontend (`5173`) → Express/PostgreSQL API (`5000`) → FastAPI rule-based verification service (`8000`).

## Setup

1. Create PostgreSQL database `bigshield`, then run `psql -U postgres -d bigshield -f database-setup.sql`. This builds every table and adds the three demo bidders.
2. Create `backend/.env` with `PORT=5000`, `DB_USER`, `DB_HOST=localhost`, `DB_NAME=bigshield`, `DB_PASSWORD`, `DB_PORT=5432`, and optionally `AI_SERVICE_URL=http://localhost:8000`.
3. In `ai-service`, activate `venv` or run `python -m pip install -r requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
4. In `backend`, run `npm install` then `npm run dev`.
5. In `frontend`, run `npm install` then `npm run dev`.

Demo login: `officer@bigshield.ai` / `password123`.

## API additions

- `POST /api/documents/:documentId/verify-itr|verify-oem|verify-local-content|verify-experience|verify-udyam`
- `POST /api/bidders/:bidderId/verify-blacklist`
- `POST /api/compliance/bidder/:bidderId/decision`
- `POST /api/tenders/upload` (multipart: `title`, `tenderNumber`, `description`, `document`)
- `POST /api/bidders` to add a bidder to any tender (`tenderId`, `companyName`, optional `gstin`, `pan`)

Document uploads accept PDFs only and are limited to 10 MB. The AI service additionally exposes corresponding `/verify-*-document` endpoints and `/verify-blacklist`.

## Demo flow

Log in, create or select any tender from the top-bar selector, add bidders from the Bidder evaluation screen, then open a bidder and upload evidence. The score is recomputed from the newest result for each requirement; missing or failed mandatory requirements produce high risk. A rejection requires written officer remarks, which are retained in the audit trail.

## Limitations

This MVP does not perform OCR for scanned PDFs, call live government registries, or provide production authentication. Mock data and deterministic extraction are deliberately used for a reliable local demonstration.
 .\venv\Scripts\Activate.ps1
 uvicorn main:app --reload --port 8000