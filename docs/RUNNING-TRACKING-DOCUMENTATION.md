# Long Horizon Run Lab: Data and Methodology

This repository is the privacy-safe portfolio edition of Long Horizon Run Lab.
Every included run, route, shoe, recovery value, and body-composition value is a
deterministic synthetic fixture. No personal training or health record belongs
in this repository or its Git history.

## 1. Product boundary

The public edition demonstrates the product surface in read-only mode:

- monthly and yearly distance summaries;
- a smaller detailed-run sample for pace and recovery analysis;
- active and retired shoe rotation views;
- derived shoe mileage;
- longitudinal recovery and body-composition charts; and
- explicit separation of observed, derived, and unavailable values.

The live-data edition is maintained in a separate private repository and an
owner-only deployment.

## 2. Data model

### Runs

Detailed run records may include date, distance, route, moving and elapsed time,
elevation, pace, average heart rate, finish heart rate, two-minute heart rate,
device-displayed recovery, effort, shoe assignment, notes, and provenance.

Missing sensor values remain `null`. Zero is never used as a substitute for
missing data.

### Distance summaries

Month and year summaries are stored separately from detailed runs. This avoids
turning incomplete detailed coverage into an incorrect zero or understated
total.

### Shoes

Shoe mileage is derived as:

```text
starting mileage + sum(distance for assigned runs)
```

Active, default, and retired status are independent from historical assignment.
Retiring a shoe does not erase its mileage or associated runs.

### Recovery months

Monthly rows can hold cardio recovery, resting heart rate, HRV, walking heart
rate, VO2 max, lean mass, body fat, and weight. Optional rest-day reference
fields keep baseline comparisons explicit.

## 3. Interpretation guardrails

1. Compare like conditions and label run-day versus rest-day context.
2. Keep device-displayed recovery separate from derived time-point drops.
3. Treat missing values as unavailable, not zero.
4. Keep summary totals separate from the detailed workout subset.
5. Treat effort scores derived from heart rate as non-independent evidence.
6. Keep footwear, terrain, pace, and weather as possible confounders.
7. Avoid medical conclusions; this is a training-record interface.

## 4. Storage and access

The app uses a Sites D1 binding named `DB`. Rows are scoped to a logical owner.
The public portfolio build uses the fixed synthetic owner `public-demo` and its
POST endpoint returns HTTP 405. A personal deployment should use authenticated
owner scoping and private access controls.

The checked-in `.openai/hosting.json` contains a non-functional placeholder
project ID. It must be replaced only when configuring a separate Sites project.

## 5. Validation

Use Node.js 22.13 or newer:

```bash
npm install
npm run lint
npm test
```

The test suite runs a production build, checks core product invariants, and
scans the source tree for known private identifiers and metadata.
