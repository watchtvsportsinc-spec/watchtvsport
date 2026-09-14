# Proposition de schéma Supabase / PostgreSQL (version corrigée)

> Mise à jour V2 — 14 septembre 2026 : ce document décrit la migration initiale.
> L'état courant comprend ensuite `supabase-v2-foundation-migration.sql` puis
> `supabase-v2-ingestion-migration.sql`. Les règles de sources et d'import sont
> documentées dans [`docs/data-sources.md`](docs/data-sources.md). Les trois
> migrations et leurs assertions ont été exécutées ensemble sur une base locale
> jetable ; aucune migration distante n'a été effectuée.

Ce document met à jour la proposition initiale pour refléter les décisions retenues avant le lancement Champions League, sans connecter le site à Supabase ni exécuter de migration distante.

## Décisions retenues

1. `events.id` est l’identifiant permanent interne. Les imports répétés passent par `event_external_ids` avec `provider + external_id` pour éviter les doublons.

2. Les chemins URL existants et leurs alias sont gérés par `event_urls`, qui devient le registre unique des chemins d’événements. `events` ne garde plus de `url_path` indépendant.

3. La cohérence sport–compétition–saison et celle des participants est garantie par triggers.

4. Les diffusions par événement sont stockées dans `event_broadcasts`, avec territoire, chaîne ou plateforme, liens officiel/affilié, langues, accès, source et vérification. Le rattachement à un droit de compétition est facultatif.

5. Les droits portent une période de validité. Une seule décision par événement et droit est autorisée, et le stockage garde explicitement `included` ou `excluded` sans créer de doublons contradictoires. Lorsque `broadcast_right_id` est `NULL`, la clé d’unicité s’applique aussi à la combinaison `(event_id, territory_id, broadcaster_id, platform_id)` pour empêcher les diffusions sans droit associé en double.

6. L’accès est séparé de la plateforme. La plateforme décrit la chaîne ou le service ; l’accès décrit l’offre en vigueur selon le territoire.

7. Les champs actuels connus sont transférés explicitement : phase, groupe, numéro de match, lieu, fuseau, scores éventuels, langues, liens affiliés, sources, dates de mise à jour. Les champs sans correspondance restent non mappés.

8. Publication et vérification sont dissociées. Une archive peut rester publiée sans être déclarée nouvellement vérifiée.

9. Les politiques RLS sont prévues pour toutes les tables exposées. Les visiteurs et utilisateurs ordinaires ne lisent que les données publiques ; aucune écriture publique n’est autorisée. Les données internes de suivi restent privées.

10. Les index uniques redondants sont supprimés, les valeurs NULL sont traitées explicitement dans les contraintes de doublons, et les index sont adaptés aux recherches par date et par équipe.

## 1) Sports, compétitions, saisons

Voir le SQL complet en annexe.

## 2) Territoires, chaînes, plateformes, langues

Voir le SQL complet en annexe.

## 3) Participants et catégories

Voir le SQL complet en annexe.

## 4) Événements, identifiants permanents et URLs

Voir le SQL complet en annexe.

### Points importants

\- `events.id` est l’identifiant interne stable et permanent.

\- `event_external_ids` permet les imports répétés sans doublons.

\- `event_urls` est le registre unique des chemins des événements ; il remplace toute source indépendante dans `events`.

\- Le futur import doit préserver tous les chemins existants, y compris les alias.

## 5) Droits de diffusion, diffusions par événement et validité

Voir le SQL complet en annexe.

### Règles importantes

\- `event_broadcasts` n’inclut plus `decision` dans la clé d’unicité : on ne peut pas créer deux lignes contradictoires pour un même droit et un même événement.

\- La clé d’unicité sur `event_broadcasts` couvre aussi les lignes sans `broadcast_right_id`, de façon à empêcher les doublons d’une diffusion non rattachée à un droit connu.

\- `broadcast_rights` garde sa période de validité.

\- Une couverture inconnue ne crée aucune attribution automatique ; rien n’est inféré.

## 6) Publication, vérification, sources et suivi d’événements

Voir le SQL complet en annexe.

### Séparation publication / vérification

