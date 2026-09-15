import assert from "node:assert/strict";
import test from "node:test";
import { extractBestLogo, extractClubLinks, LEAGUES } from "./discover-official-team-logos.mjs";

const laliga = LEAGUES.laliga;

test("extractClubLinks keeps official LALIGA club profile links and ignores navigation", () => {
  const html = `
    <a href="/laliga-easports/clubes">Clubs</a>
    <a href="/clubes/fc-barcelona"><span>FC Barcelona</span></a>
    <a href="https://www.laliga.com/clubs/real-madrid">Real Madrid</a>
    <a href="https://example.com/clubs/fake">Fake</a>
  `;
  const links = extractClubLinks(html, laliga);
  assert.deepEqual(links.map((item) => item.slug), ["fc-barcelona", "real-madrid"]);
  assert.equal(links[0].label, "FC Barcelona");
});

test("extractClubLinks handles Premier League numeric club ids", () => {
  const html = `
    <a href="/en/clubs/3/arsenal/overview">Arsenal</a>
    <a href="/en/clubs/7/aston-villa/overview">Aston Villa</a>
  `;
  assert.deepEqual(
    extractClubLinks(html, LEAGUES.premierleague).map((item) => item.slug),
    ["arsenal", "aston-villa"]
  );
});

test("extractClubLinks handles Bundesliga club routes", () => {
  const html = `
    <a href="/en/bundesliga/clubs/fc-bayern-muenchen">Bayern Munich</a>
    <a href="/en/bundesliga/clubs/borussia-dortmund">Borussia Dortmund</a>
  `;
  assert.deepEqual(
    extractClubLinks(html, LEAGUES.bundesliga).map((item) => item.slug),
    ["fc-bayern-muenchen", "borussia-dortmund"]
  );
});

test("extractClubLinks can derive a Ligue 1 audit slug from the official label", () => {
  const html = `<a href="/en/club-sheet/l1_championship_club_2025_13/info">Paris Saint-Germain</a>`;
  const links = extractClubLinks(html, LEAGUES.ligue1);
  assert.equal(links[0]?.slug, "paris-saint-germain");
});

test("extractBestLogo strongly prefers a crest over players and hero imagery", () => {
  const club = { slug: "fc-barcelona", label: "FC Barcelona", url: "https://www.laliga.com/clubs/fc-barcelona" };
  const html = `
    <img src="https://assets.laliga.com/photos/fc-barcelona-player.webp" alt="FC Barcelona player" />
    <img src="https://assets.laliga.com/teams/fc-barcelona.svg" alt="Fútbol Club Barcelona shield" />
    <img src="https://assets.laliga.com/news/fc-barcelona-hero.png" alt="FC Barcelona hero" />
  `;
  const logo = extractBestLogo(html, club, laliga);
  assert.ok(logo);
  assert.equal(logo.url, "https://assets.laliga.com/teams/fc-barcelona.svg");
  assert.ok(logo.score >= 6);
});

test("extractBestLogo rejects a league logo false positive", () => {
  const club = { slug: "deportivo-alaves", label: "Deportivo Alavés", url: "https://www.laliga.com/clubs/deportivo-alaves" };
  const html = `<img src="https://assets.laliga.com/logo-laliga.png" alt="LALIGA logo" />`;
  assert.equal(extractBestLogo(html, club, laliga), null);
});

test("extractBestLogo refuses unrelated images instead of guessing", () => {
  const club = { slug: "real-madrid", label: "Real Madrid", url: "https://www.laliga.com/clubs/real-madrid" };
  const html = `<img src="https://assets.laliga.com/photos/generic-stadium.webp" alt="Stadium crowd" />`;
  assert.equal(extractBestLogo(html, club, laliga), null);
});

test("extractBestLogo refuses off-domain logo URLs", () => {
  const club = { slug: "real-madrid", label: "Real Madrid", url: "https://www.laliga.com/clubs/real-madrid" };
  const html = `<img src="https://random.example/real-madrid-logo.svg" alt="Real Madrid crest" />`;
  assert.equal(extractBestLogo(html, club, laliga), null);
});
