export const recoveryGateSnapshot = {
  refreshedAt: "Jun 30, 2026",
  window: "Jun 23-29, 2026",
  restDays: "Jun 24, 26, and 28",
  source: "Synthetic recovery snapshot",
  metrics: [
    {
      label: "Cardio recovery",
      value: "42 bpm",
      threshold: "Demo target >= 38",
      status: "On track",
      tone: "good",
    },
    {
      label: "Resting HR",
      value: "57.5 bpm",
      threshold: "Compare with baseline",
      status: "Stable",
      tone: "good",
    },
    {
      label: "HRV (SDNN)",
      value: "44 ms",
      threshold: "Compare with baseline",
      status: "Stable",
      tone: "good",
    },
    {
      label: "Walking HR",
      value: "81 bpm",
      threshold: "Context only",
      status: "Context",
      tone: "context",
    }
  ],
  sameDay: [
    { "label": "Resting HR", "value": "58 bpm" },
    { "label": "HRV SDNN", "value": "42 ms" },
    { "label": "VO2 max", "value": "43.0" },
    { "label": "Sleep", "value": "7h 20m" }
  ],
  runRecovery: [
    { "label": "Device recovery", "value": "42 bpm" },
    { "label": "Peak-to-1-minute drop", "value": "31 bpm derived" },
    { "label": "End-to-2-minute drop", "value": "36 bpm derived" },
    { "label": "Finish HR", "value": "149 bpm" }
  ],
  footwear: {
    title: "Footwear comparison needs repeated samples",
    detail: "The demo keeps easy and faster runs across both active pairs so shoe effects are not confused with workout type."
  },
  bodyComposition: "These values are synthetic. In a real ledger, compare body-composition readings only under consistent measurement conditions."
} as const;
