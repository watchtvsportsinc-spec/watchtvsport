\set ON_ERROR_STOP on
-- Local disposable database only, after the initial migration.
-- Run as owner/admin able to SET ROLE anon and authenticated.
-- All fixtures and successful writes are rolled back.
BEGIN;
SET LOCAL search_path = public, pg_catalog;

INSERT INTO public.sports (id,slug,name) VALUES ('00000000-0000-4000-8000-000000000001','test-sport-1','Test sport');

INSERT INTO public.sports (id,slug,name) VALUES ('00000000-0000-4000-8000-000000000002','test-sport-2','Test sport');

INSERT INTO public.competitions (id,sport_id,slug,name) VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','test-comp-10','Test competition');

INSERT INTO public.competitions (id,sport_id,slug,name) VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','test-comp-11','Test competition');

INSERT INTO public.seasons (id,competition_id,slug,label) VALUES ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','test-season-20','Test season');

INSERT INTO public.seasons (id,competition_id,slug,label) VALUES ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000010','test-season-21','Test season');

INSERT INTO public.seasons (id,competition_id,slug,label) VALUES ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000011','test-season-22','Test season');

INSERT INTO public.participants (id,sport_id,participant_type,slug,name) VALUES ('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000001','team','test-team-30','Test team');

INSERT INTO public.participants (id,sport_id,participant_type,slug,name) VALUES ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001','team','test-team-31','Test team');

INSERT INTO public.territories (id,code,name) VALUES ('00000000-0000-4000-8000-000000000040','zz-test','Test territory');

INSERT INTO public.broadcasters (id,slug,name,kind) VALUES ('00000000-0000-4000-8000-000000000041','test-broadcaster','Test broadcaster','linear');

INSERT INTO public.platforms (id,broadcaster_id,slug,name) VALUES ('00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000041','test-platform','Test platform');

INSERT INTO public.languages (id,code,name) VALUES ('00000000-0000-4000-8000-000000000043','zz-test','Test language');

INSERT INTO public.events (id,sport_id,competition_id,season_id,status,slug,home_participant_id,away_participant_id,is_published) VALUES ('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','scheduled','test-event-50','00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000031',true);

INSERT INTO public.event_urls (event_id,url_path,kind) VALUES ('00000000-0000-4000-8000-000000000050','/test/event-50','canonical');

INSERT INTO public.events (id,sport_id,competition_id,season_id,status,slug,home_participant_id,away_participant_id,is_published) VALUES ('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','scheduled','test-event-51','00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000031',false);

INSERT INTO public.event_urls (event_id,url_path,kind) VALUES ('00000000-0000-4000-8000-000000000051','/test/event-51','canonical');

INSERT INTO public.events (id,sport_id,competition_id,season_id,status,slug,home_participant_id,away_participant_id,is_published) VALUES ('00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','scheduled','test-event-52','00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000031',true);

INSERT INTO public.event_urls (event_id,url_path,kind) VALUES ('00000000-0000-4000-8000-000000000052','/test/event-52','canonical');

INSERT INTO public.broadcast_rights (id,competition_id,season_id,territory_id,broadcaster_id,platform_id,coverage_type,is_published) VALUES ('00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','full',true);

INSERT INTO public.broadcast_rights (id,competition_id,season_id,territory_id,broadcaster_id,platform_id,coverage_type,is_published) VALUES ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000010',NULL,'00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','full',true);

INSERT INTO public.event_broadcasts (id,event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,is_published) VALUES ('00000000-0000-4000-8000-000000000070','00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','included',true);

INSERT INTO public.event_broadcasts (id,event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,is_published) VALUES ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','included',true);

INSERT INTO public.event_broadcasts (id,event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,is_published) VALUES ('00000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','excluded',true);

INSERT INTO public.event_broadcasts (id,event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,is_published) VALUES ('00000000-0000-4000-8000-000000000073','00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','included',true);

INSERT INTO public.event_external_ids (event_id,provider,external_id) VALUES ('00000000-0000-4000-8000-000000000050','test-provider','test-id');

INSERT INTO public.event_updates (event_id,update_type) VALUES ('00000000-0000-4000-8000-000000000050','source');

DO $test$
BEGIN
  BEGIN
    INSERT INTO event_broadcasts(event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision) VALUES ('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','excluded');
  EXCEPTION WHEN SQLSTATE '23505' THEN
    RAISE NOTICE 'PASS: contradictory decision';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: contradictory decision (operation unexpectedly succeeded)';
END;
$test$;

INSERT INTO public.event_broadcasts (event_id,territory_id,broadcaster_id,platform_id,decision) VALUES ('00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','included');