\- `is_published` et `verification_status` restent séparés.

\- Les sources et dates de mise à jour des événements sont conservées dans `event_updates`.

\- Une archive peut rester publiée sans être déclarée nouvellement vérifiée.

## 7) Index et cohérence

Voir le SQL complet en annexe.

### Triggers de cohérence

Les garanties sont renforcées par des triggers de protection sur les tables parentes pour que les incohérences ne puissent pas apparaître après des mises à jour de `competitions`, `seasons`, `platforms` ou `broadcast_rights`.

Voir le SQL complet en annexe.

## 8) Sécurité et RLS

### Tables publiques exposées

Voir le SQL complet en annexe.

### Politiques publiques de lecture

Voir le SQL complet en annexe.

### Aucune écriture publique

Voir le SQL complet en annexe.

### Table internes privées

\- `event_external_ids` et `event_updates` restent non exposées à la lecture publique.

\- Aucune politique publique n’est créée sur ces tables ; elles restent privées et accessibles uniquement aux rôles ou services autorisés.

## 9) Import des données actuelles

1. Importer les sports, compétitions, saisons, territoires, chaînes, plateformes et langues existants sans inventer de nouvelles valeurs.

2. Créer les participants en conservant les `slug`, `name`, `short_name`, `country_code`, `sex`, `age_group` déjà utilisés dans le projet.

3. Importer les événements en conservant `slug`, `phase`, `group_name`, `match_number`, `venue_name`, `venue_city`, `timezone`, `source_name`, `source_url`, `last_verified_at`, `verification_status`, `published_at`, `is_published` lorsque ces valeurs existent.

4. Importer les chemins actuels dans `event_urls`, en conservant les alias existants. `event_urls.url_path` devient le registre unique du chemin, avec un seul `canonical` actif par événement.

5. Importer les identifiants externes dans `event_external_ids` pour permettre les imports répétés sans doublon.

6. Importer les diffusions par événement dans `event_broadcasts`, ainsi que les droits dans `broadcast_rights`, sans forcer une confirmation automatique des données historiques.

7. Garder `verification_status = 'unknown'` ou `to_update` tant qu’aucune confirmation humaine n’est disponible.

8. Utiliser `event_updates` pour conserver les sources et les dates de mise à jour.

### Règle de prudence

\- Si une information est inconnue, elle reste inconnue.

\- Les champs sans correspondance ne sont pas inventés.

\- Les reports, annulations et événements terminés restent explicitement stockés dans `status` et `updated_at`.

\- Les URL existantes et leurs alias doivent être importées telles quelles pour ne pas modifier le rendu actuel.

## 10) Récapitulatif final

Ce schéma est proportionné au lancement football, mais compatible avec plusieurs sports. Il conserve les identités internes stables via `events.id`, centralise les chemins via `event_urls`, sépare publication et vérification, et évite toute attribution automatique basée sur une couverture inconnue ou des droits de compétition non confirmés.

## Correctif ciblé du 13 septembre 2026

- Les privilèges sont révoqués pour PUBLIC, anon et authenticated sur les seules
  15 tables de cette migration ; SELECT est réaccordé aux deux rôles sur les
  13 tables publiques. Les deux tables de suivi restent sans accès public.
  Les politiques RLS filtrent ensuite les lignes. Aucun privilège sur les autres
  tables ni privilège par défaut du projet n'est modifié.
- Un événement ne peut changer de compétition/saison si ses diffusions deviennent
  incompatibles avec leurs droits. Un participant lié à un événement ne peut
  changer de sport en rendant ce lien incohérent.
- Un droit sans saison couvre les saisons de sa compétition. Un droit avec une
  saison exige cette même saison sur l'événement (une saison inconnue ne suffit
  pas). Cette règle est identique lors de l'insertion et des mises à jour.
- La modification valide de l'accès d'un droit sans saison reste autorisée.
- Le fichier de tests utilise de vraies assertions et SET LOCAL ROLE pour anon
  et authenticated. Chaque opération interdite doit produire le SQLSTATE attendu ;
  les erreurs métier P0001 sont aussi comparées au message attendu. Une opération
  interdite qui réussit fait échouer le script. Les tests positifs évitent de
  confondre une interdiction générale de lecture avec un filtrage RLS correct.

