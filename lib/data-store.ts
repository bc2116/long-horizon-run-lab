import { env } from "cloudflare:workers";
import seed from "@/data/seed.json";

type D1ResultRow = Record<string, unknown>;

const SEED_VERSION = 1;

function getDatabase() {
  if (!env.DB) {
    throw new Error("Long Horizon Run Lab database is unavailable.");
  }
  return env.DB;
}

export function ownerKey(_request: Request) {
  void _request;
  return "public-demo";
}

async function runBatches(
  statements: ReturnType<D1Database["prepare"]>[],
  size = 40,
) {
  const db = getDatabase();
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

function optionalNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Numeric fields must be valid numbers.");
  return number;
}

export async function ensureData(owner: string) {
  const db = getDatabase();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS shoes (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      nickname TEXT,
      color TEXT NOT NULL DEFAULT '#46c9a8',
      start_date TEXT,
      initial_miles REAL NOT NULL DEFAULT 0,
      retirement_threshold REAL NOT NULL DEFAULT 400,
      status TEXT NOT NULL DEFAULT 'active',
      is_default INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      date TEXT NOT NULL,
      distance REAL NOT NULL,
      route TEXT,
      moving_seconds REAL,
      elapsed_seconds REAL,
      elevation_gain REAL,
      pace REAL,
      avg_hr REAL,
      end_hr REAL,
      hr_2min REAL,
      cardio_recovery REAL,
      effort REAL,
      shoe_id TEXT,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS recovery_months (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      month TEXT NOT NULL,
      cardio_recovery REAL,
      resting_hr REAL,
      resting_hr_rest REAL,
      hrv REAL,
      hrv_rest REAL,
      walking_hr REAL,
      vo2_max REAL,
      lean_mass_kg REAL,
      lean_mass_rest_kg REAL,
      body_fat REAL,
      body_fat_rest REAL,
      weight_kg REAL,
      weight_rest_kg REAL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS distance_summaries (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period TEXT NOT NULL,
      miles REAL NOT NULL,
      source TEXT NOT NULL,
      observed_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS seed_state (
      owner_key TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS shoes_owner_idx ON shoes(owner_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS runs_owner_date_idx ON runs(owner_key, date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS runs_shoe_idx ON runs(shoe_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS recovery_owner_month_idx ON recovery_months(owner_key, month)"),
    db.prepare("CREATE INDEX IF NOT EXISTS distance_owner_period_idx ON distance_summaries(owner_key, period_type, period)"),
  ]);

  const state = await db
    .prepare("SELECT version FROM seed_state WHERE owner_key = ?")
    .bind(owner)
    .first<{ version: number }>();
  if ((state?.version ?? 0) >= SEED_VERSION) return;

  const now = new Date().toISOString();
  const shoes = seed.shoes.map((shoe) =>
    db
      .prepare(`INSERT OR IGNORE INTO shoes (
        id, owner_key, brand, model, nickname, color, start_date, initial_miles,
        retirement_threshold, status, is_default, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        `${owner}:${shoe.id}`,
        owner,
        shoe.brand,
        shoe.model,
        shoe.nickname,
        shoe.color,
        shoe.start_date,
        shoe.initial_miles,
        shoe.retirement_threshold,
        shoe.status,
        shoe.is_default,
        shoe.notes,
        now,
      ),
  );
  const runs = seed.runs.map((run) =>
    db
      .prepare(`INSERT OR IGNORE INTO runs (
        id, owner_key, date, distance, route, moving_seconds, elapsed_seconds,
        elevation_gain, pace, avg_hr, end_hr, hr_2min, cardio_recovery, effort,
        shoe_id, notes, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        `${owner}:${run.id}`,
        owner,
        run.date,
        run.distance,
        run.route,
        run.moving_seconds,
        run.elapsed_seconds,
        run.elevation_gain,
        run.pace,
        run.avg_hr,
        run.end_hr,
        run.hr_2min,
        run.cardio_recovery,
        run.effort,
        run.shoe_id ? `${owner}:${run.shoe_id}` : null,
        run.notes,
        run.source,
        now,
        now,
      ),
  );
  const months = seed.months.map((month) =>
    db
      .prepare(`INSERT OR IGNORE INTO recovery_months (
        id, owner_key, month, cardio_recovery, resting_hr, resting_hr_rest,
        hrv, hrv_rest, walking_hr, vo2_max, lean_mass_kg, lean_mass_rest_kg,
        body_fat, body_fat_rest, weight_kg, weight_rest_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        `${owner}:${month.month}`,
        owner,
        month.month,
        month.cardio_recovery,
        month.resting_hr,
        month.resting_hr_rest,
        month.hrv,
        month.hrv_rest,
        month.walking_hr,
        month.vo2_max,
        month.lean_mass_kg,
        month.lean_mass_rest_kg,
        month.body_fat,
        month.body_fat_rest,
        month.weight_kg,
        month.weight_rest_kg,
      ),
  );
  const summaries = seed.distance_summaries.map((summary) =>
    db
      .prepare(`INSERT OR REPLACE INTO distance_summaries (
        id, owner_key, period_type, period, miles, source, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        `${owner}:${summary.period_type}:${summary.period}`,
        owner,
        summary.period_type,
        summary.period,
        summary.miles,
        summary.source,
        summary.observed_at,
      ),
  );

  await runBatches([...shoes, ...runs, ...months, ...summaries]);
  await db
    .prepare(`INSERT OR REPLACE INTO seed_state (owner_key, version, updated_at)
      VALUES (?, ?, ?)`)
    .bind(owner, SEED_VERSION, now)
    .run();
}

export async function getData(owner: string) {
  const db = getDatabase();
  const [runs, shoes, months, summaries] = await Promise.all([
    db
      .prepare("SELECT * FROM runs WHERE owner_key = ? ORDER BY date DESC, created_at DESC")
      .bind(owner)
      .all<D1ResultRow>(),
    db
      .prepare("SELECT * FROM shoes WHERE owner_key = ? ORDER BY status ASC, is_default DESC, created_at DESC")
      .bind(owner)
      .all<D1ResultRow>(),
    db
      .prepare("SELECT * FROM recovery_months WHERE owner_key = ? ORDER BY month ASC")
      .bind(owner)
      .all<D1ResultRow>(),
    db
      .prepare("SELECT * FROM distance_summaries WHERE owner_key = ? ORDER BY period ASC")
      .bind(owner)
      .all<D1ResultRow>(),
  ]);
  return {
    runs: runs.results,
    shoes: shoes.results,
    months: months.results,
    summaries: summaries.results,
  };
}

export async function mutateData(owner: string, input: Record<string, unknown>) {
  const db = getDatabase();
  const action = String(input.action || "");
  const now = new Date().toISOString();

  if (action === "addShoe") {
    const brand = String(input.brand || "").trim();
    const model = String(input.model || "").trim();
    if (!brand || !model) throw new Error("Brand and model are required.");
    const id = crypto.randomUUID();
    const isDefault = Boolean(input.isDefault);
    if (isDefault) {
      await db
        .prepare("UPDATE shoes SET is_default = 0 WHERE owner_key = ?")
        .bind(owner)
        .run();
    }
    await db
      .prepare(`INSERT INTO shoes (
        id, owner_key, brand, model, nickname, color, start_date, initial_miles,
        retirement_threshold, status, is_default, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
      .bind(
        id,
        owner,
        brand,
        model,
        String(input.nickname || "").trim() || null,
        String(input.color || "#46c9a8"),
        String(input.startDate || "") || null,
        optionalNumber(input.initialMiles) ?? 0,
        optionalNumber(input.retirementThreshold) ?? 400,
        isDefault ? 1 : 0,
        String(input.notes || "").trim() || null,
        now,
      )
      .run();
    return { id };
  }

  if (action === "addRun") {
    const date = String(input.date || "");
    const distance = Number(input.distance);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("A valid date is required.");
    if (!Number.isFinite(distance) || distance <= 0) {
      throw new Error("Distance must be greater than zero.");
    }
    const id = crypto.randomUUID();
    const movingSeconds = optionalNumber(input.movingSeconds);
    const pace = movingSeconds ? movingSeconds / 60 / distance : null;
    await db
      .prepare(`INSERT INTO runs (
        id, owner_key, date, distance, route, moving_seconds, elapsed_seconds,
        elevation_gain, pace, avg_hr, end_hr, hr_2min, cardio_recovery, effort,
        shoe_id, notes, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`)
      .bind(
        id,
        owner,
        date,
        distance,
        String(input.route || "").trim() || null,
        movingSeconds,
        optionalNumber(input.elapsedSeconds),
        optionalNumber(input.elevationGain),
        pace,
        optionalNumber(input.avgHr),
        optionalNumber(input.endHr),
        optionalNumber(input.hr2min),
        optionalNumber(input.cardioRecovery),
        optionalNumber(input.effort),
        String(input.shoeId || "") || null,
        String(input.notes || "").trim() || null,
        now,
        now,
      )
      .run();
    return { id };
  }

  if (action === "assignShoe") {
    await db
      .prepare("UPDATE runs SET shoe_id = ?, updated_at = ? WHERE id = ? AND owner_key = ?")
      .bind(String(input.shoeId || "") || null, now, String(input.runId), owner)
      .run();
    return { ok: true };
  }

  if (action === "setDefaultShoe") {
    await db.batch([
      db.prepare("UPDATE shoes SET is_default = 0 WHERE owner_key = ?").bind(owner),
      db
        .prepare("UPDATE shoes SET is_default = 1 WHERE id = ? AND owner_key = ?")
        .bind(String(input.shoeId), owner),
    ]);
    return { ok: true };
  }

  if (action === "toggleShoeStatus") {
    const status = input.status === "retired" ? "retired" : "active";
    await db
      .prepare("UPDATE shoes SET status = ?, is_default = CASE WHEN ? = 'retired' THEN 0 ELSE is_default END WHERE id = ? AND owner_key = ?")
      .bind(status, status, String(input.shoeId), owner)
      .run();
    return { ok: true };
  }

  throw new Error("Unsupported action.");
}
