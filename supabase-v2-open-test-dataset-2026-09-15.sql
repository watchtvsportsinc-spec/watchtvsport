BEGIN;
-- Test-data visibility only. This does not deploy the V2 application to watchtvsport.com.
UPDATE events
SET is_published = true, updated_at = now()
WHERE sport_id IN (SELECT id FROM sports WHERE slug IN ('football','formula-1','ufc'))
  AND verification_status IN ('confirmed','expected','to_update','unknown');

UPDATE event_pages
SET is_published = true, updated_at = now()
WHERE sport_id IN (SELECT id FROM sports WHERE slug IN ('football','formula-1','ufc'))
  AND verification_status IN ('confirmed','expected','to_update','unknown');

UPDATE event_editions ee
SET is_published = true, updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM event_pages ep
  WHERE ep.id = ee.event_page_id
    AND ep.sport_id IN (SELECT id FROM sports WHERE slug IN ('football','formula-1','ufc'))
)
AND ee.verification_status IN ('confirmed','expected','to_update','unknown');

-- Broadcaster information remains stricter: only explicit confirmed included offers are exposed.
UPDATE event_broadcasts eb
SET is_published = true, updated_at = now()
WHERE eb.verification_status = 'confirmed'
  AND eb.decision = 'included'
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = eb.event_id
      AND e.sport_id IN (SELECT id FROM sports WHERE slug IN ('football','formula-1','ufc'))
  );
COMMIT;
