# BIGSHIELD AI

> **AI-Powered Bid Compliance Verification Platform for GeM Procurement**

BigShield AI is an intelligent procurement compliance and fraud-prevention platform built to safeguard public procurement processes on the Government e-Marketplace (GeM). It automates the extraction, cross-referencing, and verification of bidder claims against authoritative verification sources before public contracts are awarded.

---

## 1. Project Overview

In traditional government and enterprise procurement, evaluating tender submissions is labor-intensive, error-prone, and susceptible to forged or expired documentation. 

**Core Concept:**
> *"BigShield verifies the bidder's claims rather than simply trusting the uploaded document."*

Instead of treating an uploaded document as proof of compliance, BigShield AI:
1. Ingests tender documents and bidder certificates.
2. Extracts critical entity identifiers and declarative data using deterministic and AI-assisted extraction.
3. Validates claims against authoritative registries (GSTN, CBDT/PAN, Income Tax Returns, OEM Authorization networks, Make-in-India Local Content declarations, MSME/Udyam registries, and Debarment/Blacklist registries).
4. Detects identity collisions, cross-document inconsistencies, and expiry anomalies.
5. Calculates an explainable, weighted compliance score.
6. Produces risk tiers and recommendations while leaving the ultimate, auditable determination with the authorized **Procurement Officer**.

```
Tender
  │
  ▼
Requirements Definition (Mandatory vs. Optional Weights)
  │
  ▼
Bidder Master (GSTIN, PAN, Company Identity)
  │
  ▼
Document Submissions (PDFs)
  │
  ▼
AI-Assisted Field Extraction
  │
  ▼
Registry & Rule-Based Verification
  │
  ▼
Cross-Document & Entity Discrepancy Checks
  │
  ▼
Compliance Score & Risk Classification (Low / Medium / High)
  │
  ▼
AI Recommendation (Pass / Review Required / Flag for Review)
  │
  ▼
Officer Final Decision & Immutable Audit Record
```

---

## 2. Key Features

- **Tender-Aware Requirement Verification**: Automatically parses tender guidelines or allows officers to configure mandatory and optional criteria with custom weights.
- **Document Upload & Parsing**: Validates and stores submitted PDF documents safely in structured storage.
- **GST Verification**: Cross-verifies active GSTIN registration and company name against GST records.
- **PAN Verification**: Validates corporate PAN identity and entity matching.
- **ITR & Financial Turnover Verification**: Validates annual turnover declarations and confirms filing status for relevant assessment years.
- **OEM Authorization Verification**: Verifies manufacturer authorization certificates, validity periods, and early expiration warnings.
- **Make in India (Local Content) Verification**: Verifies self-declarations against tender thresholds (e.g., minimum 60% domestic content).
- **Prior Experience Verification**: Assesses claimed track record and executed projects against tender minimum years.
- **Blacklist / Debarment Registry Verification**: Checks central procurement debarment lists to flag blacklisted entities immediately.
- **Udyam (MSME) Registration Verification**: Validates micro, small, and medium enterprise claims for preferential evaluation.
- **Cross-Document Discrepancy Detection**: Identifies PAN/GSTIN mismatches, turnover conflicts, and entity collisions between master records and document contents.
- **Deterministic Compliance Scoring**: Transparent weighted scoring model (0–100%) that prevents black-box AI hallucinations.
- **Risk Classification**: Ranks bids as **LOW**, **MEDIUM**, or **HIGH RISK** based on mandatory requirement compliance and total score.
- **Explainable Evidence Vault**: Provides line-by-line verification reasons, confidence scores, and raw extracted data.
- **Officer Recommendation Engine**: Guides procurement officers with contextual suggestions (`PASS`, `REVIEW REQUIRED`, `FLAG FOR REVIEW`).
- **Officer Final Decision**: Mandatory workflow step allowing procurement officers to formally `ACCEPT`, `REVIEW`, or `REJECT` a bid with recorded remarks.
- **Audit Trail**: Every verification result, timestamp, and officer remark is preserved for compliance reviews.

---

## 3. Architecture

BigShield AI utilizes a decoupled microservices architecture designed for security, explainability, and scalability:

```
┌────────────────────────────────────────────────────────┐
│               React + Vite Frontend                    │
│            (Tailored UI / Port 5173)                   │
└───────────────────────────┬────────────────────────────┘
                            │ REST API / JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│            Node.js / Express API Gateway               │
│            (Business Logic / Port 5000)                │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│    PostgreSQL Database    │  │   FastAPI AI Service    │
│  (Relational Storage &    │  │  (Extraction & Checks   │
│   Audit Logs / Port 5432) │  │       Port 8000)        │
└───────────────────────────┘  └───────────┬─────────────┘
                                           │
                                           ▼
                               ┌─────────────────────────┐
                               │ Verification Registries │
                               │   (Mock JSON & Rules)   │
                               └─────────────────────────┘
```

### Component Details:
1. **React Frontend (`frontend/`)**: Modern procurement interface providing interactive dashboards, real-time verification triggers, document preview, tender intelligence alerts, and officer decision panels.
2. **Express Backend (`backend/`)**: Central orchestrator managing PostgreSQL transactions, file handling (Multer), tender calculations, and coordination with the AI service.
3. **PostgreSQL Database (`database/`)**: Relational database storing tenders, requirements, bidders, document metadata, verification evidence, and officer decisions.
4. **FastAPI AI Microservice (`ai-service/`)**: Dedicated Python service running deterministic text extraction (`pypdf`), regular expression parsers, and registry connectors.
5. **Verification Registries**: Modular connector layer currently simulating GST, CBDT, ITR, OEM, and Debarment databases with deterministic data.

---

## 4. Folder Structure

```
BigShield-AI/
├── .gitignore                      # Git ignore rules for node, python, uploads, and secrets
├── README.md                       # Comprehensive setup and project documentation
├── docker-compose.yml              # Optional: One-command PostgreSQL setup with Docker
├── ai-service/                     # Python FastAPI AI and extraction microservice
│   ├── create_demo_pdf.py          # Standalone demo PDF builder
│   ├── extractor.py                # Regex and deterministic text parsing engine
│   ├── main.py                     # FastAPI application endpoints
│   ├── mock_blacklist.json         # Mock central debarment registry data
│   ├── mock_gst.json               # Mock GSTIN registry data
│   ├── mock_itr.json               # Mock Income Tax Return registry data
│   ├── mock_oem.json               # Mock OEM authorization database
│   ├── mock_pan.json               # Mock Income Tax PAN registry data
│   ├── mock_udyam.json             # Mock MSME Udyam registry data
│   └── requirements.txt            # Python dependencies
├── backend/                        # Node.js Express REST API backend
│   ├── .env.example                # Backend environment configuration template
│   ├── db.js                       # PostgreSQL connection pool
│   ├── package.json                # Node.js backend dependencies and scripts
│   ├── server.js                   # Express server entry point
│   ├── controllers/                # Business logic controllers
│   │   ├── bidderController.js     # Bidder CRUD and summary aggregations
│   │   ├── complianceController.js # Compliance calculation and officer decision handler
│   │   ├── documentController.js   # Upload and AI verification dispatch
│   │   ├── requirementController.js# Tender requirement endpoints
│   │   └── tenderController.js     # Tender creation and intelligence signals
│   ├── routes/                     # Express route declarations
│   │   ├── bidderRoutes.js
│   │   ├── complianceRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── requirementRoutes.js
│   │   └── tenderRoutes.js
│   ├── services/                   # Core business computation engines
│   │   ├── complianceEngine.js     # Weighted scoring and risk classification
│   │   └── verificationConfig.js   # Requirement-to-endpoint mappings
│   └── uploads/                    # Runtime upload directory (.gitkeep tracked, PDFs ignored)
├── database/                       # PostgreSQL database scripts
│   ├── schema.sql                  # Complete DDL table schema and indexes
│   └── seed.sql                    # Initial demo procurement data
├── demo-documents/                 # Safe mock test PDFs for evaluation
│   ├── ABC-Industries/             # Compliant bidder test document
│   ├── XYZ-Enterprises/            # Expiring OEM bidder test document
│   ├── TechPro-Solutions/          # High-risk discrepancy bidder test document
│   ├── demo_tender_specification.pdf# Sample GeM tender specification document
│   ├── generate_demo_pdfs.py       # Python script to regenerate mock PDFs
│   └── README.md                   # Guide to demo documents and expected results
└── frontend/                       # React 19 + Vite frontend
    ├── .env.example                # Frontend environment configuration template
    ├── index.html                  # HTML entry point
    ├── package.json                # Frontend dependencies and scripts
    ├── vite.config.js              # Vite configuration
    └── src/
        ├── App.css                 # Application styling
        ├── App.jsx                 # Main user interface and workflow views
        ├── index.css               # Base CSS reset and design tokens
        ├── main.jsx                # React root bootstrap
        └── api/
            └── client.js           # Axios API client
```

