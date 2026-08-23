-- ============================================================
-- SECURITY AUDIT 3 — FIXES
-- Resolves Findings: 1 (Notification Authorization), 4 (Storage Cleanup Tracking),
-- 6 (Product View Deduplication), 9 (Privileged Administration Audit Logging)
-- Run in Supabase Dashboard SQL Editor AFTER all previous migrations
-- Date: 2026-08-23
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- FINDING 9 FIX: Immutable Admin Audit Logging Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'delete_user', 'grant_admin', 'revoke_admin', 'grant_badge', 'revoke_badge', 'delete_product', 'storage_cleanup'
  target_user_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins & Service Role can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- No updates or deletes allowed on audit logs (immutable)
DROP POLICY IF EXISTS "No one can update audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.admin_audit_log;


-- ═══════════════════════════════════════════════════════════
-- FINDING 1 FIX: Server-Validated Notification Routines (SECURITY DEFINER)
-- Prevents cross-user notification spoofing & phishing
-- ═══════════════════════════════════════════════════════════

-- Drop client-side unrestricted insert policies
DROP POLICY IF EXISTS "Authenticated users can insert own-context notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- Only Admins can insert notifications directly from client
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- SECURITY DEFINER RPC to send verified chat message notifications
-- Validates caller is participant of the chat before creating notification
CREATE OR REPLACE FUNCTION public.send_chat_notification(
  p_chat_id UUID,
  p_preview_text TEXT DEFAULT 'You have a new message. Open the chat to read it.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat RECORD;
  v_caller_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_notification_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in';
  END IF;

  -- 1. Validate chat exists and caller is a participant
  SELECT id, buyer_id, seller_id INTO v_chat
  FROM public.chats
  WHERE id = p_chat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  IF v_chat.buyer_id != v_caller_id AND v_chat.seller_id != v_caller_id THEN
    RAISE EXCEPTION 'Forbidden: You are not a participant in this chat';
  END IF;

  -- 2. Determine recipient (the other participant)
  IF v_chat.buyer_id = v_caller_id THEN
    v_recipient_id := v_chat.seller_id;
  ELSE
    v_recipient_id := v_chat.buyer_id;
  END IF;

  -- 3. Fetch sender display name
  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.profiles
  WHERE user_id = v_caller_id;

  IF v_sender_name IS NULL THEN
    v_sender_name := 'Someone';
  END IF;

  -- 4. Insert notification for recipient
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    is_read,
    created_at
  ) VALUES (
    v_recipient_id,
    'message',
    'New message from ' || v_sender_name,
    COALESCE(p_preview_text, 'You have a new message. Open the chat to read it.'),
    p_chat_id::TEXT,
    FALSE,
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'recipient_id', v_recipient_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_notification(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_chat_notification(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_chat_notification(UUID, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- FINDING 6 FIX: Product-View Inflation Protection
-- Deduplicates views per (product_id, viewer_id)
-- ═══════════════════════════════════════════════════════════

-- Deduplicate existing rows first
DELETE FROM public.product_views a USING public.product_views b
WHERE a.id > b.id 
  AND a.product_id = b.product_id 
  AND a.viewer_id = b.viewer_id 
  AND a.viewer_id IS NOT NULL;

-- Unique partial index to prevent same user inflating view counts
CREATE UNIQUE INDEX IF NOT EXISTS product_views_unique_viewer_per_product
  ON public.product_views (product_id, viewer_id)
  WHERE viewer_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════
-- FINDING 4 & 9: Enhanced Admin Cascade Deletion with Audit Log
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  product_ids UUID[];
  chat_ids UUID[];
  deleted_user_email TEXT;
  deleted_user_name TEXT;
BEGIN
  -- 1. Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- 2. Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account via admin panel.';
  END IF;

  -- 3. Capture profile/email info for audit log before deletion
  SELECT full_name INTO deleted_user_name
  FROM public.profiles
  WHERE user_id = target_user_id;

  -- 4. Collect product IDs for cascading
  SELECT ARRAY_AGG(id) INTO product_ids
  FROM public.products
  WHERE seller_id = target_user_id;

  -- 5. Delete product-related data
  IF product_ids IS NOT NULL AND array_length(product_ids, 1) > 0 THEN
    DELETE FROM public.product_views WHERE product_id = ANY(product_ids);
    DELETE FROM public.product_reports WHERE product_id = ANY(product_ids);
    DELETE FROM public.wishlists WHERE product_id = ANY(product_ids);

    -- Delete chats and messages for user's products
    SELECT ARRAY_AGG(id) INTO chat_ids
    FROM public.chats
    WHERE product_id = ANY(product_ids);

    IF chat_ids IS NOT NULL AND array_length(chat_ids, 1) > 0 THEN
      DELETE FROM public.messages WHERE chat_id = ANY(chat_ids);
    END IF;

    DELETE FROM public.chats WHERE product_id = ANY(product_ids);
    DELETE FROM public.products WHERE seller_id = target_user_id;
  END IF;

  -- 6. Delete user's buyer chats and their messages
  SELECT ARRAY_AGG(id) INTO chat_ids
  FROM public.chats
  WHERE buyer_id = target_user_id;

  IF chat_ids IS NOT NULL AND array_length(chat_ids, 1) > 0 THEN
    DELETE FROM public.messages WHERE chat_id = ANY(chat_ids);
    DELETE FROM public.chats WHERE buyer_id = target_user_id;
  END IF;

  -- 7. Delete user-specific data
  DELETE FROM public.wishlists WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.ratings WHERE rater_id = target_user_id;
  DELETE FROM public.ratings WHERE seller_id = target_user_id;
  DELETE FROM public.seller_badges WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- 8. Delete profile
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- 9. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 10. Record immutable audit log entry
  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    auth.uid(),
    'delete_user',
    target_user_id,
    jsonb_build_object(
      'deleted_user_name', deleted_user_name,
      'product_count', COALESCE(array_length(product_ids, 1), 0),
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_cascade(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user_cascade(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_cascade(UUID) TO authenticated;
