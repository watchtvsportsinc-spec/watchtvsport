BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Human-approved social publishing support.
-- This migration deliberately does not create a cron job and keeps automation disabled.
-- Apply only after the V2 foundation/read migrations are present.

CREATE TABLE IF NOT EXISTS public.social_automation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  lead_minutes integer NOT NULL DEFAULT 180 CHECK (lead_minutes BETWEEN 15 AND 1440),
  queue_window_minutes integer NOT NULL DEFAULT 10 CHECK (queue_window_minutes BETWEEN 5 AND 60),
  catchup_minutes integer NOT NULL DEFAULT 30 CHECK (catchup_minutes BETWEEN 0 AND 180),
  max_posts_per_run integer NOT NULL DEFAULT 20 CHECK (max_posts_per_run BETWEEN 1 AND 100),
  site_base_url text NOT NULL DEFAULT 'https://watchtvsport.com' CHECK (site_base_url ~ '^https://(www\.)?watchtvsport\.com$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.social_automation_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'x' CHECK (platform = 'x'),
  cadence_key text NOT NULL CHECK (cadence_key ~ '^[a-z0-9_-]{2,40}$'),
  scheduled_at timestamptz NOT NULL,
  event_date timestamptz NOT NULL,
  event_title text NOT NULL CHECK (char_length(event_title) BETWEEN 1 AND 240),
  competition_name text NOT NULL CHECK (char_length(competition_name) BETWEEN 1 AND 160),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 260),
  event_url text NOT NULL CHECK (event_url ~ '^https://(www\.)?watchtvsport\.com/'),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','notification_failed','notified','opened','handed_off','skipped')),
  approval_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_expires_at timestamptz NOT NULL,
  notified_at timestamptz,
  opened_at timestamptz,
  handed_off_at timestamptz,
  notification_attempts smallint NOT NULL DEFAULT 0 CHECK (notification_attempts BETWEEN 0 AND 20),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, platform, cadence_key)
);

CREATE INDEX IF NOT EXISTS social_posts_due_idx
  ON public.social_posts (scheduled_at, status)
  WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS social_posts_event_idx
  ON public.social_posts (event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://'),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 256),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 8 AND 128),
  user_agent text,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.social_automation_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.social_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.social_push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.social_automation_settings TO service_role;
GRANT ALL ON TABLE public.social_posts TO service_role;
GRANT ALL ON TABLE public.social_push_subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.get_social_due_events(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  event_id uuid,
  event_date timestamptz,
  event_title text,
  competition_name text,
  competition_slug text,
  sport_slug text,
  participant1_name text,
  participant2_name text,
  session_label text,
  detail_path text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
  SELECT
    e.id,
    e.event_date,
    COALESCE(
      event_page.title,
      CASE
        WHEN home_participant.id IS NOT NULL AND away_participant.id IS NOT NULL
          THEN home_participant.name || ' vs ' || away_participant.name
        WHEN e.session_label IS NOT NULL
          THEN initcap(replace(e.slug, '-', ' ')) || ' - ' || e.session_label
        ELSE initcap(replace(e.slug, '-', ' '))
      END
    ) AS event_title,
    COALESCE(c.display_name, c.name) AS competition_name,
    c.slug AS competition_slug,
    s.public_slug AS sport_slug,
    home_participant.name AS participant1_name,
    away_participant.name AS participant2_name,
    e.session_label,
    CASE
      WHEN page_url.url_path IS NOT NULL THEN page_url.url_path || '?event=' || e.id::text
      WHEN event_url.url_path IS NOT NULL THEN event_url.url_path
      ELSE '/event/' || e.slug
    END AS detail_path
  FROM public.events e
  JOIN public.sports s ON s.id = e.sport_id
  JOIN public.competitions c ON c.id = e.competition_id
  LEFT JOIN public.participants home_participant ON home_participant.id = e.home_participant_id
  LEFT JOIN public.participants away_participant ON away_participant.id = e.away_participant_id
  LEFT JOIN public.event_pages event_page ON event_page.id = e.event_page_id
  LEFT JOIN LATERAL (
    SELECT u.url_path
    FROM public.event_page_urls u
    WHERE u.event_page_id = e.event_page_id
      AND u.kind = 'canonical'
      AND u.is_active = true
    ORDER BY u.created_at, u.id
    LIMIT 1
  ) page_url ON true
  LEFT JOIN LATERAL (
    SELECT u.url_path
    FROM public.event_urls u
    WHERE u.event_id = e.id
      AND u.kind = 'canonical'
      AND u.is_active = true
    ORDER BY u.created_at, u.id
    LIMIT 1
  ) event_url ON true
  WHERE e.is_published = true
    AND e.verification_status = 'confirmed'
    AND e.status = 'scheduled'
    AND e.event_date IS NOT NULL
    AND e.event_date >= p_from
    AND e.event_date < p_to
    AND s.is_enabled = true
    AND c.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.event_broadcasts eb
      JOIN public.broadcasters b ON b.id = eb.broadcaster_id
      LEFT JOIN public.platforms p ON p.id = eb.platform_id
      WHERE eb.event_id = e.id
        AND eb.is_published = true
        AND eb.verification_status = 'confirmed'
        AND eb.decision = 'included'
        AND eb.access_type IN ('Free', 'Paid')
        AND COALESCE(eb.official_url, p.url, b.website_url) ~ '^https://'
    )
  ORDER BY e.event_date, e.id
  LIMIT 200;
$function$;

COMMENT ON FUNCTION public.get_social_due_events(timestamptz, timestamptz) IS
  'Internal list of confirmed scheduled events with at least one public confirmed broadcast offer, for human-approved social publishing.';

REVOKE ALL ON FUNCTION public.get_social_due_events(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_due_events(timestamptz, timestamptz) TO service_role;

COMMIT;