---

## 5. Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **npm**: `v9.0.0` or higher
- **Python**: `3.10` to `3.14`
- **PostgreSQL**: `v14` or higher
- **Git**: Installed and configured

---

## 6. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd BigShield-AI
```

---

## 7. PostgreSQL Database Setup

Choose whichever method fits your environment best:

### Method 1 — Instant Setup with Docker (Fastest / No Local PostgreSQL Install Required)
If you or your collaborator have Docker installed, you do not need to install PostgreSQL at all:

```bash
docker compose up -d postgres
```
This automatically:
- Starts PostgreSQL 15 on port `5432`
- Creates the `bigshield` database
- Automatically runs `database/schema.sql` and `database/seed.sql` on first boot
- Set `DB_PASSWORD=password123` in your `backend/.env`

---

### Method 2 — Local PostgreSQL (psql / pgAdmin)

#### Step 1: Start PostgreSQL
Ensure your local PostgreSQL server service is running.

#### Step 2: Create the Database
Open your terminal (or `psql` shell) and create the `bigshield` database:

```sql
-- Using psql command line:
psql -U postgres
```

Inside the PostgreSQL prompt:
```sql
CREATE DATABASE bigshield;
\q
```

#### Step 3: Run Schema and Seed Data
Execute the database schema followed by the demo seed data:

**Option A — Using `psql` directly:**
```bash
psql -U postgres -d bigshield -f database/schema.sql
psql -U postgres -d bigshield -f database/seed.sql
```

**Option B — On Windows PowerShell:**
```powershell
Get-Content database/schema.sql | psql -U postgres -d bigshield
Get-Content database/seed.sql | psql -U postgres -d bigshield
```

**Option C — Using pgAdmin / DBeaver:**
1. Open your database management tool.
2. Connect to your PostgreSQL server.
3. Open a Query Tool on database `bigshield`.
4. Run the contents of `database/schema.sql`.
5. Run the contents of `database/seed.sql`.

---

### Method 3 — Free Cloud Database (Neon / Supabase / Aiven)
If you do not want to install any software locally:
1. Create a free PostgreSQL instance on [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Paste and run `database/schema.sql` and `database/seed.sql` in the cloud SQL Editor.
3. Put the cloud credentials in `backend/.env`.

---

## 8. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file from `.env.example`:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env

   # Linux / macOS:
   cp .env.example .env
   ```

4. Open `backend/.env` in your editor and enter your local PostgreSQL credentials:
   ```env
   PORT=5000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=bigshield
   DB_PASSWORD=your_actual_postgres_password
   DB_PORT=5432
   AI_SERVICE_URL=http://localhost:8000
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```

   The backend will be live at: **`http://localhost:5000`**
   Test connection: Open `http://localhost:5000/db-test` in your browser.

---

## 9. AI Microservice Setup

1. Open a new terminal and navigate to `ai-service`:
   ```bash
   cd ai-service
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the FastAPI microservice:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The AI service will be live at: **`http://localhost:8000`**
   Interactive Swagger API Documentation: **`http://localhost:8000/docs`**

---

## 10. Frontend Setup

1. Open a third terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create `frontend/.env` if you need to point to a custom backend URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

   The web application will be accessible at: **`http://localhost:5173`**

---

## 11. Running All Services Together

To run the complete BigShield AI platform locally, keep three terminals open:

| Service | Working Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **1. AI Microservice** | `ai-service/` | `uvicorn main:app --reload --port 8000` | `http://localhost:8000` |
| **2. Backend API** | `backend/` | `npm run dev` | `http://localhost:5000` |
| **3. Frontend App** | `frontend/` | `npm run dev` | `http://localhost:5173` |

---

## 12. Demo Credentials

When opening the frontend at `http://localhost:5173`, sign in using the pre-seeded officer credentials:

- **Official Email**: `officer@bigshield.ai`
- **Password**: `password123`
- **Role**: Procurement Officer

---

## 13. End-to-End Demo Workflow

1. **Sign In**: Log into the application using the demo officer credentials.
2. **Select Tender**: Select tender `GEM/2026/SAFETY/001` (*Industrial Safety Equipment Procurement*) from the header dropdown.
3. **Inspect Requirements**: View the 8 configured tender requirements (weights and mandatory flags).
4. **Select Bidder**: Select a bidder from the evaluation list (e.g., **ABC Industries**).
5. **Upload Verification Evidence**:
   - In the bidder casefile, choose a requirement type (e.g., `GST Registration`).
   - Choose `demo-documents/ABC-Industries/demo_abc_compliance_doc.pdf`.
   - Click **Upload Document**.
