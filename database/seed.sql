-- =============================================================================
-- BIGSHIELD AI - Safe Demo Seed Data
-- Creates baseline demonstration records for GeM procurement verification
-- =============================================================================

-- 1. Demo Officer Account
INSERT INTO users (name, email, password, role)
VALUES ('Demo Procurement Officer', 'officer@bigshield.ai', 'password123', 'OFFICER')
ON CONFLICT (email) DO NOTHING;

-- 2. Demo Tender
INSERT INTO tenders (title, tender_number, description)
VALUES (
    'Industrial Safety Equipment Procurement',
    'GEM/2026/SAFETY/001',
    'Procurement of industrial safety equipment and gear from eligible and compliant manufacturers.'
)
ON CONFLICT (tender_number) DO NOTHING;

-- 3. Tender Requirements (8 core procurement compliance checks)
INSERT INTO requirements (tender_id, name, mandatory, weight)
SELECT id, val.name, val.mandatory, val.weight
FROM tenders
CROSS JOIN (
    VALUES
        ('GST Registration', true, 20),
        ('PAN', true, 10),
        ('ITR', true, 20),
        ('OEM Authorization', true, 15),
        ('Local Content', true, 15),
        ('Experience', true, 5),
        ('Blacklisting Status', true, 5),
        ('Udyam Registration', false, 10)
) AS val(name, mandatory, weight)
WHERE tender_number = 'GEM/2026/SAFETY/001'
  AND NOT EXISTS (
      SELECT 1 FROM requirements r
      WHERE r.tender_id = tenders.id AND r.name = val.name
  );

-- 4. Demo Bidders (Low, Medium, and High Risk demonstration profiles)
INSERT INTO bidders (tender_id, company_name, gstin, pan)
SELECT id, val.company_name, val.gstin, val.pan
FROM tenders
CROSS JOIN (
    VALUES
        ('ABC Industries', '07ABCDE1234F1Z5', 'ABCDE1234F'),
        ('XYZ Enterprises', '07XYZDE5678G1Z2', 'XYZDE5678G'),
        ('TechPro Solutions', '07TECHP9012H1Z8', 'TECHP9012H')
) AS val(company_name, gstin, pan)
WHERE tender_number = 'GEM/2026/SAFETY/001'
  AND NOT EXISTS (
      SELECT 1 FROM bidders b
      WHERE b.tender_id = tenders.id AND b.company_name = val.company_name
  );
