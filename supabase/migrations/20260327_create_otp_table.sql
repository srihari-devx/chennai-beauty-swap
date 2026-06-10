-- =============================================
-- SECURITY FIX: OTP table with hashed storage
-- Run this migration to apply security fixes
-- =============================================

-- C-3 FIX: Rename otp (plaintext) column to otp_hash and add failed_attempts tracking
-- M-1 FIX: Add failed_attempts column for brute-force protection

-- If upgrading from old schema, use this:
ALTER TABLE IF EXISTS otp_verifications
  RENAME COLUMN otp TO otp_hash;

ALTER TABLE IF EXISTS otp_verifications
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

-- Or create fresh (if table doesn't exist):
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,            -- C-3: SHA-256 hash of the OTP, never plaintext
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,  -- M-1: track brute-force attempts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);

-- Auto-cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (verified = TRUE AND created_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (Edge Functions use service role)
-- No RLS policies needed for anon/authenticated users since they go through Edge Functions
