"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  AlertCircle,
  Archive,
  Check,
  Footprints,
  Plus,
  RefreshCw,
  RotateCcw,
  Timer,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { recoveryGateSnapshot } from "@/data/recovery-gate";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

type Run = {
  id: string;
  date: string;
  distance: number;
  route: string | null;
  moving_seconds: number | null;
  elapsed_seconds: number | null;
  elevation_gain: number | null;
  pace: number | null;
  avg_hr: number | null;
  end_hr: number | null;
  hr_2min: number | null;
  cardio_recovery: number | null;
  effort: number | null;
  shoe_id: string | null;
  notes: string | null;
  source: string;
};

type ShoeRecord = {
  id: string;
  brand: string;
  model: string;
  nickname: string | null;
  color: string;
  start_date: string | null;
  initial_miles: number;
  retirement_threshold: number;
  status: "active" | "retired";
  is_default: number;
  notes: string | null;
};

type RecoveryMonth = {
  id: string;
  month: string;
  cardio_recovery: number | null;
  resting_hr: number | null;
  resting_hr_rest: number | null;
  hrv: number | null;
  hrv_rest: number | null;
  walking_hr: number | null;
  vo2_max: number | null;
  lean_mass_kg: number | null;
  lean_mass_rest_kg: number | null;
  body_fat: number | null;
  body_fat_rest: number | null;
  weight_kg: number | null;
  weight_rest_kg: number | null;
};

type DistanceSummary = {
  id: string;
  period_type: "month" | "year";
  period: string;
  miles: number;
  source: string;
  observed_at: string;
};

type DataSet = {
  runs: Run[];
  shoes: ShoeRecord[];
  months: RecoveryMonth[];
  summaries: DistanceSummary[];
};

type Tab = "overview" | "runs" | "shoes" | "recovery" | "methodology";

const DEMO_READ_ONLY = true;

const chartColors = {
  mint: "#52d0ad",
  amber: "#e9b253",
  coral: "#ed7768",
  sky: "#74b9d1",
  violet: "#aa91d4",
  grid: "rgba(156,168,164,.14)",
  text: "#9ca8a4",
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" as const },
  plugins: {
    legend: {
      display: true,
      labels: { color: chartColors.text, boxWidth: 10, boxHeight: 2, usePointStyle: true },
    },
    tooltip: { displayColors: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: chartColors.text, maxTicksLimit: 8, font: { size: 10 } },
      border: { display: false },
    },
    y: {
      grid: { color: chartColors.grid },
      ticks: { color: chartColors.text, font: { size: 10 } },
      border: { display: false },
    },
  },
};

const barOptions = {
  ...lineOptions,
  plugins: { ...lineOptions.plugins, legend: { display: false } },
};