### Exécution locale uniquement

Statut : **tests non exécutés**. Aucun psql, postgres ou docker disponible dans
l'environnement de préparation. Aucun serveur distant contacté.

Prévoir une base locale jetable PostgreSQL 15+ avec les rôles Supabase anon et
 authenticated existants, sans privilèges élevés ni héritage donnant des écritures,
 et leur accès USAGE au schéma public. Exécuter en tant que propriétaire/admin
 pouvant prendre ces deux rôles. Ces prérequis ne sont pas créés par la migration.
 La migration est initiale, non idempotente : ne pas la rejouer sur une base où
 ses tables existent déjà. Elle ne remplace pas une migration d'évolution.

Depuis le répertoire contenant les trois fichiers, avec une connexion psql
préalablement configurée vers cette base locale uniquement :

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase-initial-migration.sql
psql -X -v ON_ERROR_STOP=1 -f supabase-schema-tests.sql
```

Les fixtures utilisent des identifiants réservés au test dans une base jetable.
Le ROLLBACK final annule les données de test ; en cas d'erreur, ON_ERROR_STOP
interrompt le script et la fermeture de la connexion annule la transaction.
La migration, elle, crée ses tables et les conserve dans cette base locale.

Les tests sont mono-session : ils ne constituent pas une validation des courses
entre imports concurrents. Les triggers hérités restent la stratégie de ce
correctif ciblé ; ne pas considérer la concurrence comme validée.

Référence des privilèges : https://www.postgresql.org/docs/current/sql-grant.html

## Annexe : migration exacte

```sql
BEGIN;
SET LOCAL search_path = public, pg_catalog;
-- Initial migration only; PostgreSQL 15+, existing Supabase roles required.


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  season_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  label text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, slug)
);

CREATE TABLE territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_territory_id uuid REFERENCES territories(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE (sport_id, code)
);

CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES participant_categories(id),
  participant_type text NOT NULL CHECK (participant_type IN ('team', 'individual', 'club', 'country')),
  slug text NOT NULL,
  name text NOT NULL,
  short_name text,
  country_code text,
  age_group text,
  sex text CHECK (sex IN ('male', 'female', 'mixed', 'unknown')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id uuid REFERENCES competitions(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES seasons(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'reported')),
  slug text NOT NULL,
  phase text,
  group_name text,
  match_number integer,
  event_date timestamptz,
  scheduled_date timestamptz,
  venue_name text,
  venue_city text,
  timezone text,
  home_participant_id uuid REFERENCES participants(id),
  away_participant_id uuid REFERENCES participants(id),
  home_score integer,
  away_score integer,
  score_details jsonb,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE event_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE TABLE event_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url_path text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('canonical', 'alias')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_event_urls_one_active_canonical
  ON event_urls (event_id)
  WHERE kind = 'canonical' AND is_active = true;

CREATE TABLE broadcasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('linear', 'streaming', 'platform', 'network', 'other')),
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcaster_id, slug)
);

CREATE TABLE languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE broadcast_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES seasons(id) ON DELETE RESTRICT,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  platform_id uuid REFERENCES platforms(id),
  access_type text CHECK (access_type IN ('Free', 'Paid', 'Unknown')),
  coverage_type text NOT NULL CHECK (coverage_type IN ('full', 'partial', 'unknown')),
  valid_from date,
  valid_to date,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE NULLS NOT DISTINCT (
    competition_id,
    season_id,
    territory_id,
    broadcaster_id,
    platform_id,
    access_type,
    coverage_type,
    valid_from,
    valid_to
  )
);

CREATE TABLE event_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  broadcast_right_id uuid REFERENCES broadcast_rights(id) ON DELETE RESTRICT,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  platform_id uuid REFERENCES platforms(id),
  decision text NOT NULL CHECK (decision IN ('included', 'excluded')),
  access_type text CHECK (access_type IN ('Free', 'Paid', 'Unknown')),
  official_url text,
  affiliate_url text,
  language_codes text[] NOT NULL DEFAULT '{}',
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (
    event_id,
    broadcast_right_id,
    territory_id,
    broadcaster_id,
    platform_id
  )
);

