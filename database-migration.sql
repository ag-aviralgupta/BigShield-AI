-- Run once against the existing bigshield PostgreSQL database.
-- Existing tables are preserved; this only adds officer decision storage.
CREATE TABLE IF NOT EXISTS officer_decisions (
  id SERIAL PRIMARY KEY,
  bidder_id INTEGER REFERENCES bidders(id) ON DELETE CASCADE,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('ACCEPT', 'REVIEW', 'REJECT')),
  remarks TEXT,
  officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE verification_results
  ADD COLUMN IF NOT EXISTS extracted_fields JSONB DEFAULT '{}'::jsonb;