6. **Trigger AI Verification**: Click **Verify** next to the uploaded document. The backend dispatches the document to the AI microservice, parses the PDF, extracts fields, and cross-references them against the registry.
7. **Perform Blacklist Check**: Click **Run Blacklist Check** to query the central debarment registry for the bidder.
8. **Inspect Evidence & Discrepancies**: Review extracted values vs. verified registry values, confidence scores, and discrepancy warnings.
9. **Review Real-Time Score**: Observe the dynamic recalculation of the compliance score (0–100%) and updated risk tier (**LOW**, **MEDIUM**, or **HIGH**).
10. **Tender Intelligence Signals**: View cross-bidder signals on the dashboard (e.g., duplicate GSTIN/PAN detection across competing bidders).
11. **Officer Final Decision**: Enter officer remarks in the decision box and submit a formal decision: `ACCEPT`, `REVIEW`, or `REJECT`.
12. **Audit Register**: View the updated decision register and bidder summary reflecting the final determination.

---

## 14. Demo Bidders & Expected Test Outcomes

The platform includes three distinct bidder profiles to demonstrate different procurement scenarios:

### 1. ABC Industries (Compliant Profile)
- **GSTIN**: `07ABCDE1234F1Z5` (Active)
- **PAN**: `ABCDE1234F` (Active)
- **ITR**: Filed, Turnover ₹8.40 Cr
- **OEM Authorization**: Valid (`OEM-ABC-2026-001`, expires 2027-08-30)
- **Local Content**: 72% (exceeds 60% requirement)
- **Experience**: 8 Years (exceeds 5-year requirement)
- **Debarment**: Clear
- **Expected Outcome**: **LOW RISK / Score: ~100% / Recommendation: PASS**

### 2. XYZ Enterprises (Review Required Profile)
- **GSTIN**: `07XYZDE5678G1Z2` (Active)
- **PAN**: `XYZDE5678G` (Active)
- **ITR**: Filed, Turnover ₹6.90 Cr
- **OEM Authorization**: `OEM-XYZ-2026-002` (Expires 2026-10-15 — **EXPIRING SOON**)
- **Local Content**: 65% (meets requirement)
- **Expected Outcome**: **MEDIUM RISK / Recommendation: REVIEW REQUIRED** (Alerts the officer that OEM authorization needs extension).

### 3. TechPro Solutions (High Risk / Flagged Profile)
- **GSTIN**: `07TECHP9012H1Z8`
- **PAN**: `TECHP9012H`
- **ITR**: **NOT FILED** (Turnover ₹0)
- **OEM Authorization**: `OEM-TECH-2026-003` (**EXPIRED / INVALID**)
- **Local Content**: 45% (violates 60% threshold)
- **Debarment**: **BLACKLISTED** in central registry
- **Expected Outcome**: **HIGH RISK / Score: <50% / Mandatory Failure / Recommendation: FLAG FOR REVIEW / REJECT**

---

## 15. API Reference

### Backend Endpoints (`http://localhost:5000`)

#### Tenders
- `GET /api/tenders` — List all tenders.
- `POST /api/tenders/upload` — Upload tender specification PDF and auto-extract requirements (`multipart/form-data`).
- `GET /api/tenders/:tenderId/intelligence` — Retrieve cross-bidder anomaly signals and identity collisions.

#### Requirements
- `GET /api/requirements/:tenderId` — Retrieve all requirements for a specific tender.

#### Bidders
- `GET /api/bidders/:tenderId` — List bidders for a tender.
- `POST /api/bidders` — Create a new bidder (`tenderId`, `companyName`, `gstin`, `pan`).
- `GET /api/bidders/:tenderId/summary` — Get compliance status and score summaries for all bidders.
- `POST /api/bidders/:bidderId/verify-blacklist` — Trigger central blacklist check for a bidder.

#### Documents & Verification
- `POST /api/documents/upload` — Upload a document PDF for a bidder (`bidderId`, `documentType`, `document`).
- `GET /api/documents/bidder/:bidderId` — List all uploaded documents for a bidder.
- `POST /api/documents/:documentId/verify-gst` — Execute GST verification.
- `POST /api/documents/:documentId/verify-pan` — Execute PAN verification.
- `POST /api/documents/:documentId/verify-itr` — Execute ITR and turnover verification.
- `POST /api/documents/:documentId/verify-oem` — Execute OEM authorization verification.
- `POST /api/documents/:documentId/verify-local-content` — Execute local content verification.
- `POST /api/documents/:documentId/verify-experience` — Execute experience verification.
- `POST /api/documents/:documentId/verify-udyam` — Execute MSME Udyam verification.