CREATE TABLE event_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  update_type text NOT NULL CHECK (update_type IN ('schedule', 'status', 'score', 'broadcast', 'publication', 'source', 'other')),
  source_name text,
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION validate_event_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_competition_sport uuid;
  v_season_competition uuid;
  v_season_sport uuid;
  v_home_sport uuid;
  v_away_sport uuid;
BEGIN
  IF NEW.competition_id IS NOT NULL THEN
    SELECT sport_id INTO v_competition_sport
    FROM competitions
    WHERE id = NEW.competition_id;

    IF v_competition_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'competition sport mismatch for event';
    END IF;
  END IF;

  IF NEW.season_id IS NOT NULL THEN
    IF NEW.competition_id IS NULL THEN
      RAISE EXCEPTION 'event season requires competition_id';
    END IF;

    SELECT competition_id INTO v_season_competition
    FROM seasons
    WHERE id = NEW.season_id;

    IF v_season_competition IS DISTINCT FROM NEW.competition_id THEN
      RAISE EXCEPTION 'season does not belong to event competition';
    END IF;

    SELECT sport_id INTO v_season_sport
    FROM competitions
    WHERE id = v_season_competition;

    IF v_season_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'season sport mismatch for event';
    END IF;
  END IF;

  IF NEW.home_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_home_sport
    FROM participants
    WHERE id = NEW.home_participant_id;

    IF v_home_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'home participant sport mismatch for event';
    END IF;
  END IF;

  IF NEW.away_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_away_sport
    FROM participants
    WHERE id = NEW.away_participant_id;

    IF v_away_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'away participant sport mismatch for event';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_relationships
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION validate_event_relationships();

CREATE OR REPLACE FUNCTION validate_broadcast_rights_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_season_competition uuid;
  v_platform_broadcaster uuid;
BEGIN
  IF NEW.season_id IS NOT NULL THEN
    SELECT competition_id INTO v_season_competition
    FROM seasons
    WHERE id = NEW.season_id;

    IF v_season_competition IS DISTINCT FROM NEW.competition_id THEN
      RAISE EXCEPTION 'season does not belong to broadcast right competition';
    END IF;
  END IF;

  IF NEW.platform_id IS NOT NULL THEN
    SELECT broadcaster_id INTO v_platform_broadcaster
    FROM platforms
    WHERE id = NEW.platform_id;

    IF v_platform_broadcaster IS DISTINCT FROM NEW.broadcaster_id THEN
      RAISE EXCEPTION 'platform does not belong to broadcaster';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_rights_relationships
BEFORE INSERT OR UPDATE ON broadcast_rights
FOR EACH ROW
EXECUTE FUNCTION validate_broadcast_rights_relationships();

CREATE OR REPLACE FUNCTION validate_event_broadcast_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event record;
  v_right record;
  v_platform_broadcaster uuid;
BEGIN
  SELECT sport_id, competition_id, season_id, is_published
    INTO v_event
    FROM events
    WHERE id = NEW.event_id;

  IF NEW.platform_id IS NOT NULL THEN
    SELECT broadcaster_id INTO v_platform_broadcaster
    FROM platforms
    WHERE id = NEW.platform_id;

    IF v_platform_broadcaster IS DISTINCT FROM NEW.broadcaster_id THEN
      RAISE EXCEPTION 'platform does not belong to broadcaster';
    END IF;
  END IF;

  IF NEW.broadcast_right_id IS NOT NULL THEN
    SELECT * INTO v_right
    FROM broadcast_rights
    WHERE id = NEW.broadcast_right_id;

    IF v_event.competition_id IS DISTINCT FROM v_right.competition_id THEN
      RAISE EXCEPTION 'event broadcast right competition mismatch';
    END IF;

    IF v_right.season_id IS NOT NULL THEN
      IF v_event.season_id IS DISTINCT FROM v_right.season_id THEN
        RAISE EXCEPTION 'event broadcast right season mismatch';
      END IF;
    END IF;

    IF NEW.territory_id IS DISTINCT FROM v_right.territory_id THEN
      RAISE EXCEPTION 'event broadcast territory mismatch for right';
    END IF;

    IF NEW.broadcaster_id IS DISTINCT FROM v_right.broadcaster_id THEN
      RAISE EXCEPTION 'event broadcast broadcaster mismatch for right';
    END IF;

    IF COALESCE(NEW.platform_id::text, '') IS DISTINCT FROM COALESCE(v_right.platform_id::text, '') THEN
      RAISE EXCEPTION 'event broadcast platform mismatch for right';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_broadcast_relationships
