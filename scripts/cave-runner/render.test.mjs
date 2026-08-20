import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { extractCalendar, generateFiles } from "./generate.mjs";
import { normalizeCalendar, renderCaveRunner } from "./render.mjs";

const fixtureUrl = new URL("./fixtures/contributions.json", import.meta.url);

async function fixtureCalendar() {
  const payload = JSON.parse(await readFile(fixtureUrl, "utf8"));
  return payload.data.user.contributionsCollection.contributionCalendar;
}

test("normalizes contribution weeks into deterministic cave cells", async () => {
  const calendar = await fixtureCalendar();
  const result = normalizeCalendar(calendar);

  assert.equal(result.totalContributions, 10);
  assert.equal(result.cells.length, 14);
  assert.deepEqual(result.cells[8], {
    date: "2026-08-17",
    contributionCount: 0,
    contributionLevel: "NONE",
    weekIndex: 1,
    weekday: 1,
  });
});

test("renders an accessible animated cave from contribution levels", async () => {
  const normalized = normalizeCalendar(await fixtureCalendar());
  const svg = renderCaveRunner(normalized, "dark");

  assert.equal(svg, renderCaveRunner(normalized, "dark"));
  assert.match(svg, /<title[^>]*>Navdeep's Cave Runner<\/title>/);
  assert.match(svg, /<desc[^>]*>.*contribution.*crystal.*<\/desc>/i);
  assert.match(svg, /data-theme="dark"/);
  assert.match(svg, /data-game-style="diamond-cave"/);
  assert.match(svg, /data-crystal-count="2"/);
  assert.match(svg, /data-active-days="3"/);
  assert.match(svg, /data-total-contributions="10"/);
  assert.equal((svg.match(/class="crystal motion-layer"/g) ?? []).length, 2);
  assert.match(svg, /class="cave-wall"/);
  assert.match(svg, /class="exit-gate"/);
  assert.match(svg, /CONTRIBUTION CAVERNS/);
  assert.match(svg, /<animateMotion/);
  assert.match(svg, /prefers-reduced-motion: reduce/);
  assert.match(svg, /class="crystal motion-layer" transform="translate\([^)]*\)" data-level="SECOND_QUARTILE" data-scale="0\.84" data-color="#57E3C3"[^>]*data-route-progress="0\.015"/);
  assert.match(svg, /class="crystal motion-layer" transform="translate\([^)]*\)" data-level="FOURTH_QUARTILE" data-scale="1\.08" data-color="#FFB86B"[^>]*data-route-progress="0\.995"/);
  assert.match(svg, /<g>\s*<polygon points="0,-/);
  assert.doesNotMatch(svg, /<g class="crystal motion-layer"[^>]*>\s*<polygon/);
  assert.doesNotMatch(svg, /<script/i);
  assert.doesNotMatch(svg, /(?:href|src)="https?:/i);
});

test("times crystal collection against real tunnel distance", () => {
  const normalized = {
    totalContributions: 13,
    weekCount: 13,
    cells: Array.from({ length: 13 }, (_, weekIndex) => ({
      contributionCount: 1,
      contributionLevel: "FIRST_QUARTILE",
      weekIndex,
    })),
  };

  const svg = renderCaveRunner(normalized, "dark");
  assert.match(svg, /data-week="9" data-route-progress="0\.713"/);
  assert.doesNotMatch(svg, /data-week="9" data-route-progress="0\.750"/);
});

test("renders distinct light and dark themes", async () => {
  const normalized = normalizeCalendar(await fixtureCalendar());
  const light = renderCaveRunner(normalized, "light");
  const dark = renderCaveRunner(normalized, "dark");

  assert.notEqual(light, dark);
  assert.match(light, /data-theme="light"/);
  assert.match(dark, /data-theme="dark"/);
});

test("rejects malformed contribution data", () => {
  assert.throws(
    () => normalizeCalendar({ totalContributions: 1, weeks: [{ contributionDays: [{ weekday: 8 }] }] }),
    /invalid contribution day/i,
  );
});

test("extracts a contribution calendar and rejects GraphQL failures", async () => {
  const payload = JSON.parse(await readFile(fixtureUrl, "utf8"));

  assert.equal(extractCalendar(payload).totalContributions, 10);
  assert.throws(() => extractCalendar({ errors: [{ message: "rate limited" }] }), /rate limited/i);
  assert.throws(() => extractCalendar({ data: { user: null } }), /user.*not found/i);
});

test("writes validated light and dark SVG files", async () => {
  const payload = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const outputDirectory = await mkdtemp(join(tmpdir(), "cave-runner-"));

  try {
    const files = await generateFiles(extractCalendar(payload), outputDirectory);
    assert.deepEqual(files.map((file) => file.split("/").at(-1)), [
      "cave-runner-contribution-graph.svg",
      "cave-runner-contribution-graph-dark.svg",
    ]);

    const [light, dark] = await Promise.all(files.map((file) => readFile(file, "utf8")));
    assert.match(light, /data-theme="light"/);
    assert.match(dark, /data-theme="dark"/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
