# Swaptics Production Deployment & Security Checklist

This document operationalizes release gates and cloud attestation steps identified in **Security Audit 3 (22 August 2026)**.

---

## 1. Supabase Edge Functions Inventory (Finding 2 Remediation)

> **CRITICAL:** Removing function files from Git does **not** remove them from deployed Supabase infrastructure. Follow these steps prior to release:

### Deployed Function Attestation
1. Run CLI inspection or navigate to **Supabase Dashboard → Edge Functions**:
   ```bash
   npx supabase functions list
   ```
2. Verify active function inventory contains **ONLY**:
   - `setup-admin` (active, audited)
   - `cleanup-user-storage` (active, admin-only storage purger)
3. **Undeploy Legacy Functions**:
   If `send-otp` or `delete-user` is listed in your project:
   ```bash
   npx supabase functions delete send-otp
   npx supabase functions delete delete-user
   ```
   Or delete directly via the dashboard: *Edge Functions → send-otp → Settings → Delete Function*.
4. **Secret & Credential Revocation**:
   - Check **Supabase Dashboard → Settings → Edge Functions → Secrets**.
   - Delete obsolete third-party credentials (e.g. legacy SMS/OTP API keys) to eliminate risk of cost abuse.
   - Retain only `ALLOWED_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Database Migration Deployment & Verification

Apply migration `supabase/migrations/20260823_security_audit3_fixes.sql` in SQL Editor:

### Post-Migration Verification Queries

```sql
-- 1. Verify Notifications RLS: Direct public/client insert must be blocked
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'notifications' AND cmd = 'INSERT';
-- Expected: Only "Admins can insert notifications" exists.

-- 2. Verify Product Views Deduplication Index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'product_views' AND indexname = 'product_views_unique_viewer_per_product';
-- Expected: Unique index on (product_id, viewer_id) WHERE viewer_id IS NOT NULL.

-- 3. Verify Admin Audit Log Table
SELECT table_name, rowsecurity 
FROM information_schema.tables 
JOIN pg_tables ON pg_tables.tablename = tables.table_name
WHERE table_name = 'admin_audit_log';
-- Expected: rowsecurity = true.

-- 4. Verify RPC permissions
SELECT proname, prosecdef, proacl 
FROM pg_proc 
WHERE proname IN ('send_chat_notification', 'admin_delete_user_cascade');
-- Expected: prosecdef = true (SECURITY DEFINER), public execution revoked, authenticated granted.
```

---

## 3. Storage Bucket Configuration (Finding 12 Remediation)

Configure the `product-images` bucket in **Supabase Dashboard → Storage → Buckets → product-images → Settings**:

- **Public Bucket**: Enabled (for CDN image delivery).
- **File Size Limit**: `5242880` bytes (5 MB).
- **Allowed MIME Types**: `image/jpeg, image/png, image/webp, image/avif`.

---

## 4. Release Gate Verification Checklist

| Check | Required State | Verified By |
|-------|----------------|-------------|
| Build | `npm run build` exits 0 | Automated CI |
| Lint | `npm run lint` 0 errors | Automated CI |
| Unit / Boundary Tests | `npm test` passes all tests | Automated CI |
| Dependencies | `npm audit --audit-level=high` clean | Automated CI |
| Legacy OTP | `send-otp` removed from Supabase | Manual Deployment Gate |
| CSP Headers | No `'unsafe-inline'` on `script-src` | Vercel Deployment Check |