BEFORE INSERT OR UPDATE ON event_broadcasts
FOR EACH ROW
EXECUTE FUNCTION validate_event_broadcast_relationships();

CREATE OR REPLACE FUNCTION validate_competition_sport_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.competition_id = NEW.id
      AND e.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION 'cannot change competition sport because events already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_competition_sport_on_parent_update
BEFORE UPDATE OF sport_id ON competitions
FOR EACH ROW
EXECUTE FUNCTION validate_competition_sport_on_parent_update();

CREATE OR REPLACE FUNCTION validate_season_competition_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.season_id = NEW.id
      AND e.competition_id IS DISTINCT FROM NEW.competition_id
  ) THEN
    RAISE EXCEPTION 'cannot move season to another competition because events already reference it';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM broadcast_rights br
    WHERE br.season_id = NEW.id
      AND br.competition_id IS DISTINCT FROM NEW.competition_id
  ) THEN
    RAISE EXCEPTION 'cannot move season to another competition because broadcast rights already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_season_competition_on_parent_update
BEFORE UPDATE OF competition_id ON seasons
FOR EACH ROW
EXECUTE FUNCTION validate_season_competition_on_parent_update();

CREATE OR REPLACE FUNCTION validate_broadcast_right_parent_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM event_broadcasts eb
    JOIN events e ON e.id = eb.event_id
    WHERE eb.broadcast_right_id = NEW.id
      AND (
        e.competition_id IS DISTINCT FROM NEW.competition_id
        OR (NEW.season_id IS NOT NULL AND e.season_id IS DISTINCT FROM NEW.season_id)
        OR eb.territory_id IS DISTINCT FROM NEW.territory_id
        OR eb.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
        OR COALESCE(eb.platform_id::text, '') IS DISTINCT FROM COALESCE(NEW.platform_id::text, '')
      )
  ) THEN
    RAISE EXCEPTION 'cannot update broadcast right because existing event broadcasts no longer match it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_right_parent_updates
BEFORE UPDATE OF competition_id, season_id, territory_id, broadcaster_id, platform_id, access_type, coverage_type, valid_from, valid_to ON broadcast_rights
FOR EACH ROW
EXECUTE FUNCTION validate_broadcast_right_parent_updates();

CREATE OR REPLACE FUNCTION validate_platform_broadcaster_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM broadcast_rights br
    WHERE br.platform_id = NEW.id
      AND br.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
  ) THEN
    RAISE EXCEPTION 'cannot move platform to another broadcaster because broadcast rights already reference it';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM event_broadcasts eb
    WHERE eb.platform_id = NEW.id
      AND eb.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
  ) THEN
    RAISE EXCEPTION 'cannot move platform to another broadcaster because event broadcasts already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_platform_broadcaster_on_parent_update
BEFORE UPDATE OF broadcaster_id ON platforms
FOR EACH ROW
EXECUTE FUNCTION validate_platform_broadcaster_on_parent_update();

CREATE INDEX ix_events_calendar
  ON events (competition_id, season_id, event_date, scheduled_date, status);

CREATE INDEX ix_events_home_team
  ON events (home_participant_id);

CREATE INDEX ix_events_away_team
  ON events (away_participant_id);

CREATE INDEX ix_events_date
  ON events (event_date);

CREATE INDEX ix_broadcast_rights_competition
  ON broadcast_rights (competition_id, season_id, territory_id, broadcaster_id, platform_id);

CREATE INDEX ix_event_broadcasts_event
  ON event_broadcasts (event_id, decision);

