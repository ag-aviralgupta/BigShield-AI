-- BIGSHIELD AI local PostgreSQL bootstrap and SIH demo data.
-- Run this once: psql -U postgres -d bigshield -f database-setup.sql
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'OFFICER', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tenders (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, tender_number VARCHAR(100) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS requirements (id SERIAL PRIMARY KEY, tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE, name VARCHAR(150) NOT NULL, description TEXT, mandatory BOOLEAN DEFAULT TRUE, weight INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS bidders (id SERIAL PRIMARY KEY, tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE, company_name VARCHAR(255) NOT NULL, gstin VARCHAR(50), pan VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE, document_type VARCHAR(100) NOT NULL, file_name VARCHAR(255), file_path TEXT, uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS verification_results (id SERIAL PRIMARY KEY, document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE, requirement_id INTEGER REFERENCES requirements(id) ON DELETE CASCADE, submitted_value TEXT, verified_value TEXT, status VARCHAR(50) NOT NULL, confidence DECIMAL(5,2), reason TEXT, extracted_fields JSONB DEFAULT '{}'::jsonb, verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS officer_decisions (id SERIAL PRIMARY KEY, bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE, decision VARCHAR(20) NOT NULL CHECK (decision IN ('ACCEPT','REVIEW','REJECT')), remarks TEXT, officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

INSERT INTO users (name,email,password,role) VALUES ('Demo Procurement Officer','officer@bigshield.ai','password123','OFFICER') ON CONFLICT (email) DO NOTHING;
INSERT INTO tenders (title,tender_number,description) VALUES ('Industrial Safety Equipment Procurement','GEM/2026/SAFETY/001','Procurement of industrial safety equipment from eligible bidders.') ON CONFLICT (tender_number) DO NOTHING;

INSERT INTO requirements (tender_id,name,mandatory,weight)
SELECT id, values.name, values.mandatory, values.weight FROM tenders CROSS JOIN (VALUES
 ('GST Registration',true,20),('PAN',true,10),('ITR',true,20),('OEM Authorization',true,15),('Local Content',true,15),('Experience',true,5),('Blacklisting Status',true,5),('Udyam Registration',false,10)
) AS values(name,mandatory,weight) WHERE tender_number='GEM/2026/SAFETY/001' AND NOT EXISTS (SELECT 1 FROM requirements r WHERE r.tender_id=tenders.id AND r.name=values.name);

INSERT INTO bidders (tender_id,company_name,gstin,pan)
SELECT id, values.company_name, values.gstin, values.pan FROM tenders CROSS JOIN (VALUES
 ('ABC Industries','07ABCDE1234F1Z5','ABCDE1234F'),('XYZ Enterprises','07XYZDE5678G1Z2','XYZDE5678G'),('TechPro Solutions','07TECHP9012H1Z8','TECHP9012H')
) AS values(company_name,gstin,pan) WHERE tender_number='GEM/2026/SAFETY/001' AND NOT EXISTS (SELECT 1 FROM bidders b WHERE b.tender_id=tenders.id AND b.company_name=values.company_name);
