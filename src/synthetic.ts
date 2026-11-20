import type { DataHubElectricityInput } from "./electricity.js";

/** Synthetic source and values. Never a candidate for public publication. */
export function electricityInput(): DataHubElectricityInput {
  return {
    schemaVersion: 1,
    figureId: "electricity",
    baseRevisionId: "legacy-2026-11-09",
    changeKind: "new_release",
    changeNote: "Synthetic monthly review fixture.",
    source: {
      publisher: "Example statistical office",
      title: "Residential price table",
      url: "https://example.org/table",
      datasetId: "residential-price",
      methodologyId: "revenue-per-kwh-v1",
      releasedOn: "2026-10-20",
      vintage: "2026-10-20 release",
    },
    verifiedOn: "2026-11-09",
    nextReviewOn: "2026-11-24",
    reuse: {
      display: "allowed",
      exports: "allowed",
      evidenceUrl: "https://example.org/reuse",
      note: "Synthetic permission evidence for test only.",
      checkedOn: "2026-11-09",
    },
    methodNote:
      "Residential revenue divided by kWh sold, same source vintage for all observations.",
    chartText:
      "Synthetic matched monthly price comparison; not a monthly household bill.",
    payload: {
      kind: "electricity-price",
      unit: "cents_kwh",
      adjustment: "not_seasonally_adjusted",
      sector: "residential",
      currentMonth: "2026-08",
      observations: [
        {
          period: "2025-08",
          geography: { level: "state", code: "NJ" },
          seriesId: "residential-nj",
          value: 20,
          status: "final",
        },
        {
          period: "2026-08",
          geography: { level: "state", code: "NJ" },
          seriesId: "residential-nj",
          value: 21,
          status: "preliminary",
        },
        {
          period: "2025-08",
          geography: { level: "nation", code: "US" },
          seriesId: "residential-us",
          value: 15,
          status: "final",
        },
        {
          period: "2026-08",
          geography: { level: "nation", code: "US" },
          seriesId: "residential-us",
          value: 16,
          status: "preliminary",
        },
      ],
    },
  };
}