DO $test$
BEGIN
  BEGIN
    INSERT INTO event_broadcasts(event_id,territory_id,broadcaster_id,platform_id,decision) VALUES ('00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','excluded');
  EXCEPTION WHEN SQLSTATE '23505' THEN
    RAISE NOTICE 'PASS: duplicate without right';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: duplicate without right (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO event_urls(event_id,url_path,kind) VALUES ('00000000-0000-4000-8000-000000000051','/test/event-50','alias');
  EXCEPTION WHEN SQLSTATE '23505' THEN
    RAISE NOTICE 'PASS: URL collision';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: URL collision (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO events(sport_id,competition_id,season_id,status,slug) VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000022','scheduled','test-invalid');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'season does not belong to event competition' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: wrong season insert';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: wrong season insert (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE events SET competition_id='00000000-0000-4000-8000-000000000011',season_id='00000000-0000-4000-8000-000000000022' WHERE id='00000000-0000-4000-8000-000000000050';
  EXCEPTION WHEN SQLSTATE '23514' THEN
      IF SQLERRM <> 'event update conflicts with existing broadcast rights' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: event competition update';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: event competition update (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE events SET season_id='00000000-0000-4000-8000-000000000021' WHERE id='00000000-0000-4000-8000-000000000050';
  EXCEPTION WHEN SQLSTATE '23514' THEN
      IF SQLERRM <> 'event update conflicts with existing broadcast rights' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: event season update';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: event season update (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE participants SET sport_id='00000000-0000-4000-8000-000000000002' WHERE id='00000000-0000-4000-8000-000000000030';
  EXCEPTION WHEN SQLSTATE '23514' THEN
      IF SQLERRM <> 'participant sport update conflicts with existing events' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: participant sport update 30';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: participant sport update 30 (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE participants SET sport_id='00000000-0000-4000-8000-000000000002' WHERE id='00000000-0000-4000-8000-000000000031';
  EXCEPTION WHEN SQLSTATE '23514' THEN
      IF SQLERRM <> 'participant sport update conflicts with existing events' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: participant sport update 31';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: participant sport update 31 (operation unexpectedly succeeded)';
END;
$test$;

UPDATE broadcast_rights SET access_type='Paid' WHERE id='00000000-0000-4000-8000-000000000061';

DO $test$ BEGIN IF (SELECT count(*) FROM broadcast_rights WHERE id='00000000-0000-4000-8000-000000000061' AND season_id IS NULL AND access_type='Paid') <> 1 THEN RAISE EXCEPTION 'FAIL: seasonless right valid update'; END IF; RAISE NOTICE 'PASS: seasonless right valid update'; END; $test$;

UPDATE broadcast_rights SET season_id=NULL WHERE id='00000000-0000-4000-8000-000000000061';

INSERT INTO public.events (id,sport_id,competition_id,season_id,status,slug) VALUES ('00000000-0000-4000-8000-000000000053','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','scheduled','test-seasonless');

INSERT INTO public.event_broadcasts (event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision) VALUES ('00000000-0000-4000-8000-000000000053','00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042','included');

UPDATE events SET season_id='00000000-0000-4000-8000-000000000021' WHERE id='00000000-0000-4000-8000-000000000053';

DO $test$ BEGIN IF (SELECT count(*) FROM events WHERE id='00000000-0000-4000-8000-000000000053' AND season_id='00000000-0000-4000-8000-000000000021') <> 1 THEN RAISE EXCEPTION 'FAIL: seasonless right covers another season'; END IF; RAISE NOTICE 'PASS: seasonless right covers another season'; END; $test$;

DO $test$
BEGIN
  BEGIN
    UPDATE broadcast_rights SET season_id='00000000-0000-4000-8000-000000000020' WHERE id='00000000-0000-4000-8000-000000000061';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'cannot update broadcast right because existing event broadcasts no longer match it' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: right changed to incompatible season';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: right changed to incompatible season (operation unexpectedly succeeded)';
END;
$test$;

SET LOCAL ROLE anon;

DO $test$ BEGIN IF current_user <> 'anon' THEN RAISE EXCEPTION 'wrong test role'; END IF; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM events WHERE id='00000000-0000-4000-8000-000000000050') <> 1 THEN RAISE EXCEPTION 'FAIL: anon public event'; END IF; RAISE NOTICE 'PASS: anon public event'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM events WHERE id='00000000-0000-4000-8000-000000000051') <> 0 THEN RAISE EXCEPTION 'FAIL: anon private event'; END IF; RAISE NOTICE 'PASS: anon private event'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_urls WHERE url_path='/test/event-50') <> 1 THEN RAISE EXCEPTION 'FAIL: anon public URL'; END IF; RAISE NOTICE 'PASS: anon public URL'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_urls WHERE url_path='/test/event-51') <> 0 THEN RAISE EXCEPTION 'FAIL: anon private URL'; END IF; RAISE NOTICE 'PASS: anon private URL'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000070') <> 1 THEN RAISE EXCEPTION 'FAIL: anon public broadcast'; END IF; RAISE NOTICE 'PASS: anon public broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000071') <> 0 THEN RAISE EXCEPTION 'FAIL: anon private event broadcast'; END IF; RAISE NOTICE 'PASS: anon private event broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000072') <> 0 THEN RAISE EXCEPTION 'FAIL: anon excluded broadcast'; END IF; RAISE NOTICE 'PASS: anon excluded broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM languages WHERE id='00000000-0000-4000-8000-000000000043') <> 1 THEN RAISE EXCEPTION 'FAIL: anon public language'; END IF; RAISE NOTICE 'PASS: anon public language'; END; $test$;

