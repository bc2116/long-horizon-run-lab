import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shoes = sqliteTable(
  "shoes",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    nickname: text("nickname"),
    color: text("color").notNull().default("#46c9a8"),
    startDate: text("start_date"),
    initialMiles: real("initial_miles").notNull().default(0),
    retirementThreshold: real("retirement_threshold").notNull().default(400),
    status: text("status").notNull().default("active"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("shoes_owner_idx").on(table.ownerKey)],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    date: text("date").notNull(),
    distance: real("distance").notNull(),
    route: text("route"),
    movingSeconds: real("moving_seconds"),
    elapsedSeconds: real("elapsed_seconds"),
    elevationGain: real("elevation_gain"),
    pace: real("pace"),
    avgHr: real("avg_hr"),
    endHr: real("end_hr"),
    hr2min: real("hr_2min"),
    cardioRecovery: real("cardio_recovery"),
    effort: real("effort"),
    shoeId: text("shoe_id"),
    notes: text("notes"),
    source: text("source").notNull().default("manual"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("runs_owner_date_idx").on(table.ownerKey, table.date),
    index("runs_shoe_idx").on(table.shoeId),
  ],
);

export const recoveryMonths = sqliteTable(
  "recovery_months",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    month: text("month").notNull(),
    cardioRecovery: real("cardio_recovery"),
    restingHr: real("resting_hr"),
    restingHrRest: real("resting_hr_rest"),
    hrv: real("hrv"),
    hrvRest: real("hrv_rest"),
    walkingHr: real("walking_hr"),
    vo2Max: real("vo2_max"),
    leanMassKg: real("lean_mass_kg"),
    leanMassRestKg: real("lean_mass_rest_kg"),
    bodyFat: real("body_fat"),
    bodyFatRest: real("body_fat_rest"),
    weightKg: real("weight_kg"),
    weightRestKg: real("weight_rest_kg"),
  },
  (table) => [index("recovery_owner_month_idx").on(table.ownerKey, table.month)],
);

export const distanceSummaries = sqliteTable(
  "distance_summaries",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    periodType: text("period_type").notNull(),
    period: text("period").notNull(),
    miles: real("miles").notNull(),
    source: text("source").notNull(),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    index("distance_owner_period_idx").on(
      table.ownerKey,
      table.periodType,
      table.period,
    ),
  ],
);

export const seedState = sqliteTable("seed_state", {
  ownerKey: text("owner_key").primaryKey(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at").notNull(),
});
