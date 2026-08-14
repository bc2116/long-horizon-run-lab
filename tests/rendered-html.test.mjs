import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function sourceFiles(directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", ".next", ".wrangler", "dist", "node_modules"].includes(entry.name)) {
      continue;
    }
    const path = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if ([".json", ".js", ".md", ".mjs", ".toml", ".ts", ".tsx"].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

test("ships a branded, read-only synthetic portfolio surface", async () => {
  const [page, app, layout, route, packageJson, methodology, seedJson, recoveryGate] =
    await Promise.all([
      readFile(new URL("app/page.tsx", root), "utf8"),
      readFile(new URL("app/run-ledger.tsx", root), "utf8"),
      readFile(new URL("app/layout.tsx", root), "utf8"),
      readFile(new URL("app/api/data/route.ts", root), "utf8"),
      readFile(new URL("package.json", root), "utf8"),
      readFile(new URL("docs/RUNNING-TRACKING-DOCUMENTATION.md", root), "utf8"),
      readFile(new URL("data/seed.json", root), "utf8"),
      readFile(new URL("data/recovery-gate.ts", root), "utf8"),
    ]);

  assert.match(page, /<RunLedger \/>/);
  assert.match(app, /Long Horizon Run Lab/);
  assert.match(app, /Synthetic portfolio demo/);
  assert.match(app, /DEMO_READ_ONLY = true/);
  assert.match(app, /Active rotation/);
  assert.match(app, /Retired library/);
  assert.match(app, /Recovery Telemetry methodology/);
  assert.match(layout, /title: "Long Horizon Run Lab"/);
  assert.match(layout, /long-horizon-run-lab-og\.png/);
  assert.match(route, /status: 405/);
  assert.match(route, /read-only/);
  assert.match(methodology, /deterministic synthetic fixture/);
  assert.match(recoveryGate, /Synthetic recovery snapshot/);
  assert.doesNotMatch(packageJson, /data:extract/);

  const seed = JSON.parse(seedJson);
  assert.equal(seed.runs.length, 14);
  assert.equal(seed.shoes.length, 3);
  assert.equal(seed.months.length, 6);
  assert.equal(new Set(seed.runs.map((run) => run.id)).size, seed.runs.length);
  assert.ok(seed.runs.every((run) => run.source === "Synthetic demo"));
  assert.ok(seed.distance_summaries.every((row) => row.source === "Synthetic summary"));

  await access(new URL("public/long-horizon-run-lab-og.png", root));
  await assert.rejects(access(new URL("data/legacy-data.js", root)));
  await assert.rejects(access(new URL("data/workout-history.json", root)));
  await assert.rejects(access(new URL("scripts/extract-legacy-data.mjs", root)));
});

test("contains no known private identifiers or live Sites metadata", async () => {
  const forbidden = [
    ["Bry", "an"],
    ["Fu", "ry"],
    ["Lake", " Forest"],
    ["Orange", " County"],
    ["Clifton", " Pro"],
    ["Mach", " 7"],
    ["HO", "KA"],
    ["Claude", " fitness files"],
    ["run-ledger", ".longhorizon.chatgpt.site"],
    ["appgprj_6a642", "b813fdc8191bf59707bf0515bc5"],
  ].map((parts) => new RegExp(parts.join(""), "i"));

  for (const file of await sourceFiles()) {
    const text = await readFile(file, "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${pattern} found in ${file.pathname}`);
    }
  }
});