DO $test$
BEGIN
  BEGIN
    PERFORM 1 FROM public.event_external_ids LIMIT 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon private table event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon private table event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    PERFORM 1 FROM public.event_updates LIMIT 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon private table event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon private table event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.sports DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.sports SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.sports;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.sports;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.competitions DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.competitions SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.competitions;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.competitions;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.seasons DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.seasons SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.seasons;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.seasons;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.territories DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.territories SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.territories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.territories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.participant_categories DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.participant_categories SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.participant_categories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.participant_categories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.participants DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.participants SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.participants;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.participants;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.events DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.events SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.events;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.events;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_urls DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_urls SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_urls;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_urls;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.broadcasters DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.broadcasters SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.broadcasters;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.broadcasters;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.platforms DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.platforms SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.platforms;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.platforms;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.languages DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.languages SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.languages;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.languages;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.broadcast_rights DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.broadcast_rights SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.broadcast_rights;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.broadcast_rights;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_broadcasts DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_broadcasts SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_broadcasts;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_broadcasts;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_external_ids DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_external_ids SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_external_ids;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_external_ids;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_updates DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon insert event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon insert event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_updates SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon update event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon update event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_updates;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon delete event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon delete event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_updates;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: anon truncate event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: anon truncate event_updates (operation unexpectedly succeeded)';
END;
$test$;

RESET ROLE;

SET LOCAL ROLE authenticated;

DO $test$ BEGIN IF current_user <> 'authenticated' THEN RAISE EXCEPTION 'wrong test role'; END IF; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM events WHERE id='00000000-0000-4000-8000-000000000050') <> 1 THEN RAISE EXCEPTION 'FAIL: authenticated public event'; END IF; RAISE NOTICE 'PASS: authenticated public event'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM events WHERE id='00000000-0000-4000-8000-000000000051') <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated private event'; END IF; RAISE NOTICE 'PASS: authenticated private event'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_urls WHERE url_path='/test/event-50') <> 1 THEN RAISE EXCEPTION 'FAIL: authenticated public URL'; END IF; RAISE NOTICE 'PASS: authenticated public URL'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_urls WHERE url_path='/test/event-51') <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated private URL'; END IF; RAISE NOTICE 'PASS: authenticated private URL'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000070') <> 1 THEN RAISE EXCEPTION 'FAIL: authenticated public broadcast'; END IF; RAISE NOTICE 'PASS: authenticated public broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000071') <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated private event broadcast'; END IF; RAISE NOTICE 'PASS: authenticated private event broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM event_broadcasts WHERE id='00000000-0000-4000-8000-000000000072') <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated excluded broadcast'; END IF; RAISE NOTICE 'PASS: authenticated excluded broadcast'; END; $test$;

DO $test$ BEGIN IF (SELECT count(*) FROM languages WHERE id='00000000-0000-4000-8000-000000000043') <> 1 THEN RAISE EXCEPTION 'FAIL: authenticated public language'; END IF; RAISE NOTICE 'PASS: authenticated public language'; END; $test$;

DO $test$
BEGIN
  BEGIN
    PERFORM 1 FROM public.event_external_ids LIMIT 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated private table event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated private table event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    PERFORM 1 FROM public.event_updates LIMIT 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated private table event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated private table event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.sports DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.sports SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.sports;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.sports;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate sports';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate sports (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.competitions DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.competitions SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.competitions;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.competitions;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate competitions';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate competitions (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.seasons DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.seasons SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.seasons;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.seasons;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate seasons';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate seasons (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.territories DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.territories SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.territories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.territories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate territories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate territories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.participant_categories DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.participant_categories SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.participant_categories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.participant_categories;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate participant_categories';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate participant_categories (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.participants DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.participants SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.participants;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.participants;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate participants';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate participants (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.events DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.events SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.events;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.events;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate events';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate events (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_urls DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_urls SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_urls;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_urls;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate event_urls';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate event_urls (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.broadcasters DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.broadcasters SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.broadcasters;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.broadcasters;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate broadcasters';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate broadcasters (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.platforms DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.platforms SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.platforms;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.platforms;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate platforms';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate platforms (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.languages DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.languages SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.languages;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.languages;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate languages';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate languages (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.broadcast_rights DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.broadcast_rights SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.broadcast_rights;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.broadcast_rights;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate broadcast_rights';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate broadcast_rights (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_broadcasts DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_broadcasts SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_broadcasts;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_broadcasts;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate event_broadcasts';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate event_broadcasts (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_external_ids DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_external_ids SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_external_ids;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_external_ids;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate event_external_ids';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate event_external_ids (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.event_updates DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated insert event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated insert event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    UPDATE public.event_updates SET id=id;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated update event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated update event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.event_updates;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated delete event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated delete event_updates (operation unexpectedly succeeded)';
END;
$test$;

DO $test$
BEGIN
  BEGIN
    TRUNCATE public.event_updates;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'PASS: authenticated truncate event_updates';
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: authenticated truncate event_updates (operation unexpectedly succeeded)';
END;
$test$;

RESET ROLE;

ROLLBACK;
\echo 'PASS: all assertions completed; test data rolled back'
