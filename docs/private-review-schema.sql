-- DDL candidate. Apply ONLY to an isolated test database first.
-- No public event/broadcast rows are changed. No account is made an admin.
-- Promote through `supabase migration new` after SQL/security tests pass.
BEGIN;
CREATE SCHEMA watchtvsport_review;
REVOKE ALL ON SCHEMA watchtvsport_review FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA watchtvsport_review TO authenticated, service_role;
CREATE TABLE watchtvsport_review.members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE watchtvsport_review.cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 exception_key text NOT NULL UNIQUE CHECK (length(exception_key) BETWEEN 1 AND 250),
 import_item_id uuid REFERENCES public.import_items(id),
 event_id uuid NOT NULL REFERENCES public.events(id),
 source_id uuid REFERENCES public.data_sources(id),
 event_title text NOT NULL CHECK (length(event_title) BETWEEN 1 AND 240),
 competition text NOT NULL CHECK (length(competition) BETWEEN 1 AND 160),
 session_label text NOT NULL DEFAULT '' CHECK (length(session_label)<=160),
 event_start timestamptz, source_observed_at timestamptz,
 reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 2000),
 requires_explanation boolean NOT NULL DEFAULT false,
 candidate jsonb NOT NULL CHECK (jsonb_typeof(candidate)='object' AND octet_length(candidate::text)<=16000),
 published_snapshot jsonb CHECK (published_snapshot IS NULL OR jsonb_typeof(published_snapshot)='object'),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','research','approved','rejected')),
 publication_state text NOT NULL DEFAULT 'not_published' CHECK (publication_state IN ('not_published','awaiting_publication','published')),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 manually_corrected_fields text[] NOT NULL DEFAULT '{}',
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_cases_queue ON watchtvsport_review.cases(state,event_start,id);
CREATE TABLE watchtvsport_review.decisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES auth.users(id), request_id uuid NOT NULL,
 case_id uuid NOT NULL REFERENCES watchtvsport_review.cases(id),
 command jsonb NOT NULL, before_snapshot jsonb NOT NULL, after_snapshot jsonb NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor_id,request_id)
);
CREATE INDEX review_decisions_case ON watchtvsport_review.decisions(case_id,created_at);
CREATE TABLE watchtvsport_review.research_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES watchtvsport_review.cases(id),
 requested_by uuid NOT NULL REFERENCES auth.users(id), case_version integer NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','resolved','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
 max_attempts integer NOT NULL DEFAULT 2 CHECK(max_attempts BETWEEN 1 AND 2),
 lease_until timestamptz, result_summary text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX review_one_active_research ON watchtvsport_review.research_jobs(case_id) WHERE state IN ('queued','running');
ALTER TABLE watchtvsport_review.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchtvsport_review.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchtvsport_review.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchtvsport_review.research_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA watchtvsport_review FROM PUBLIC,anon,authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA watchtvsport_review TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA watchtvsport_review TO service_role;

-- Definer functions are private, explicitly authorized, with an empty search_path.
-- Check current membership AND session existence; do not trust user_metadata.
CREATE FUNCTION watchtvsport_review.is_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS(SELECT 1 FROM watchtvsport_review.members m WHERE m.user_id=auth.uid() AND m.active)
 AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=auth.uid() AND s.id::text=auth.jwt()->>'session_id');
