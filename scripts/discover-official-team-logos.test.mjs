import assert from "node:assert/strict";
import test from "node:test";
import { extractBestLogo, extractClubLinks, LEAGUES } from "./discover-official-team-logos.mjs";

const config = LEAGUES.laliga;

test("extractClubLinks keeps official club profile links and ignores navigation", () => {
  const html = `
    <a href="/laliga-easports/clubes">Clubs</a>
    <a href="/clubes/fc-barcelona"><span>FC Barcelona</span></a>
    <a href="https://www.laliga.com/clubs/real-madrid">Real Madrid</a>
    <a href="https://example.com/clubs/fake">Fake</a>
  `;
  const links = extractClubLinks(html, config);
  assert.deepEqual(links.map((item) => item.slug), ["fc-barcelona", "real-madrid"]);
  assert.equal(links[0].label, "FC Barcelona");
});

test("extractBestLogo strongly prefers a crest over players and hero imagery", () => {
  const club = { slug: "fc-barcelona", label: "FC Barcelona", url: "https://www.laliga.com/clubs/fc-barcelona" };
  const html = `
    <img src="https://assets.laliga.com/photos/fc-barcelona-player.webp" alt="FC Barcelona player" />
    <img src="https://assets.laliga.com/teams/fc-barcelona.svg" alt="Fútbol Club Barcelona shield" />
    <img src="https://assets.laliga.com/news/fc-barcelona-hero.png" alt="FC Barcelona hero" />
  `;
  const logo = extractBestLogo(html, club, config);
  assert.ok(logo);
  assert.equal(logo.url, "https://assets.laliga.com/teams/fc-barcelona.svg");
  assert.ok(logo.score >= 6);
});

test("extractBestLogo refuses unrelated images instead of guessing", () => {
  const club = { slug: "real-madrid", label: "Real Madrid", url: "https://www.laliga.com/clubs/real-madrid" };
  const html = `<img src="https://assets.laliga.com/photos/generic-stadium.webp" alt="Stadium crowd" />`;
  assert.equal(extractBestLogo(html, club, config), null);
});

test("extractBestLogo refuses off-domain logo URLs", () => {
  const club = { slug: "real-madrid", label: "Real Madrid", url: "https://www.laliga.com/clubs/real-madrid" };
  const html = `<img src="https://random.example/real-madrid-logo.svg" alt="Real Madrid crest" />`;
  assert.equal(extractBestLogo(html, club, config), null);
});
