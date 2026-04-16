-- Phase 1.7: Admin-managed access workflow
-- Date: 2026-04-16

CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_pending_email
  ON public.access_requests (LOWER(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_access_requests_status_created
  ON public.access_requests (status, created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_requests_admin_select" ON public.access_requests;
CREATE POLICY "access_requests_admin_select"
  ON public.access_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "access_requests_admin_update" ON public.access_requests;
CREATE POLICY "access_requests_admin_update"
  ON public.access_requests
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "access_requests_admin_delete" ON public.access_requests;
CREATE POLICY "access_requests_admin_delete"
  ON public.access_requests
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- Bootstrap requested platform admin account
UPDATE public.profiles
SET is_platform_admin = TRUE
WHERE LOWER(email) = 'smontes@ilerna.com';