$$;
CREATE FUNCTION watchtvsport_review.is_reviewer() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT watchtvsport_review.is_member() AND COALESCE(auth.jwt()->>'aal'='aal2',false);
$$;
REVOKE ALL ON FUNCTION watchtvsport_review.is_member(),watchtvsport_review.is_reviewer() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION watchtvsport_review.is_member(),watchtvsport_review.is_reviewer() TO authenticated;
CREATE POLICY review_member_self ON watchtvsport_review.members FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY review_case_read ON watchtvsport_review.cases FOR SELECT TO authenticated USING(watchtvsport_review.is_reviewer());
CREATE POLICY review_decision_read ON watchtvsport_review.decisions FOR SELECT TO authenticated USING(watchtvsport_review.is_reviewer());
CREATE POLICY review_research_read ON watchtvsport_review.research_jobs FOR SELECT TO authenticated USING(watchtvsport_review.is_reviewer());
-- No direct reviewer writes: all mutation must use the transaction below.
CREATE FUNCTION public.wts_review_identity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('member',watchtvsport_review.is_member(),'elevated',watchtvsport_review.is_reviewer());
$$;
CREATE FUNCTION watchtvsport_review.queue(p_tab text,p_offset integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE answer jsonb; n bigint;
BEGIN
 IF NOT watchtvsport_review.is_reviewer() THEN RAISE EXCEPTION 'Reviewer required' USING ERRCODE='42501'; END IF;
 IF p_tab IS NULL OR p_offset IS NULL OR p_tab NOT IN ('pending','research','history') OR p_offset<0 OR p_offset>10000 THEN RAISE EXCEPTION 'Invalid queue' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO n FROM watchtvsport_review.cases c WHERE
 (p_tab='pending' AND c.state='pending') OR (p_tab='research' AND c.state='research') OR (p_tab='history' AND c.state IN ('approved','rejected'));
 SELECT COALESCE(jsonb_agg(item ORDER BY event_start NULLS LAST,id),'[]'::jsonb) INTO answer FROM (
 SELECT c.id,c.event_start,jsonb_build_object(
 'id',c.id,'event_id',c.event_id,'version',c.version,'state',c.state,'event_title',c.event_title,
 'competition',c.competition,'session_label',c.session_label,'event_start',c.event_start,
 'reason',c.reason,'source_observed_at',c.source_observed_at,'published_snapshot',c.published_snapshot,
 'publication_state',c.publication_state,
 'research_state',(SELECT j.state FROM watchtvsport_review.research_jobs j WHERE j.case_id=c.id ORDER BY j.created_at DESC LIMIT 1),
 'candidate',c.candidate || jsonb_build_object('broadcaster_name',b.name,'territory_name',t.name,'territory_code',t.code)
 ) AS item FROM watchtvsport_review.cases c
 LEFT JOIN public.broadcasters b ON b.id::text=c.candidate->>'broadcaster_id'
 LEFT JOIN public.territories t ON t.id::text=c.candidate->>'territory_id'
 WHERE (p_tab='pending' AND c.state='pending') OR (p_tab='research' AND c.state='research') OR (p_tab='history' AND c.state IN ('approved','rejected'))
 ORDER BY c.event_start NULLS LAST,c.id LIMIT 40 OFFSET p_offset
 ) rows;
 RETURN jsonb_build_object('items',answer,'total',n,'has_more',n>p_offset+40);
END;
$$;
CREATE FUNCTION public.wts_review_queue(p_tab text DEFAULT 'pending',p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT watchtvsport_review.queue(p_tab,p_offset); $$;
CREATE FUNCTION watchtvsport_review.lookups() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT watchtvsport_review.is_reviewer() THEN RAISE EXCEPTION 'Reviewer required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'broadcasters',(SELECT COALESCE(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM (SELECT id,name FROM public.broadcasters ORDER BY name LIMIT 1000) b),
 'territories',(SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (SELECT id,name FROM public.territories ORDER BY name LIMIT 500) t));
END;
$$;
CREATE FUNCTION public.wts_review_lookups() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT watchtvsport_review.lookups(); $$;
CREATE FUNCTION watchtvsport_review.decide(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row watchtvsport_review.cases; new_row watchtvsport_review.cases; prior watchtvsport_review.decisions;
 actor uuid:=auth.uid(); request_key uuid; case_key uuid; expected integer; action text; patch jsonb; note text;
 v_candidate jsonb; key text; val jsonb; result jsonb; next_state text; message text;
 allowed text[]:=ARRAY['broadcaster_id','territory_id','access_type','broadcast_type','official_url','source_name','source_url','evidence_scope','language_codes','access_conditions','requires_account','is_free_trial'];
BEGIN
 IF actor IS NULL OR NOT watchtvsport_review.is_reviewer() THEN RAISE EXCEPTION 'Reviewer required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_command) IS DISTINCT FROM 'object' OR octet_length(p_command::text)>16000 THEN RAISE EXCEPTION 'Invalid command' USING ERRCODE='22023'; END IF;
 FOR key IN SELECT jsonb_object_keys(p_command) LOOP
 IF key<>ALL(ARRAY['case_id','expected_version','request_id','action','patch','note']) THEN RAISE EXCEPTION 'Unknown command field' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF (p_command ? 'note' AND jsonb_typeof(p_command->'note') IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Invalid note' USING ERRCODE='22023'; END IF;
 IF NOT(p_command ?& ARRAY['case_id','expected_version','request_id','action']) THEN RAISE EXCEPTION 'Missing fields' USING ERRCODE='22023'; END IF;
 BEGIN
 request_key:=(p_command->>'request_id')::uuid; case_key:=(p_command->>'case_id')::uuid; expected:=(p_command->>'expected_version')::integer;
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'Invalid identifiers' USING ERRCODE='22023'; END;
 IF request_key IS NULL OR case_key IS NULL OR expected IS NULL OR expected<1 THEN RAISE EXCEPTION 'Invalid identifiers' USING ERRCODE='22023'; END IF;
 action:=p_command->>'action'; patch:=COALESCE(p_command->'patch','{}'::jsonb); note:=COALESCE(p_command->>'note','');
 IF action IS NULL OR action NOT IN ('approve','reject','research','edit','reopen') OR jsonb_typeof(patch) IS DISTINCT FROM 'object' OR length(note)>2000 THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
 IF patch<>'{}'::jsonb AND action NOT IN ('approve','edit') THEN RAISE EXCEPTION 'Unexpected patch' USING ERRCODE='22023'; END IF;
 IF (patch<>'{}'::jsonb OR action='reopen') AND length(trim(note))=0 THEN RAISE EXCEPTION 'Note required' USING ERRCODE='22023'; END IF;
 FOR key,val IN SELECT * FROM jsonb_each(patch) LOOP
 IF key<>ALL(allowed) THEN RAISE EXCEPTION 'Forbidden field' USING ERRCODE='22023'; END IF;
 IF key IN ('requires_account','is_free_trial') THEN
 IF jsonb_typeof(val) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid boolean' USING ERRCODE='22023'; END IF;
 ELSIF key='language_codes' THEN
 IF jsonb_typeof(val) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid languages' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(val)>12 OR EXISTS(SELECT 1 FROM jsonb_array_elements(val) l WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR (l #>> '{}') !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$') THEN RAISE EXCEPTION 'Invalid languages' USING ERRCODE='22023'; END IF;
 ELSE
 IF jsonb_typeof(val) IS DISTINCT FROM 'string' OR length(val #>> '{}')>2048 OR (val #>> '{}') ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Invalid text' USING ERRCODE='22023'; END IF;
 END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || request_key::text,0));
 SELECT * INTO prior FROM watchtvsport_review.decisions WHERE actor_id=actor AND request_id=request_key;
 IF FOUND THEN
 IF prior.command<>p_command THEN RAISE EXCEPTION 'Idempotency conflict' USING ERRCODE='40001'; END IF;
 RETURN prior.result;
 END IF;
 SELECT * INTO old_row FROM watchtvsport_review.cases WHERE id=case_key FOR UPDATE;
 IF NOT FOUND OR old_row.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF old_row.publication_state='published' THEN RAISE EXCEPTION 'Published change requires compensation workflow' USING ERRCODE='22023'; END IF;
 IF action<>'reopen' AND old_row.state<>'pending' THEN RAISE EXCEPTION 'Case not pending' USING ERRCODE='40001'; END IF;
 IF action='reopen' AND old_row.state='pending' THEN RAISE EXCEPTION 'Already pending' USING ERRCODE='40001'; END IF;
 v_candidate:=old_row.candidate || patch;
 IF v_candidate ? 'access_type' AND v_candidate->>'access_type' NOT IN ('Free','Paid','Unknown') THEN RAISE EXCEPTION 'Invalid access' USING ERRCODE='22023'; END IF;
 IF v_candidate ? 'broadcast_type' AND v_candidate->>'broadcast_type' NOT IN ('live','delayed','replay','highlights') THEN RAISE EXCEPTION 'Invalid broadcast type' USING ERRCODE='22023'; END IF;
 IF v_candidate ? 'evidence_scope' AND v_candidate->>'evidence_scope' NOT IN ('event','competition','unknown') THEN RAISE EXCEPTION 'Invalid evidence scope' USING ERRCODE='22023'; END IF;
 IF patch ? 'broadcaster_id' AND NOT EXISTS(SELECT 1 FROM public.broadcasters WHERE id::text=patch->>'broadcaster_id') THEN RAISE EXCEPTION 'Unknown broadcaster' USING ERRCODE='22023'; END IF;
 IF patch ? 'territory_id' AND NOT EXISTS(SELECT 1 FROM public.territories WHERE id::text=patch->>'territory_id') THEN RAISE EXCEPTION 'Unknown territory' USING ERRCODE='22023'; END IF;
 IF action='approve' THEN
 IF v_candidate->>'evidence_scope' IS DISTINCT FROM 'event'
 OR COALESCE(v_candidate->>'source_url','') !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}([/?#]|$)'
 OR COALESCE(v_candidate->>'official_url','') !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}([/?#]|$)'
 OR NOT EXISTS(SELECT 1 FROM public.broadcasters WHERE id::text=v_candidate->>'broadcaster_id')
 OR NOT EXISTS(SELECT 1 FROM public.territories WHERE id::text=v_candidate->>'territory_id')
 OR v_candidate->>'broadcast_type' IS NULL
 OR (old_row.requires_explanation AND length(trim(note))=0) THEN
 RAISE EXCEPTION 'Event-level evidence and explanation required' USING ERRCODE='22023';
 END IF;
 END IF;
 IF action='reopen' THEN
 IF EXISTS(SELECT 1 FROM watchtvsport_review.research_jobs WHERE case_id=case_key AND state='running' AND lease_until>now()) THEN RAISE EXCEPTION 'Research still running' USING ERRCODE='40001'; END IF;
 UPDATE watchtvsport_review.research_jobs SET state='cancelled',updated_at=now() WHERE case_id=case_key AND state IN ('queued','running','failed');
 END IF;
 next_state:=CASE action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'research' THEN 'research' ELSE 'pending' END;
 UPDATE watchtvsport_review.cases SET candidate=v_candidate,state=next_state,version=version+1,
 reviewed_by=actor,reviewed_at=now(),updated_at=now(),
 publication_state=CASE WHEN action='approve' THEN 'awaiting_publication' ELSE 'not_published' END,
 manually_corrected_fields=ARRAY(SELECT DISTINCT unnest(old_row.manually_corrected_fields || ARRAY(SELECT jsonb_object_keys(patch))))
 WHERE id=case_key RETURNING * INTO new_row;
 IF action='research' THEN
 INSERT INTO watchtvsport_review.research_jobs(case_id,requested_by,case_version) VALUES(case_key,actor,new_row.version);
 END IF;
 message:=CASE action WHEN 'approve' THEN 'Validation enregistree. Publication en attente du circuit de controle.' WHEN 'reject' THEN 'Proposition refusee. Aucune diffusion publiee supprimee.' WHEN 'research' THEN 'Demande enregistree. En attente du moteur de recherche.' WHEN 'reopen' THEN 'Fiche rouverte.' ELSE 'Correction enregistree sans validation.' END;
 result:=jsonb_build_object('ok',true,'case_id',case_key,'version',new_row.version,'state',new_row.state,'publication_state',new_row.publication_state,'message',message);
 INSERT INTO watchtvsport_review.decisions(actor_id,request_id,case_id,command,before_snapshot,after_snapshot,result)
 VALUES(actor,request_key,case_key,p_command,to_jsonb(old_row),to_jsonb(new_row),result);
 RETURN result;
END;
$$;
CREATE FUNCTION public.wts_review_decide(p_command jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT watchtvsport_review.decide(p_command); $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA watchtvsport_review FROM PUBLIC,anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA watchtvsport_review TO authenticated;
REVOKE ALL ON FUNCTION public.wts_review_identity(),public.wts_review_queue(text,integer),public.wts_review_lookups(),public.wts_review_decide(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wts_review_identity(),public.wts_review_queue(text,integer),public.wts_review_lookups(),public.wts_review_decide(jsonb) TO authenticated;
-- No memberships, cron, provider calls or publication worker are installed.
COMMIT;
