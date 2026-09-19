
BEGIN;
UPDATE public.competitions
SET display_name='Ligue 1'
WHERE slug='ligue-1';
COMMIT;
