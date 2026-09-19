import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function favoritesModule() {
  return jiti.import(resolve(root, "lib/favorites.ts"));
}

function item(entityId, label, href, savedAt = "2026-09-19T12:00:00.000Z") {
  return { kind: "participant", entityId, label, href, savedAt };
}

test("legacy and current PSG favorites collapse to one canonical club", async () => {
  const { parseFavoritesSnapshot } = await favoritesModule();
  const snapshot = parseFavoritesSnapshot(JSON.stringify({
    schemaVersion: 1,
    items: [
      item("club:psg", "Paris Saint-Germain (Football)"),
      item("club:football:paris-sg", "PSG (Football)"),
      item("legacy-participant-id", "Paris Saint Germain (Football)", "/football/club/paris-saint-germain"),
      item("club:football:paris-saint-germain", "Paris Saint-Germain", "/sports/football/club/paris-saint-germain"),
    ],
  }));

  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].entityId, "club:football:paris-saint-germain");
});

test("duplicate legacy entries do not consume the unique favorites limit", async () => {
  const { MAX_FAVORITES, parseFavoritesSnapshot } = await favoritesModule();
  const duplicates = Array.from({ length: MAX_FAVORITES }, (_, index) =>
    item(index % 2 ? "club:psg" : "club:football:paris-sg", "PSG (Football)", undefined, new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString())
  );
  const unique = item("club:football:lens", "Lens (Football)");
  const snapshot = parseFavoritesSnapshot(JSON.stringify({ schemaVersion: 1, items: [...duplicates, unique] }));

  assert.deepEqual(snapshot.items.map((favorite) => favorite.entityId), [
    "club:football:paris-saint-germain",
    "club:football:lens",
  ]);
});
