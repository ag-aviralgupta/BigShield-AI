-- =============================================================================
-- BIGSHIELD AI - PostgreSQL Database Schema
-- AI-Powered Bid Compliance Verification Platform for GeM Procurement
-- =============================================================================

-- 1. Users Table (Procurement Officers and Reviewers)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tenders Table
CREATE TABLE IF NOT EXISTS tenders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    tender_number VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tender Requirements Table
CREATE TABLE IF NOT EXISTS requirements (
    id SERIAL PRIMARY KEY,
    tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    mandatory BOOLEAN DEFAULT TRUE,
    weight INTEGER DEFAULT 0
);

-- 4. Bidders Table
CREATE TABLE IF NOT EXISTS bidders (
    id SERIAL PRIMARY KEY,
    tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Uploaded Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Verification Results Table (stores extraction + verification evidence)
CREATE TABLE IF NOT EXISTS verification_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    requirement_id INTEGER REFERENCES requirements(id) ON DELETE CASCADE,
    submitted_value TEXT,
    verified_value TEXT,
    status VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2),
    reason TEXT,
    extracted_fields JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Officer Decisions Table (Audit trail of final determinations)
CREATE TABLE IF NOT EXISTS officer_decisions (
    id SERIAL PRIMARY KEY,
    bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('ACCEPT', 'REVIEW', 'REJECT')),
    remarks TEXT,
    officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_requirements_tender ON requirements(tender_id);
CREATE INDEX IF NOT EXISTS idx_bidders_tender ON bidders(tender_id);
CREATE INDEX IF NOT EXISTS idx_documents_bidder ON documents(bidder_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_doc ON verification_results(document_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_req ON verification_results(requirement_id);
CREATE INDEX IF NOT EXISTS idx_officer_decisions_bidder ON officer_decisions(bidder_id);
