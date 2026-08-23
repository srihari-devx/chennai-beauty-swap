# Swaptics Storage Security & Upload Boundaries

**Finding 12 Remediation:** Establishing trusted server-side storage boundaries for file uploads.

---

## 1. Threat Model & Client-Side Limitations

Client-side file checks (in `src/pages/Sell.tsx`) enforce:
- Maximum file size: 5MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`
- Extension whitelist: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`

While these checks prevent accidental user errors and optimize network utilization, **client-side validation is not a security boundary**. Malicious actors can bypass browser logic and submit forged requests directly to storage APIs.

---

## 2. Server-Side Supabase Storage Bucket Policies

The `product-images` bucket must be configured with hard database-enforced RLS policies in Supabase Storage (`storage.objects` table):

### 1. File Size Limit
Set the bucket configuration `file_size_limit` to `5242880` (5MB). Any multipart payload exceeding 5MB is rejected at the HTTP API gateway before write.

### 2. Allowed MIME Types
Set `allowed_mime_types` to:
```
['image/jpeg', 'image/png', 'image/webp', 'image/avif']
```
Storage gateways validate the Content-Type header against this whitelist.

### 3. Folder-Level Owner RLS Policy
Uploads must enforce that authenticated users can only write to their own folder (`user_id/*`):

```sql
-- Authenticated users can only upload files to their own user directory
CREATE POLICY "Users can upload own product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete their own product images
CREATE POLICY "Users can delete own product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for product listing images
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');
```

---

## 3. Privileged Admin Storage Cleanup Workflow

Because regular administrative users cannot delete files owned by another user via client RLS policies, all cross-user storage purges (e.g. user deletion cascade) are executed via the dedicated `cleanup-user-storage` Edge Function utilizing the backend `SUPABASE_SERVICE_ROLE_KEY` and recording an audit trail in `admin_audit_log`.
