BEGIN;
SET LOCAL search_path = public, pg_catalog;

DO $$
DECLARE
  v_nba integer;
  v_nhl integer;
  v_nba_profiles integer;
  v_nhl_profiles integer;
  v_nba_memberships integer;
  v_nhl_memberships integer;
  v_missing_core integer;
BEGIN
  SELECT count(*) INTO v_nba
  FROM participants p JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='basketball' AND p.participant_type='franchise' AND p.is_active;

  SELECT count(*) INTO v_nhl
  FROM participants p JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='ice-hockey' AND p.participant_type='franchise' AND p.is_active;

  SELECT count(*) INTO v_nba_profiles
  FROM participant_profiles pp
  JOIN participants p ON p.id=pp.participant_id
  JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='basketball' AND p.participant_type='franchise';

  SELECT count(*) INTO v_nhl_profiles
  FROM participant_profiles pp
  JOIN participants p ON p.id=pp.participant_id
  JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='ice-hockey' AND p.participant_type='franchise';

  SELECT count(*) INTO v_nba_memberships
  FROM participant_competitions pc
  JOIN participants p ON p.id=pc.participant_id
  JOIN competitions c ON c.id=pc.competition_id
  JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='basketball' AND c.slug='nba' AND pc.membership_status='active';

  SELECT count(*) INTO v_nhl_memberships
  FROM participant_competitions pc
  JOIN participants p ON p.id=pc.participant_id
  JOIN competitions c ON c.id=pc.competition_id
  JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='ice-hockey' AND c.slug='nhl' AND pc.membership_status='active';

  SELECT count(*) INTO v_missing_core
  FROM participant_profiles pp
  JOIN participants p ON p.id=pp.participant_id
  JOIN sports s ON s.id=p.sport_id
  WHERE s.slug IN ('basketball','ice-hockey')
    AND p.participant_type='franchise'
    AND (pp.city IS NULL OR pp.country_code IS NULL OR pp.founded_year IS NULL
      OR pp.venue_name IS NULL OR pp.venue_capacity IS NULL OR pp.official_website_url IS NULL);

  IF v_nba <> 30 THEN RAISE EXCEPTION 'Expected exactly 30 NBA franchises, got %',v_nba; END IF;
  IF v_nhl <> 32 THEN RAISE EXCEPTION 'Expected exactly 32 NHL franchises, got %',v_nhl; END IF;
  IF v_nba_profiles <> 30 THEN RAISE EXCEPTION 'Expected 30 NBA profiles, got %',v_nba_profiles; END IF;
  IF v_nhl_profiles <> 32 THEN RAISE EXCEPTION 'Expected 32 NHL profiles, got %',v_nhl_profiles; END IF;
  IF v_nba_memberships <> 30 THEN RAISE EXCEPTION 'Expected 30 NBA memberships, got %',v_nba_memberships; END IF;
  IF v_nhl_memberships <> 32 THEN RAISE EXCEPTION 'Expected 32 NHL memberships, got %',v_nhl_memberships; END IF;
  IF v_missing_core <> 0 THEN RAISE EXCEPTION 'Found % franchise profiles missing core permanent facts',v_missing_core; END IF;
END $$;

-- Spot checks for current identities that are easy to regress.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participants p JOIN sports s ON s.id=p.sport_id
    WHERE s.slug='ice-hockey' AND p.slug='utah-mammoth' AND p.name='Utah Mammoth'
  ) THEN RAISE EXCEPTION 'Utah Mammoth seed missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM participant_profiles pp
    JOIN participants p ON p.id=pp.participant_id
    JOIN sports s ON s.id=p.sport_id
    WHERE s.slug='basketball' AND p.slug='la-clippers' AND pp.venue_name='Intuit Dome'
  ) THEN RAISE EXCEPTION 'LA Clippers venue seed missing or stale'; END IF;
END $$;

ROLLBACK;
