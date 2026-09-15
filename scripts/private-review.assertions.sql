-- Transactional tests against ephemeral PostgreSQL, not live Supabase Auth.
DO $$ BEGIN IF current_database()<>'wts_review_test' THEN RAISE EXCEPTION 'Disposable test database required'; END IF; END $$;
BEGIN;
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO auth.sessions VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
INSERT INTO watchtvsport_review.members(user_id) VALUES('11111111-1111-4111-8111-111111111111');
INSERT INTO public.events VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
INSERT INTO public.broadcasters VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','TEST broadcaster');
INSERT INTO public.territories VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','TEST territory','ZZ');
INSERT INTO watchtvsport_review.cases(id,exception_key,event_id,event_title,competition,reason,candidate) VALUES(
'ffffffff-ffff-4fff-8fff-ffffffffffff','fixture-only','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','TEST event','TEST competition','TEST exception',
'{"broadcaster_id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","territory_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","broadcast_type":"live","access_type":"Paid","evidence_scope":"event","source_url":"https://fixture.test/proof","official_url":"https://fixture.test/channel"}');
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.wts_review_identity(); RAISE EXCEPTION 'Anon unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","aal":"aal2","user_metadata":{"admin":true}}',true);
DO $$ BEGIN
 IF (public.wts_review_identity()->>'member')::boolean THEN RAISE EXCEPTION 'Ordinary user became admin'; END IF;
 BEGIN PERFORM public.wts_review_queue(); RAISE EXCEPTION 'Ordinary account read queue'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}',true);
DO $$ BEGIN
 BEGIN PERFORM public.wts_review_queue(); RAISE EXCEPTION 'Missing MFA accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal2"}',true);
DO $$ DECLARE cmd jsonb; r jsonb; r2 jsonb; BEGIN
 IF (public.wts_review_queue()->>'total')::int<>1 THEN RAISE EXCEPTION 'Queue mismatch'; END IF;
 BEGIN PERFORM 1 FROM watchtvsport_review.cases; RAISE EXCEPTION 'Direct table access allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 cmd:='{"case_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","request_id":"00000000-0000-4000-8000-000000000001","expected_version":1,"action":"reject","patch":{},"note":"Fixture rejection"}';
 r:=public.wts_review_decide(cmd); r2:=public.wts_review_decide(cmd);
 IF r<>r2 OR r->>'state'<>'rejected' THEN RAISE EXCEPTION 'Idempotent rejection failed'; END IF;
 BEGIN PERFORM public.wts_review_decide(cmd || '{"action":"approve"}'); RAISE EXCEPTION 'Idempotency key reused'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000009","action":"reopen","note":"Stale"}'); RAISE EXCEPTION 'Stale write accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 r:=public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000002","expected_version":2,"action":"reopen","note":"Fixture correction"}');
 r:=public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000003","expected_version":3,"action":"research","note":"Fixture research"}');
 IF r->>'state'<>'research' THEN RAISE EXCEPTION 'Research was not queued'; END IF;
 r:=public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000004","expected_version":4,"action":"reopen","note":"Cancel queued fixture"}');
 BEGIN PERFORM public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000009","expected_version":5,"action":"approve","patch":{"evidence_scope":"competition"},"note":"Not event proof"}'); RAISE EXCEPTION 'Competition-only proof approved'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000009","expected_version":5,"action":"edit","patch":{"is_published":true},"note":"Forbidden"}'); RAISE EXCEPTION 'Publication injection allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 r:=public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000005","expected_version":5,"action":"edit","patch":{"access_type":"Free"},"note":"Fixture edit"}');
 r:=public.wts_review_decide(cmd || '{"request_id":"00000000-0000-4000-8000-000000000006","expected_version":6,"action":"approve","note":"Fixture approval"}');
 IF r->>'publication_state'<>'awaiting_publication' OR r->>'state'<>'approved' THEN RAISE EXCEPTION 'Approval publication separation failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.event_broadcasts)<>0 THEN RAISE EXCEPTION 'Public data changed'; END IF;
 IF (SELECT count(*) FROM watchtvsport_review.decisions)<>6 THEN RAISE EXCEPTION 'Audit/retry count mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM watchtvsport_review.cases WHERE manually_corrected_fields @> ARRAY['access_type']) THEN RAISE EXCEPTION 'Correction protection not recorded'; END IF;
 IF NOT EXISTS(SELECT 1 FROM watchtvsport_review.research_jobs WHERE state='cancelled') THEN RAISE EXCEPTION 'Queued research not cancelled'; END IF;
END $$;
UPDATE watchtvsport_review.members SET active=false;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.wts_review_queue(); RAISE EXCEPTION 'Revoked member read queue'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE watchtvsport_review.members SET active=true;
DELETE FROM auth.sessions WHERE user_id='11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.wts_review_queue(); RAISE EXCEPTION 'Revoked session read queue'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'Private review SQL assertions passed' AS result;