function formatMiles(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatPace(value: number | null) {
  if (!value) return "—";
  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 60);
  return `${minutes}:${String(seconds === 60 ? 0 : seconds).padStart(2, "0")}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function shoeLabel(shoe: ShoeRecord) {
  return shoe.nickname || `${shoe.brand} ${shoe.model}`;
}

export default function RunLedger() {
  const [data, setData] = useState<DataSet | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [drawer, setDrawer] = useState<"run" | "shoe" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load Long Horizon Run Lab.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Long Horizon Run Lab.");
    }
  }, []);

  useEffect(() => {
    // Initial data hydration is intentionally owned by the API-backed client shell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const mutate = async (input: Record<string, unknown>, message: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save.");
      await load();
      setToast(message);
      setDrawer(null);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="error-page">
        <div className="error-inner">
          <AlertCircle size={28} />
          <h1>Long Horizon Run Lab could not load</h1>
          <p>{error}</p>
          <button className="button primary" onClick={() => void load()}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading">
        <div className="loading-inner">
          <div className="spinner" />
          <p>Loading your running history…</p>
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "runs", label: "Runs" },
    { id: "shoes", label: "Shoes" },
    { id: "recovery", label: "Recovery" },
    { id: "methodology", label: "Method" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Footprints size={19} />
          </div>
          <div>
            <strong>Long Horizon Run Lab</strong>
            <span>Synthetic portfolio demo</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Long Horizon Run Lab views" role="tablist">
          {tabs.map((item) => (
            <button
              className="tab"
              role="tab"
              aria-selected={tab === item.id}
              key={item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button
            className="icon-button"
            title="Refresh data"
            aria-label="Refresh data"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
          </button>
          {DEMO_READ_ONLY ? (
            <span className="as-of">READ-ONLY</span>
          ) : (
            <button className="button primary" onClick={() => setDrawer("run")}>
              <Plus size={15} /> <span className="desktop-only">Log run</span>
            </button>
          )}
        </div>
      </header>

      <main className="content">
        {drawer === "run" && (
          <RunForm
            shoes={data.shoes}
            busy={busy}
            onCancel={() => setDrawer(null)}
            onSubmit={(input) => void mutate(input, "Run added.")}
          />
        )}
        {drawer === "shoe" && (
          <ShoeForm
            busy={busy}
            onCancel={() => setDrawer(null)}
            onSubmit={(input) => void mutate(input, "Shoe added to your rotation.")}
          />
        )}

        {tab === "overview" && (
          <Overview
            data={data}
            onAssign={(runId, shoeId) =>
              void mutate({ action: "assignShoe", runId, shoeId }, "Shoe assignment updated.")
            }
            onAddShoe={() => setDrawer("shoe")}
          />
        )}
        {tab === "runs" && (
          <RunsView
            data={data}
            onAssign={(runId, shoeId) =>
              void mutate({ action: "assignShoe", runId, shoeId }, "Shoe assignment updated.")
            }
            onAdd={() => setDrawer("run")}
          />
        )}
        {tab === "shoes" && (
          <ShoesView
            data={data}
            onAdd={() => setDrawer("shoe")}
            onDefault={(shoeId) =>
              void mutate({ action: "setDefaultShoe", shoeId }, "Default shoe updated.")
            }
            onStatus={(shoeId, status) =>
              void mutate(
                { action: "toggleShoeStatus", shoeId, status },
                status === "retired" ? "Shoe retired." : "Shoe returned to rotation.",
              )
            }
          />
        )}
        {tab === "recovery" && <RecoveryView data={data} />}
        {tab === "methodology" && <MethodologyView data={data} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Overview({
  data,
  onAssign,
  onAddShoe,
}: {
  data: DataSet;
  onAssign: (runId: string, shoeId: string) => void;
  onAddShoe: () => void;
}) {
  const stats = useStats(data);
  const monthly = useMonthlyMiles(data);
  const latestRuns = data.runs.slice(0, 8);
  const recentPace = [...data.runs].reverse().slice(-24);
  const activeShoes = stats.shoes.filter((item) => item.shoe.status === "active");

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Training snapshot</p>
          <h1>Your miles, recovery, and rotation</h1>
          <p className="lead">
            Synthetic summary totals drive monthly volume while a smaller detailed
            sample powers pace, recovery, and shoe-wear analysis.
          </p>
        </div>
        <span className="as-of">
          THROUGH {data.runs[0]?.date ? displayDate(data.runs[0].date).toUpperCase() : "—"}
        </span>
      </div>

      <div className="metric-grid">
        <Metric
          label="2026 miles"
          value={formatMiles(stats.officialYtdMiles)}
          note={`Synthetic summary • ${formatMiles(stats.officialMonthMiles)} in ${monthName(stats.officialMonthPeriod)}`}
        />
        <Metric label="Last 7 days" value={formatMiles(stats.weekMiles)} note={`${stats.weekRuns} runs`} tone="mint" />
        <Metric label="Latest pace" value={`${formatPace(data.runs[0]?.pace ?? null)}/mi`} note={data.runs[0]?.route || "Latest run"} tone="sky" />
        <Metric label="Unassigned" value={`${formatMiles(stats.unassignedMiles)} mi`} note="Select shoes on recent runs" tone={stats.unassignedMiles ? "amber" : "mint"} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Monthly mileage</h2>
              <p>Synthetic monthly totals</p>
            </div>
            <span className="as-of">GOAL 100 / MONTH</span>
          </div>
          <div className="chart-box">
            <Bar
              options={barOptions}
              data={{
                labels: monthly.labels,
                datasets: [
                  {
                    label: "Miles",
                    data: monthly.values,
                    backgroundColor: monthly.values.map((value) =>
                      value >= 100 ? chartColors.mint : chartColors.sky,
                    ),
                    borderRadius: 3,
                  },
                ],
              }}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Shoe rotation</h2>
              <p>Mileage includes each shoe&apos;s starting balance</p>
            </div>
            {!DEMO_READ_ONLY && (
              <button className="icon-button" title="Add shoe" aria-label="Add shoe" onClick={onAddShoe}>
                <Plus size={16} />
              </button>
            )}
          </div>
          {activeShoes.length ? (
            <div className="shoe-stack">
              {activeShoes.slice(0, 5).map(({ shoe, miles }) => (
                <div className="shoe-summary" key={shoe.id}>
                  <i className="shoe-dot" style={{ "--shoe-color": shoe.color } as React.CSSProperties} />
                  <div>
                    <div className="shoe-name">{shoeLabel(shoe)}</div>
                    <div className="shoe-sub">{shoe.brand} {shoe.model}</div>
                  </div>
                  <span className="shoe-miles">{formatMiles(miles)} mi</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Footprints size={24} />
              <p>Add your first shoe, then assign recent runs.</p>
              {!DEMO_READ_ONLY && (
                <button className="button" onClick={onAddShoe}>
                  <Plus size={14} /> Add shoe
                </button>
              )}
            </div>
          )}
          {stats.unassignedMiles > 0 && (
            <div className="callout">
              <AlertCircle size={15} />
              <span>{formatMiles(stats.unassignedMiles)} imported miles are waiting for shoe assignment.</span>
            </div>
          )}
        </section>

        <section className="panel full">
          <div className="panel-head">
            <div>
              <h2>Pace trend</h2>
              <p>Most recent 24 runs; lower is faster</p>
            </div>
            <span className="as-of">MIN / MILE</span>
          </div>
          <div className="chart-box compact">
            <Line
              options={{
                ...lineOptions,
                scales: {
                  ...lineOptions.scales,
                  y: { ...lineOptions.scales.y, reverse: true },
                },
              }}
              data={{
                labels: recentPace.map((run) => run.date.slice(5)),
                datasets: [
                  {
                    label: "Moving pace",
                    data: recentPace.map((run) => run.pace),
                    borderColor: chartColors.mint,
                    backgroundColor: "rgba(82,208,173,.12)",
                    fill: true,
                    pointRadius: 2,
                    tension: 0.28,
                  },
                ],
              }}
            />
          </div>
        </section>
      </div>

      <div className="section-head">
        <div>
          <h2>Recent runs</h2>
          <p className="section-copy">Assign or change a shoe without opening the run.</p>
        </div>
      </div>
      <RunTable runs={latestRuns} shoes={data.shoes} onAssign={onAssign} />
    </>
  );
}

function RunsView({
  data,
  onAssign,
  onAdd,
}: {
  data: DataSet;
  onAssign: (runId: string, shoeId: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Run history</p>
          <h1>Every recorded run</h1>
          <p className="lead">
            A compact synthetic history demonstrates duration, heart rate,
            recovery, route, elevation, notes, and footwear assignment.
          </p>
        </div>
        <div className="page-heading-actions">
          <span className="as-of">{data.runs.length} RUNS</span>
          {!DEMO_READ_ONLY && (
            <button className="button primary" type="button" onClick={onAdd} data-testid="runs-log-run">
              <Plus size={15} /> Log run
            </button>
          )}
        </div>
      </div>
      <RunTable runs={data.runs} shoes={data.shoes} onAssign={onAssign} />
    </>
  );
}

function RunTable({
  runs,
  shoes,
  onAssign,
}: {
  runs: Run[];
  shoes: ShoeRecord[];
  onAssign: (runId: string, shoeId: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Distance</th>
            <th>Moving</th>
            <th>Pace</th>
            <th>Avg HR</th>
            <th>Recovery</th>
            <th>Shoe</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{displayDate(run.date)}</td>
              <td className="mono">{formatMiles(run.distance)} mi</td>
              <td className="mono">{formatDuration(run.moving_seconds)}</td>
              <td className="mono">{formatPace(run.pace)}/mi</td>
              <td className="mono">{run.avg_hr ? `${Math.round(run.avg_hr)} bpm` : "—"}</td>
              <td className="mono">
                {run.cardio_recovery != null
                  ? `Apple ${Math.round(run.cardio_recovery)} bpm`
                  : run.end_hr != null && run.hr_2min != null
                    ? `2m Δ${Math.round(run.end_hr - run.hr_2min)} bpm`
                    : "—"}
              </td>
              <td>
                <select
                  className="shoe-select"
                  aria-label={`Shoe for ${displayDate(run.date)}`}
                  value={run.shoe_id || ""}
                  onChange={(event) => onAssign(run.id, event.target.value)}
                  disabled={DEMO_READ_ONLY}
                >
                  <option value="">Unassigned</option>
                  {shoes.map((shoe) => (
                    <option key={shoe.id} value={shoe.id}>
                      {shoeLabel(shoe)}{shoe.status === "retired" ? " (retired)" : ""}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShoesView({
  data,
  onAdd,
  onDefault,
  onStatus,
}: {
  data: DataSet;
  onAdd: () => void;
  onDefault: (shoeId: string) => void;
  onStatus: (shoeId: string, status: "active" | "retired") => void;
}) {
  const stats = useStats(data);
  const [showRetired, setShowRetired] = useState(false);
  const activeShoes = stats.shoes.filter(({ shoe }) => shoe.status === "active");
  const retiredShoes = stats.shoes.filter(({ shoe }) => shoe.status === "retired");
  const visibleShoes = showRetired ? retiredShoes : activeShoes;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Equipment ledger</p>
          <h1>{showRetired ? "Retired shoe library" : "Active running shoes"}</h1>
          <p className="lead">
            {showRetired
              ? "Historical mileage and run assignments stay here for comparison, even after a pair leaves the rotation."
              : "Your current rotation stays front and center. Mileage includes each pair's starting balance and assigned runs."}
          </p>
        </div>
        {!DEMO_READ_ONLY && (
          <button className="button primary" onClick={onAdd}>
            <Plus size={15} /> Add shoe
          </button>
        )}
      </div>

      {stats.shoes.length ? (
        <>
          <div className="shoe-library-tabs" role="tablist" aria-label="Shoe collection view">
            <button
              aria-selected={!showRetired}
              className={`shoe-library-tab ${!showRetired ? "selected" : ""}`}
              onClick={() => setShowRetired(false)}
              role="tab"
              type="button"
            >
              <Footprints size={15} /> Active rotation <span>{activeShoes.length}</span>
            </button>
            <button
              aria-selected={showRetired}
              className={`shoe-library-tab ${showRetired ? "selected" : ""}`}
              onClick={() => setShowRetired(true)}
              role="tab"
              type="button"
            >
              <Archive size={15} /> Retired library <span>{retiredShoes.length}</span>
            </button>
          </div>

          {visibleShoes.length ? (
            <div className={`shoe-grid ${showRetired ? "retired-library" : "active-rotation"}`}>
              {visibleShoes.map(({ shoe, miles }) => {
            const progress = Math.min(100, (miles / shoe.retirement_threshold) * 100);
            return (
              <article
                className={`shoe-card ${shoe.status}`}
                key={shoe.id}
                style={
                  {
                    "--shoe-color": shoe.color,
                    "--progress": `${progress}%`,
                  } as React.CSSProperties
                }
              >
                <div className="shoe-head">
                  <div>
                    <p className="shoe-meta">{shoe.brand}</p>
                    <h3>{shoeLabel(shoe)}</h3>
                    {shoe.nickname && <p className="shoe-sub">{shoe.model}</p>}
                  </div>
                  <span className={`status ${shoe.status}`}>
                    {shoe.status === "retired" ? "Retired" : shoe.is_default ? "Default" : "Active"}
                  </span>
                </div>
                <div className="shoe-total">
                  {formatMiles(miles)}<span>miles</span>
                </div>
                <div className="progress" aria-label={`${Math.round(progress)} percent of threshold`}>
                  <span />
                </div>
                <div className="progress-copy">
                  <span>{formatMiles(shoe.initial_miles)} starting</span>
                  <span>{formatMiles(shoe.retirement_threshold)} threshold</span>
                </div>
                <div className="shoe-actions">
                  {!DEMO_READ_ONLY && shoe.status === "active" && !shoe.is_default && (
                    <button className="button ghost" onClick={() => onDefault(shoe.id)}>
                      <Check size={13} /> Make default
                    </button>
                  )}
                  {!DEMO_READ_ONLY && (
                    <button
                      className="button ghost"
                      onClick={() =>
                        onStatus(shoe.id, shoe.status === "active" ? "retired" : "active")
                      }
                    >
                      {shoe.status === "active" ? <Archive size={13} /> : <RotateCcw size={13} />}
                      {shoe.status === "active" ? "Retire" : "Reactivate"}
                    </button>
                  )}
                </div>
              </article>
            );
              })}
            </div>
          ) : (
            <section className="panel empty-state">
              <Footprints size={28} />
              <h2>{showRetired ? "No retired shoes" : "No shoes in rotation"}</h2>
              <p>
                {showRetired
                  ? "Retired pairs will remain here with their mileage and run history."
                  : "Reactivate a retired pair or add a current shoe to start a rotation."}
              </p>
            </section>
          )}
        </>
      ) : (
        <section className="panel empty-state">
          <Footprints size={28} />
          <h2>No shoes yet</h2>
          <p>Add current and retired pairs, including any miles already on them.</p>
          {!DEMO_READ_ONLY && (
            <button className="button primary" onClick={onAdd}>
              <Plus size={14} /> Add your first shoe
            </button>
          )}
        </section>
      )}
    </>
  );
}

function RecoveryView({ data }: { data: DataSet }) {
  const months = data.months.filter((month) => month.resting_hr != null);
  const recent = months.slice(-30);
  const latest = months.at(-1);
  const gate = recoveryGateSnapshot;
  const latestRunRecovery = data.runs.find(
    (run) => run.cardio_recovery != null,
  );
  const body = data.months.filter((month) => month.weight_kg != null);
  const recentBody = body.slice(-30);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Recovery telemetry</p>
          <h1>Your longitudinal baseline</h1>
          <p className="lead">
            Synthetic monthly recovery and body-composition signals demonstrate
            longitudinal comparison. This is a product demo, not medical advice.
          </p>
        </div>
        <span className="as-of">MONTHLY THROUGH {latest?.month || "—"}</span>
      </div>

      <section className="panel recovery-gate-panel">
        <div className="panel-head">
          <div>
            <h2>Recovery gate</h2>
            <p>
              {gate.window} rest-day-only snapshot from {gate.restDays}.
            </p>
          </div>
          <span className="as-of">REFRESHED {gate.refreshedAt.toUpperCase()}</span>
        </div>
        <div className="gate-grid recovery-gate-grid">
          {gate.metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong className={`recovery-gate-value ${metric.tone}`}>{metric.value}</strong>
              <small>{metric.threshold}</small>
              <b className={`recovery-gate-status ${metric.tone}`}>{metric.status}</b>
            </div>
          ))}
        </div>
        <div className="recovery-source-note">
          <AlertCircle size={15} />
          <p>
            <strong>{gate.source}.</strong> The gate uses rest-day values so a
            workout&apos;s same-day response does not masquerade as baseline change.
          </p>
        </div>
      </section>

      <div className="recovery-context-grid">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Latest synthetic context</h2><p>Same-day values, not gate inputs</p></div>
          </div>
          <div className="telemetry-list">
            {gate.sameDay.map((metric) => (
              <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div><h2>Latest synthetic run recovery</h2><p>Displayed and derived values stay distinct</p></div>
          </div>
          <div className="telemetry-list">
            {gate.runRecovery.map((metric) => (
              <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
            ))}
          </div>
        </section>
      </div>

      <div className="callout recovery-callout">
        <AlertCircle size={16} />
        <div>
          <strong>{gate.footwear.title}.</strong>
          <p>{gate.footwear.detail}</p>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Device cardio recovery" value={latestRunRecovery?.cardio_recovery != null ? `${latestRunRecovery.cardio_recovery} bpm` : latest?.cardio_recovery != null ? `${latest.cardio_recovery} bpm` : "—"} note={latestRunRecovery ? displayDate(latestRunRecovery.date) : "Synthetic displayed value"} tone="mint" />
        <Metric label="Resting HR" value={latest?.resting_hr ? `${latest.resting_hr.toFixed(1)} bpm` : "—"} note="Monthly average" tone="sky" />
        <Metric label="HRV" value={latest?.hrv ? `${latest.hrv.toFixed(1)} ms` : "—"} note="SDNN" tone="amber" />
        <Metric label="VO₂ max" value={latest?.vo2_max ? latest.vo2_max.toFixed(1) : "—"} note="ml/kg/min" />
      </div>

      <div className="recovery-grid">
        <section className="panel wide">
          <div className="panel-head">
            <div><h2>Heart-rate recovery</h2><p>Monthly recovery, RHR, and HRV</p></div>
          </div>
          <div className="chart-box">
            <Line
              options={lineOptions}
              data={{
                labels: recent.map((month) => month.month),
                datasets: [
                  { label: "Cardio recovery", data: recent.map((month) => month.cardio_recovery), borderColor: chartColors.mint, pointRadius: 1.5, tension: 0.25 },
                  { label: "Resting HR", data: recent.map((month) => month.resting_hr), borderColor: chartColors.coral, pointRadius: 1.5, tension: 0.25 },
                  { label: "HRV", data: recent.map((month) => month.hrv), borderColor: chartColors.amber, pointRadius: 1.5, tension: 0.25 },
                ],
              }}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>VO₂ max</h2><p>Synthetic device estimate</p></div>
          </div>
          <div className="chart-box">
            <Line
              options={{ ...lineOptions, plugins: { ...lineOptions.plugins, legend: { display: false } } }}
              data={{
                labels: recent.map((month) => month.month),
                datasets: [{ label: "VO₂ max", data: recent.map((month) => month.vo2_max), borderColor: chartColors.sky, backgroundColor: "rgba(116,185,209,.1)", fill: true, pointRadius: 1.5, tension: 0.28 }],
              }}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Body composition</h2><p>Weight and body fat</p></div>
          </div>
          <div className="chart-box">
            <Line
              options={lineOptions}
              data={{
                labels: recentBody.map((month) => month.month),
                datasets: [
                  { label: "Weight kg", data: recentBody.map((month) => month.weight_kg), borderColor: chartColors.violet, pointRadius: 1.5, tension: 0.25 },
                  { label: "Body fat %", data: recentBody.map((month) => month.body_fat), borderColor: chartColors.amber, pointRadius: 1.5, tension: 0.25 },
                ],
              }}
            />
          </div>
          <div className="callout recovery-callout compact">
            <AlertCircle size={15} />
            <p>{gate.bodyComposition}</p>
          </div>
        </section>
      </div>
    </>
  );
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function signed(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function monthName(period: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${period}-15T12:00:00Z`));
}

