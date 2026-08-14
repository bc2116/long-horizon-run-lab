# Long Horizon Run Lab

A privacy-safe, mobile-first running, recovery, and shoe-mileage dashboard built
as a public portfolio project. Every included record is synthetic and the demo
API is intentionally read-only.

## Included

- Deterministic synthetic runs, recovery months, shoes, and summary totals.
- Monthly and annual totals kept separately from the detailed run subset so
  missing detailed coverage never becomes zero activity.
- Durable run, shoe, and recovery storage through Sites D1.
- Active and retired shoes, starting mileage, defaults, and retirement thresholds.
- Fast shoe assignment and reassignment for any run.
- A complete private-edition mutation model for run, shoe, and assignment flows;
  the public API rejects writes with HTTP 405.
- Monthly mileage, pace, recovery, VO2 max, and body-composition charts.
- A synthetic rest-day Recovery Gate that keeps same-day telemetry and derived
  recovery values visibly separate from device-displayed samples.
- A data-backed methodology view covering provenance, interpretation rules,
  evidence, corrections, footwear, open items, and maintenance.

The data contract and interpretation rules live in
`docs/RUNNING-TRACKING-DOCUMENTATION.md`. In-app tables are recomputed from the
API dataset so the presentation remains reproducible.

## Architecture

- Next.js-compatible React UI compiled by Vinext and Vite.
- Cloudflare Workers runtime with Sites D1 persistence.
- Owner-scoped relational tables for runs, shoes, recovery months, summaries,
  and seed version state.
- Idempotent synthetic seeding and derived shoe mileage.
- Source-level privacy regression tests.

## Local development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run lint
npm test
```

The checked-in Sites metadata contains a placeholder project ID. Create a new
Sites project and database before deploying your own copy. If real health or
training data is added, use authenticated owner scoping and private access.

## Privacy split

The real-data edition is deliberately separate: private GitHub repository,
private Sites project, owner-only access, and no shared Git history with this
portfolio repository.
