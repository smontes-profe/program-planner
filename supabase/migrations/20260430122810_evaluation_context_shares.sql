-- Read-only invitations for evaluation contexts.

CREATE TABLE IF NOT EXISTS public.evaluation_context_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES public.evaluation_contexts(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (context_id, invited_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_context_shares_context
  ON public.evaluation_context_shares(context_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_context_shares_invited_profile
  ON public.evaluation_context_shares(invited_profile_id);

ALTER TABLE public.evaluation_context_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecs_select_owner_or_invited" ON public.evaluation_context_shares;
CREATE POLICY "ecs_select_owner_or_invited" ON public.evaluation_context_shares
  FOR SELECT TO authenticated
  USING (
    invited_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.evaluation_contexts ec
      WHERE ec.id = evaluation_context_shares.context_id
        AND (
          ec.created_by_profile_id = auth.uid()
          OR public.is_platform_admin()
        )
    )
  );

DROP POLICY IF EXISTS "ecs_insert_owner" ON public.evaluation_context_shares;
CREATE POLICY "ecs_insert_owner" ON public.evaluation_context_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.evaluation_contexts ec
      WHERE ec.id = evaluation_context_shares.context_id
        AND (
          ec.created_by_profile_id = auth.uid()
          OR public.is_platform_admin()
        )
    )
  );

DROP POLICY IF EXISTS "ecs_delete_owner" ON public.evaluation_context_shares;
CREATE POLICY "ecs_delete_owner" ON public.evaluation_context_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evaluation_contexts ec
      WHERE ec.id = evaluation_context_shares.context_id
        AND (
          ec.created_by_profile_id = auth.uid()
          OR public.is_platform_admin()
        )
    )
  );
