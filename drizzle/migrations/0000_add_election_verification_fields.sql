ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS election_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS filing_instruction text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

UPDATE public.races
SET is_verified = true,
    election_type = 'primary',
    filing_instruction = CASE
      WHEN office_description ~* 'Vote For (One|1)' THEN 'Vote for one'
      WHEN office_description ~* 'Vote For (Two|2)' THEN 'Vote for two'
      ELSE NULL
    END,
    verified_at = COALESCE(verified_at, now())
WHERE office_description ILIKE '%Roster imported from Somerset County Clerk 2026 Somerset County Primary Candidates PDF%';

UPDATE public.candidates c
SET is_verified = true,
    verified_at = COALESCE(c.verified_at, now())
FROM public.races r
WHERE c.race_id = r.id
  AND r.is_verified = true;

ALTER TABLE public.races
  ADD CONSTRAINT races_election_type_valid
  CHECK (election_type IN ('primary', 'general', 'special', 'unknown'));

ALTER TABLE public.position_claims
  ADD CONSTRAINT position_claims_status_valid
  CHECK (status IN ('Draft', 'Approved', 'Rejected')),
  ADD CONSTRAINT position_claims_confidence_valid
  CHECK (confidence IN ('High', 'Medium', 'Low', 'No Clear Position')),
  ADD CONSTRAINT approved_claims_require_source
  CHECK (status <> 'Approved' OR source_id IS NOT NULL);

DROP POLICY IF EXISTS "public read races" ON public.races;
CREATE POLICY "public read verified races"
ON public.races
FOR SELECT
TO public
USING (is_verified = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "public read candidates" ON public.candidates;
CREATE POLICY "public read verified candidates"
ON public.candidates
FOR SELECT
TO public
USING (is_verified = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "public read approved claims" ON public.position_claims;
CREATE POLICY "public read sourced approved claims"
ON public.position_claims
FOR SELECT
TO public
USING (
  (
    status = 'Approved'
    AND source_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sources s
      WHERE s.id = position_claims.source_id
        AND s.url IS NOT NULL
        AND btrim(s.url) <> ''
    )
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);