#### Compliance & Decisions
- `GET /api/compliance/bidder/:bidderId` — Generate detailed bidder compliance report and evidence list.
- `POST /api/compliance/bidder/:bidderId/decision` — Submit officer decision (`ACCEPT`, `REVIEW`, `REJECT` + `remarks`).

---

### AI Service Endpoints (`http://localhost:8000`)

- `GET /` — Microservice health status.
- `POST /extract` — Parse PDF text and extract all identified fields.
- `POST /verify-gst` — Verify GSTIN from JSON payload.
- `POST /verify-gst-document` — Extract and verify GSTIN directly from PDF file.
- `POST /verify-pan-document` — Extract and verify PAN directly from PDF file.
- `POST /verify-itr-document` — Extract turnover and cross-verify with ITR filing records.
- `POST /verify-oem-document` — Extract certificate number and verify authorization status and expiry.
- `POST /verify-local-content-document` — Extract local content % and check against threshold.
- `POST /verify-experience-document` — Extract experience years and project counts.
- `POST /verify-udyam-document` — Extract Udyam registration number and verify active status.
- `POST /verify-blacklist` — Query debarment status by company name.

---

## 16. Verification Architecture: Extraction vs. Verification

A foundational design principle of BigShield AI is that **Document Extraction is fundamentally distinct from Compliance Verification**:

1. **Extraction (What the bidder claims)**:
   - Ingests raw document formats (PDFs).
   - Uses text parsing and expression matchers to extract claimed GSTIN, PAN, turnover figures, OEM certificate IDs, and content percentages.
2. **Verification (What authoritative systems state)**:
   - Queries verified registries and rule configurations independently using the extracted keys.
   - Evaluates whether the claimed entity is active, in good standing, and meets tender criteria.
3. **Cross-Document Consistency**:
   - Detects when a bidder submits conflicting values across different certificates (e.g., PAN in ITR certificate differing from PAN in GST registration).
4. **Deterministic Scoring**:
   - Scores are computed through a strict mathematical model based on requirement weights and mandatory flags, completely eliminating non-deterministic AI scoring variance.

---

## 17. Security & Privacy

- **No Secrets Committed**: All database credentials and ports are loaded via environment variables (`.env`).
- **Git Ignored**: `.env`, `node_modules/`, `venv/`, and runtime `backend/uploads/` are strictly ignored by `.gitignore`.
- **Synthetic Data**: All demo records, documents, and mock registries use fabricated, non-confidential test identifiers.
- **Upload Isolation**: Uploaded files are restricted to PDF formats with strict 10 MB payload limits.
- **Production Preparedness**: In production environments, database passwords should be rotated regularly, API keys managed in a key vault (e.g., AWS Secrets Manager / HashiCorp Vault), and HTTPS enforced.

---

## 18. Current MVP Limitations

- **Simulated Verification Connectors**: This MVP uses local mock registries (`mock_*.json`) to demonstrate the complete end-to-end verification and discrepancy lifecycle without incurring costs or requiring official government API authorization.
- **Text-Based PDF Extraction**: Document extraction is currently optimized for digital, text-based PDFs. Scanned image PDFs require an OCR preprocessing pipeline (e.g., Tesseract or Google Cloud Vision).
- **Authentication**: Uses a single demo officer role for evaluation purposes; enterprise RBAC with multi-factor authentication (MFA) would be required for full production deployment.

---

## 19. Future Scope

- **Official Government API Integrations**: Live, authorized connectors to the GSTN API, Income Tax Department e-Filing API, Udyam Verification API, and Ministry of Corporate Affairs (MCA21) database.
- **Advanced Optical Character Recognition (OCR)**: Multilingual OCR pipeline for regional language certificates and scanned seal/signature extraction.
- **Digital Signature (PKI) Validation**: Native cryptographic validation of DSCs (Digital Signature Certificates) embedded within tender PDFs.
- **Forensic Document Tampering Analysis**: Metadata inspection, font disparity detection, and EXIF forensic checks to detect edited or photoshopped certificates.
- **Cross-Tender Bidder Intelligence**: Historical bid tracking across multiple GeM tenders to identify cartel formation, circular bidding, and shell company networks.
- **Scalable Asynchronous Queue**: Background processing with Celery/Redis for batch processing thousands of bids simultaneously.