CREATE INDEX ix_event_broadcasts_publication
  ON event_broadcasts (is_published, verification_status, last_verified_at);

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_sports ON sports FOR SELECT USING (true);
CREATE POLICY public_select_competitions ON competitions FOR SELECT USING (true);
CREATE POLICY public_select_seasons ON seasons FOR SELECT USING (true);
CREATE POLICY public_select_territories ON territories FOR SELECT USING (true);
CREATE POLICY public_select_participant_categories ON participant_categories FOR SELECT USING (true);
CREATE POLICY public_select_participants ON participants FOR SELECT USING (true);
CREATE POLICY public_select_languages ON languages FOR SELECT USING (true);

CREATE POLICY public_select_events
  ON events FOR SELECT
  USING (is_published = true);

CREATE POLICY public_select_event_urls
  ON event_urls FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_urls.event_id
        AND e.is_published = true
    )
  );

CREATE POLICY public_select_broadcasters ON broadcasters FOR SELECT USING (true);
CREATE POLICY public_select_platforms ON platforms FOR SELECT USING (true);

CREATE POLICY public_select_broadcast_rights
  ON broadcast_rights FOR SELECT
  USING (is_published = true);

CREATE POLICY public_select_event_broadcasts
  ON event_broadcasts FOR SELECT
  USING (
    is_published = true
    AND decision = 'included'
    AND EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_broadcasts.event_id
        AND e.is_published = true
    )
  );

CREATE POLICY no_public_write_sports ON sports FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_competitions ON competitions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_seasons ON seasons FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_territories ON territories FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_participant_categories ON participant_categories FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_participants ON participants FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_events ON events FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_urls ON event_urls FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_broadcasters ON broadcasters FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_platforms ON platforms FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_languages ON languages FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_broadcast_rights ON broadcast_rights FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_broadcasts ON event_broadcasts FOR ALL USING (false) WITH CHECK (false);


-- Revalidate existing broadcasts when their event changes competition/season.
CREATE FUNCTION validate_event_broadcasts_on_event_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.event_broadcasts eb
    JOIN public.broadcast_rights br ON br.id = eb.broadcast_right_id
    WHERE eb.event_id = OLD.id AND (
      NEW.competition_id IS DISTINCT FROM br.competition_id
      OR (br.season_id IS NOT NULL AND NEW.season_id IS DISTINCT FROM br.season_id)
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event update conflicts with existing broadcast rights';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_event_broadcasts_on_event_update
BEFORE UPDATE OF competition_id, season_id ON public.events
FOR EACH ROW EXECUTE FUNCTION validate_event_broadcasts_on_event_update();

CREATE FUNCTION validate_participant_sport_on_parent_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events e
    WHERE (e.home_participant_id = OLD.id OR e.away_participant_id = OLD.id)
      AND e.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'participant sport update conflicts with existing events';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_participant_sport_on_parent_update
BEFORE UPDATE OF sport_id ON public.participants
FOR EACH ROW EXECUTE FUNCTION validate_participant_sport_on_parent_update();

-- Explicit privileges on this migration's tables only.
REVOKE ALL PRIVILEGES ON TABLE public.sports FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.competitions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.seasons FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.territories FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participant_categories FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participants FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_urls FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.broadcasters FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.platforms FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.languages FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.broadcast_rights FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_broadcasts FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_external_ids FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_updates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.sports TO anon, authenticated;
GRANT SELECT ON TABLE public.competitions TO anon, authenticated;
GRANT SELECT ON TABLE public.seasons TO anon, authenticated;
GRANT SELECT ON TABLE public.territories TO anon, authenticated;
GRANT SELECT ON TABLE public.participant_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.participants TO anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
GRANT SELECT ON TABLE public.event_urls TO anon, authenticated;
GRANT SELECT ON TABLE public.broadcasters TO anon, authenticated;
GRANT SELECT ON TABLE public.platforms TO anon, authenticated;
GRANT SELECT ON TABLE public.languages TO anon, authenticated;
GRANT SELECT ON TABLE public.broadcast_rights TO anon, authenticated;
GRANT SELECT ON TABLE public.event_broadcasts TO anon, authenticated;

COMMIT;

```