function MethodologyView({ data }: { data: DataSet }) {
  const telemetryMonths = data.months.filter(
    (month) =>
      month.cardio_recovery != null ||
      month.resting_hr != null ||
      month.hrv != null ||
      month.walking_hr != null ||
      month.vo2_max != null,
  );
  const bodyMonths = data.months.filter(
    (month) =>
      month.lean_mass_kg != null ||
      month.body_fat != null ||
      month.weight_kg != null,
  );
  const splitMonths = data.months.filter(
    (month) =>
      month.month.startsWith("2026-") &&
      month.resting_hr != null &&
      month.resting_hr_rest != null &&
      month.hrv != null &&
      month.hrv_rest != null,
  );
  const rhrGap = average(
    splitMonths.map((month) => month.resting_hr! - month.resting_hr_rest!),
  );
  const hrvGap = average(
    splitMonths.map((month) => month.hrv! - month.hrv_rest!),
  );
  const monthlyVolume = data.summaries
    .filter(
      (summary) =>
        summary.period_type === "month" && summary.period.startsWith("2026-"),
    )
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((summary) => ({
      ...summary,
      runs: data.runs.filter((run) => run.date.startsWith(summary.period)).length,
    }));
  const volumeRows = monthlyVolume.map((row, index) => ({
    ...row,
    cumulative: monthlyVolume
      .slice(0, index + 1)
      .reduce((sum, item) => sum + item.miles, 0),
  }));
  const routeRows = monthlyVolume.map((summary) => {
    const monthRuns = data.runs.filter((run) => run.date.startsWith(summary.period));
    const routeStats = (needle: string) => {
      const paces = monthRuns
        .filter((run) => run.route?.includes(needle) && run.pace != null)
        .map((run) => Number(run.pace));
      return {
        count: paces.length,
        mean: average(paces),
        best: paces.length ? Math.min(...paces) : null,
      };
    };
    return { month: summary.period, six: routeStats("River"), eight: routeStats("Greenway") };
  });
  const efficiencyRuns = [...data.runs]
    .filter((run) => run.avg_hr != null && run.pace != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const baselineRuns = efficiencyRuns.filter(
    (run) => run.date >= "2026-01-01" && run.date <= "2026-03-31",
  );
  const xMean = average(baselineRuns.map((run) => Number(run.pace)));
  const yMean = average(baselineRuns.map((run) => Number(run.avg_hr)));
  const denominator = baselineRuns.reduce(
    (sum, run) => sum + (Number(run.pace) - xMean) ** 2,
    0,
  );
  const slope = denominator
    ? baselineRuns.reduce(
        (sum, run) =>
          sum + (Number(run.pace) - xMean) * (Number(run.avg_hr) - yMean),
        0,
      ) / denominator
    : 0;
  const intercept = yMean - slope * xMean;
  const shoeById = new Map(data.shoes.map((shoe) => [shoe.id, shoeLabel(shoe)]));
  const recoveryRows = [...data.runs]
    .filter(
      (run) =>
        run.date >= "2026-01-01" &&
        (run.end_hr != null || run.cardio_recovery != null),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const validDrops = recoveryRows
    .filter((run) => run.end_hr != null && run.hr_2min != null)
    .map((run) => Number(run.end_hr) - Number(run.hr_2min));
  const rules = [
    ["Run day versus rest day", "Compare baseline signals under consistent conditions and label same-day workout values separately."],
    ["Effort is not independent", "A heart-rate-derived effort score cannot independently corroborate another heart-rate claim."],
    ["Recovery anchors differ", "Keep device-displayed recovery distinct from separately derived time-point drops."],
    ["HRV is HR-coupled", "Treat SDNN cautiously when heart rate is already part of the argument."],
    ["Use comparable weather", "Temperature and moisture context should be compared together."],
    ["Stoppage is noise", "Elapsed minus moving time is a quality-control field, not a training signal."],
    ["BIA confidence", "Compare body-composition readings only under consistent measurement conditions."],
    ["Respect fit bounds", "Efficiency points outside the baseline pace range are extrapolations."],
    ["Footwear is a variable", "Separate shoe effects from pace, terrain, weather, and workout type."],
  ];
  const openItems = [
    "Add an explicit import pipeline for common workout-export formats.",
    "Add edit and delete workflows with an audit trail.",
    "Add integration coverage for first-run D1 seeding and mutations.",
    "Derive the year label from the latest summary instead of fixing it in UI copy.",
    "Add accessible chart-table alternatives for every visualization.",
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Evidence and interpretation</p>
          <h1>Recovery Telemetry methodology</h1>
          <p className="lead">
            Eleven sections generated from the same synthetic run, recovery,
            mileage, and shoe records used by the dashboard. Measurements,
            derivations, and interpretation remain visibly separate.
          </p>
        </div>
        <span className="as-of">SYNTHETIC DATASET</span>
      </div>

      <nav className="method-nav" aria-label="Methodology sections">
        {[
          "Context", "Instrument", "Rules", "Inventory", "Demo arc", "Trend",
          "Hypotheses", "Corrections", "Footwear", "Open items", "Runbook",
        ].map((label, index) => (
          <a key={label} href={`#method-${index + 1}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>{label}
          </a>
        ))}
      </nav>

      <article className="methodology">
        <section id="method-1" className="method-section">
          <p className="method-kicker">01 / Demo context</p>
          <h2>A fictional runner, by design</h2>
          <div className="fact-grid">
            <div><span>Data status</span><strong>Fully synthetic</strong><small>No personal records</small></div>
            <div><span>Detailed sample</span><strong>{data.runs.length} runs</strong><small>Multiple demo routes</small></div>
            <div><span>Equipment</span><strong>{data.shoes.length} pairs</strong><small>Active and retired</small></div>
            <div><span>Summary rows</span><strong>{data.summaries.length}</strong><small>Month and year</small></div>
          </div>
          <p className="method-copy">
            The fixture demonstrates how route, heart-rate, recovery, equipment,
            and body-composition fields can coexist without publishing anyone&apos;s
            real health history. It is a software demonstration, not medical advice.
          </p>
        </section>

        <section id="method-2" className="method-section">
          <p className="method-kicker">02 / The instrument</p>
          <h2>Four data surfaces, one owner-scoped ledger</h2>
          <div className="source-list">
            <div><strong>Detailed runs</strong><span>Pace, route, stoppage, recovery, effort, and shoe assignment.</span></div>
            <div><strong>Monthly telemetry</strong><span>Recovery, RHR, HRV, walking HR, VO2 max, and rest-day equivalents.</span></div>
            <div><strong>Body composition</strong><span>Weight, lean mass, body fat, and rest-day reference values.</span></div>
            <div><strong>Summary totals</strong><span>Imported month and year mileage, kept separate from the detailed subset.</span></div>
          </div>
          <div className="gate-grid" aria-label="Recovery gate thresholds">
            <div><span>Cardio recovery</span><strong>Baseline first</strong><small>Keep device and derived values separate</small></div>
            <div><span>Resting HR</span><strong>Compare like days</strong><small>Rest and run context matters</small></div>
            <div><span>HRV (SDNN)</span><strong>Use a trend</strong><small>Do not overread one sample</small></div>
            <div><span>Walking HR</span><strong>Context only</strong><small>Not a standalone verdict</small></div>
          </div>
        </section>

        <section id="method-3" className="method-section">
          <p className="method-kicker">03 / Interpretation rules</p>
          <h2>Nine interpretation guardrails</h2>
          <ol className="rule-list">
            {rules.map(([title, description]) => (
              <li key={title}><strong>{title}</strong><span>{description}</span></li>
            ))}
          </ol>
          <div className="evidence-strip">
            <div><span>Synthetic RHR delta</span><strong>{signed(rhrGap, 2)} bpm</strong><small>all-day minus rest-day reference</small></div>
            <div><span>Synthetic HRV delta</span><strong>{signed(hrvGap, 2)} ms</strong><small>all-day minus rest-day reference</small></div>
            <p>The demo computes these deltas from its fixture instead of embedding a conclusion.</p>
          </div>
        </section>

        <section id="method-4" className="method-section">
          <p className="method-kicker">04 / Data inventory</p>
          <h2>Current source coverage</h2>
          <div className="inventory-grid">
            <div><strong>{telemetryMonths.length}</strong><span>monthly telemetry rows</span></div>
            <div><strong>{bodyMonths.length}</strong><span>body-composition rows</span></div>
            <div><strong>{data.runs.filter((run) => run.pace != null).length}</strong><span>route pace rows</span></div>
            <div><strong>{data.runs.filter((run) => run.moving_seconds != null && run.elapsed_seconds != null).length}</strong><span>stoppage rows</span></div>
            <div><strong>{recoveryRows.length}</strong><span>recovery rows</span></div>
            <div><strong>{efficiencyRuns.length}</strong><span>efficiency rows</span></div>
          </div>
        </section>

        <section id="method-5" className="method-section">
          <p className="method-kicker">05 / Synthetic trend arc</p>
          <h2>Volume and route pace</h2>
          <div className="method-table-wrap">
            <table className="method-table">
              <thead><tr><th>Month</th><th>Runs</th><th>Miles</th><th>Cumulative</th><th>River avg / best</th><th>Greenway avg / best</th></tr></thead>
              <tbody>{volumeRows.map((row) => {
                const routes = routeRows.find((item) => item.month === row.period)!;
                return <tr key={row.period}>
                  <td>{monthName(row.period)}</td><td>{row.runs}</td><td>{row.miles.toFixed(1)}</td><td>{row.cumulative.toFixed(1)}</td>
                  <td>{routes.six.count ? `${formatPace(routes.six.mean)} / ${formatPace(routes.six.best)}` : "-"}</td>
                  <td>{routes.eight.count ? `${formatPace(routes.eight.mean)} / ${formatPace(routes.eight.best)}` : "-"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <p className="method-copy">The synthetic monthly summaries sum to {volumeRows.at(-1)?.cumulative.toFixed(2)} miles. Route averages come from the smaller detailed fixture.</p>
        </section>

        <section id="method-6" className="method-section">
          <p className="method-kicker">06 / Data-driven trend example</p>
          <h2>Baseline fit and matched observations</h2>
          <p className="method-copy">
            The synthetic baseline fit is recomputed from first-quarter samples: average HR = {intercept.toFixed(2)} {slope < 0 ? "-" : "+"} {Math.abs(slope).toFixed(3)} x pace. Its observed pace range is {Math.min(...baselineRuns.map((run) => Number(run.pace))).toFixed(2)} to {Math.max(...baselineRuns.map((run) => Number(run.pace))).toFixed(2)} min/mi.
          </p>
          <h3 className="method-subhead">Matched-pace efficiency</h3>
          <div className="method-table-wrap">
            <table className="method-table dense">
              <thead><tr><th>Date</th><th>Phase</th><th>Shoe</th><th>Pace</th><th>Avg HR</th><th>Expected</th><th>Excess</th></tr></thead>
              <tbody>{efficiencyRuns.map((run) => {
                const expected = intercept + slope * Number(run.pace);
                const assignedShoe = run.shoe_id ? shoeById.get(run.shoe_id) : null;
                return <tr key={run.id}>
                  <td>{run.date.slice(5)}</td><td>{run.date <= "2026-03-31" ? "baseline" : "later"}</td>
                  <td>{assignedShoe || "Unassigned"}</td>
                  <td>{formatPace(run.pace)}</td><td>{Math.round(Number(run.avg_hr))}</td><td>{expected.toFixed(1)}</td>
                  <td className={Number(run.avg_hr) - expected > 5 ? "warning-text" : "good-text"}>{signed(Number(run.avg_hr) - expected, 1)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <p className="table-note">Every row and shoe assignment in this table comes from the synthetic fixture.</p>
          <h3 className="method-subhead">Recovery record</h3>
          <div className="method-table-wrap">
            <table className="method-table dense">
              <thead><tr><th>Date</th><th>End HR</th><th>2 min</th><th>Drop</th><th>Apple CR</th><th>Effort</th></tr></thead>
              <tbody>{recoveryRows.map((run) => {
                const drop = run.end_hr != null && run.hr_2min != null ? run.end_hr - run.hr_2min : null;
                return <tr key={run.id}><td>{run.date.slice(5)}</td><td>{run.end_hr ?? "-"}</td><td>{run.hr_2min ?? "dropout"}</td><td>{drop ?? "n/a"}</td><td>{run.cardio_recovery ?? "-"}</td><td>{run.effort ?? "-"}</td></tr>;
              })}</tbody>
            </table>
          </div>
          <div className="evidence-strip">
            <div><span>Valid two-minute mean</span><strong>{average(validDrops).toFixed(1)} bpm</strong><small>{validDrops.length} readings</small></div>
            <div><span>Best valid drop</span><strong>{Math.max(...validDrops)} bpm</strong><small>dropouts excluded</small></div>
            <p>Displayed recovery and the derived two-minute drop remain separate fields; missing values stay null.</p>
          </div>
        </section>

        <section id="method-7" className="method-section">
          <p className="method-kicker">07 / Hypotheses adjudicated</p>
          <h2>What held and what did not</h2>
          <div className="verdict-list">
            <div><span className="verdict refuted">Refuted</span><strong>Elapsed time can substitute for moving time.</strong><p>The demo preserves both because stoppage changes elapsed pace without changing moving pace.</p></div>
            <div><span className="verdict supported">Supported</span><strong>Summary totals can coexist with a detailed subset.</strong><p>The UI labels their provenance and does not manufacture missing workouts.</p></div>
            <div><span className="verdict supported">Supported</span><strong>Shoe mileage should be derived from assignments.</strong><p>Starting mileage plus assigned runs produces an auditable total.</p></div>
          </div>
        </section>

        <section id="method-8" className="method-section">
          <p className="method-kicker">08 / Corrections log</p>
          <h2>Claims revised when the evidence changed</h2>
          <div className="correction-list">
            <div><time>v1</time><p><del>Missing detailed runs imply zero mileage.</del><strong> Summary totals remain authoritative when detail coverage is incomplete.</strong></p></div>
            <div><time>v2</time><p><del>Zero and unavailable are interchangeable.</del><strong> Nullable fields now preserve missing sensor values.</strong></p></div>
            <div><time>v3</time><p><del>Shoe totals are entered by hand.</del><strong> Mileage is derived from a starting balance and run assignments.</strong></p></div>
          </div>
        </section>

        <section id="method-9" className="method-section">
          <p className="method-kicker">09 / Footwear program</p>
          <h2>Rotation is now part of the experiment</h2>
          <div className="source-list">
            {data.shoes.map((shoe) => <div key={shoe.id}><strong>{shoeLabel(shoe)}</strong><span>{shoe.brand} {shoe.model} · {shoe.status} · {shoe.is_default ? "default" : "alternate"}</span></div>)}
          </div>
          <p className="method-copy">The synthetic rotation includes daily, faster, and retired pairs. A real comparison should balance pace, route, weather, and workout type before attributing a difference to footwear.</p>
        </section>

        <section id="method-10" className="method-section">
          <p className="method-kicker">10 / Open items</p>
          <h2>Known gaps, not hidden assumptions</h2>
          <ol className="open-list">{openItems.map((item) => <li key={item}>{item}</li>)}</ol>
        </section>

        <section id="method-11" className="method-section">
          <p className="method-kicker">11 / Maintenance runbook</p>
          <h2>Log once, validate twice</h2>
          <ol className="runbook-list">
            <li><strong>Record the run.</strong><span>Date, distance, route, moving and elapsed time, elevation, average HR, end HR, two-minute HR, displayed recovery, effort, and shoe when available.</span></li>
            <li><strong>Preserve nulls.</strong><span>Sensor dropouts stay null; zero is a physiological value and must not stand in for missing data.</span></li>
            <li><strong>Recompute derived views.</strong><span>Route pace, efficiency fit, recovery mean, shoe mileage, and inventory all read from the same records.</span></li>
            <li><strong>Keep totals distinct.</strong><span>Imported monthly and yearly totals remain authoritative when detailed workout coverage is incomplete.</span></li>
            <li><strong>Validate before publishing.</strong><span>Run privacy scans, tests, a production build, and an access-control smoke check.</span></li>
          </ol>
        </section>
      </article>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "" | "mint" | "amber" | "sky";
}) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${tone}`}>{value}</span>
      <span className="metric-note">{note}</span>
    </div>
  );
}

function RunForm({
  shoes,
  busy,
  onCancel,
  onSubmit,
}: {
  shoes: ShoeRecord[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const defaultShoe = shoes.find((shoe) => shoe.is_default && shoe.status === "active");
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const durationMinutes = Number(values.get("durationMinutes") || 0);
    onSubmit({
      action: "addRun",
      date: values.get("date"),
      distance: values.get("distance"),
      route: values.get("route"),
      movingSeconds: durationMinutes ? durationMinutes * 60 : null,
      elapsedSeconds: Number(values.get("elapsedMinutes") || 0) * 60 || null,
      elevationGain: values.get("elevationGain"),
      avgHr: values.get("avgHr"),
      cardioRecovery: values.get("cardioRecovery"),
      effort: values.get("effort"),
      shoeId: values.get("shoeId"),
      notes: values.get("notes"),
    });
  };
  return (
    <section className="panel drawer">
      <div className="panel-head">
        <div><h2>Log a run</h2><p>Distance and date are required. Add detail when available.</p></div>
        <Timer size={18} />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="forms-grid">
          <Field label="Date"><input className="input" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Distance (miles)"><input className="input" name="distance" type="number" min="0.1" step="0.01" required /></Field>
          <Field label="Moving time (minutes)"><input className="input" name="durationMinutes" type="number" min="1" step="0.01" /></Field>
          <Field label="Elapsed time (minutes)"><input className="input" name="elapsedMinutes" type="number" min="1" step="0.01" /></Field>
          <Field label="Route"><input className="input" name="route" placeholder="Sample loop" /></Field>
          <Field label="Elevation gain (ft)"><input className="input" name="elevationGain" type="number" min="0" /></Field>
          <Field label="Average HR"><input className="input" name="avgHr" type="number" min="40" max="230" /></Field>
          <Field label="Cardio recovery"><input className="input" name="cardioRecovery" type="number" min="0" /></Field>
          <Field label="Effort (1–10)"><input className="input" name="effort" type="number" min="1" max="10" /></Field>
          <Field label="Shoe">
            <select className="select" name="shoeId" defaultValue={defaultShoe?.id || ""}>
              <option value="">Unassigned</option>
              {shoes.filter((shoe) => shoe.status === "active").map((shoe) => <option value={shoe.id} key={shoe.id}>{shoeLabel(shoe)}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="wide"><input className="input" name="notes" placeholder="Weather, route changes, how it felt…" /></Field>
        </div>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? "Saving…" : "Save run"}</button>
        </div>
      </form>
    </section>
  );
}

function ShoeForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onSubmit({
      action: "addShoe",
      brand: values.get("brand"),
      model: values.get("model"),
      nickname: values.get("nickname"),
      color: values.get("color"),
      startDate: values.get("startDate"),
      initialMiles: values.get("initialMiles"),
      retirementThreshold: values.get("retirementThreshold"),
      isDefault: values.get("isDefault") === "on",
      notes: values.get("notes"),
    });
  };
  return (
    <section className="panel drawer">
      <div className="panel-head">
        <div><h2>Add a running shoe</h2><p>Use starting mileage for a pair already in rotation.</p></div>
        <Footprints size={18} />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="forms-grid">
          <Field label="Brand"><input className="input" name="brand" required placeholder="ASICS" /></Field>
          <Field label="Model"><input className="input" name="model" required placeholder="Novablast 5" /></Field>
          <Field label="Nickname"><input className="input" name="nickname" placeholder="Blue pair" /></Field>
          <Field label="Color"><input className="input" name="color" type="color" defaultValue="#52d0ad" /></Field>
          <Field label="Start date"><input className="input" name="startDate" type="date" /></Field>
          <Field label="Starting miles"><input className="input" name="initialMiles" type="number" min="0" step="0.1" defaultValue="0" /></Field>
          <Field label="Retirement threshold"><input className="input" name="retirementThreshold" type="number" min="50" step="10" defaultValue="400" /></Field>
          <Field label="Default for new runs"><label><input name="isDefault" type="checkbox" /> Use this pair by default</label></Field>
          <Field label="Notes" className="full"><input className="input" name="notes" placeholder="Size, terrain, fit notes…" /></Field>
        </div>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? "Saving…" : "Add shoe"}</button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function useStats(data: DataSet) {
  return useMemo(() => {
    const ytdMiles = data.runs.reduce((sum, run) => sum + Number(run.distance), 0);
    const officialYtdMiles = Number(
      data.summaries.find(
        (item) => item.period_type === "year" && item.period === "2026",
      )?.miles || ytdMiles,
    );
    const officialMonth = data.summaries
      .filter((item) => item.period_type === "month")
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    const officialMonthMiles = Number(officialMonth?.miles || 0);
    const officialMonthPeriod = officialMonth?.period || "2026-08";
    const latestDate = data.runs[0]?.date ? new Date(`${data.runs[0].date}T12:00:00Z`) : new Date();
    const weekStart = new Date(latestDate);
    weekStart.setUTCDate(latestDate.getUTCDate() - 6);
    const weekRuns = data.runs.filter((run) => new Date(`${run.date}T12:00:00Z`) >= weekStart);
    const unassignedMiles = data.runs
      .filter((run) => !run.shoe_id)
      .reduce((sum, run) => sum + Number(run.distance), 0);
    const shoes = data.shoes.map((shoe) => ({
      shoe,
      miles:
        Number(shoe.initial_miles) +
        data.runs
          .filter((run) => run.shoe_id === shoe.id)
          .reduce((sum, run) => sum + Number(run.distance), 0),
    }));
    return {
      ytdMiles,
      officialYtdMiles,
      officialMonthMiles,
      officialMonthPeriod,
      weekMiles: weekRuns.reduce((sum, run) => sum + Number(run.distance), 0),
      weekRuns: weekRuns.length,
      unassignedMiles,
      shoes,
    };
  }, [data]);
}

function useMonthlyMiles(data: DataSet) {
  return useMemo(() => {
    const official = data.summaries.filter(
      (item) => item.period_type === "month",
    );
    if (official.length) {
      return {
        labels: official.map((item) =>
          new Intl.DateTimeFormat("en-US", {
            month: "short",
            timeZone: "UTC",
          }).format(new Date(`${item.period}-01T12:00:00Z`)),
        ),
        values: official.map((item) => Number(item.miles)),
      };
    }
    const totals = new Map<string, number>();
    for (const run of [...data.runs].reverse()) {
      const month = run.date.slice(0, 7);
      totals.set(month, (totals.get(month) || 0) + Number(run.distance));
    }
    const entries = [...totals.entries()];
    return {
      labels: entries.map(([month]) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))),
      values: entries.map(([, miles]) => Number(miles.toFixed(1))),
    };
  }, [data]);
}
