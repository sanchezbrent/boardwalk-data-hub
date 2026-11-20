import { FIGURE_IDS } from "./figures.js";

/** Private review input only. Parsing never grants approval or publication. */
export const DATA_HUB_DATA_FIGURES = FIGURE_IDS;
export const MAX_DATA_HUB_INPUT_BYTES = 64 * 1024;
export type DataHubReleaseStatus = "preliminary" | "final";
export type DataHubReuseDecision = "unknown" | "allowed" | "denied";
export type DataHubElectricityGeography =
  { level: "state"; code: "NJ" } | { level: "nation"; code: "US" };
export interface DataHubElectricityObservation {
  period: string; // ISO month, not a release date.
  geography: DataHubElectricityGeography;
  seriesId: string;
  value: number;
  status: DataHubReleaseStatus;
}
export interface DataHubElectricityInput {
  schemaVersion: 1;
  figureId: "electricity";
  baseRevisionId: string | null;
  changeKind: "new_release" | "correction";
  changeNote: string;
  source: {
    publisher: string;
    title: string;
    url: string;
    datasetId: string;
    methodologyId: string;
    releasedOn: string;
    vintage: string;
  };
  verifiedOn: string;
  nextReviewOn: string;
  reuse: {
    display: DataHubReuseDecision;
    exports: DataHubReuseDecision;
    evidenceUrl: string;
    note: string;
    checkedOn: string;
  };
  methodNote: string;
  chartText: string;
  payload: {
    kind: "electricity-price";
    unit: "cents_kwh";
    adjustment: "not_seasonally_adjusted";
    sector: "residential";
    currentMonth: string;
    observations: DataHubElectricityObservation[];
  };
}

function fail(path: string, reason: string): never {
  throw new Error(`${path}: ${reason}`);
}
function fields(
  value: unknown,
  keys: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    Reflect.ownKeys(value).length !== keys.length ||
    Reflect.ownKeys(value).some(
      (key) => typeof key !== "string" || !keys.includes(key),
    )
  ) {
    fail(path, "Use exactly the documented fields.");
  }
}
function text(
  value: unknown,
  max: number,
  path: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.trim() ||
    value.length > max ||
    /[<>]/.test(value) ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    fail(path, "Use bounded plain text.");
}
function choice(value: unknown, choices: readonly string[], path: string) {
  if (typeof value !== "string" || !choices.includes(value))
    fail(path, "Choose a listed value.");
}
function date(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000")
  )
    fail(path, "Use a real ISO date.");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(path, "Use a real ISO date.");
}
function month(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value) ||
    value.startsWith("0000")
  ) {
    fail(path, "Use a real ISO month.");
  }
}
function https(value: unknown, path: string) {
  text(value, 2000, path);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(path, "Use a credential-free HTTPS source address.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    /[\s\\]/.test(value)
  )
    fail(path, "Use a credential-free HTTPS source address.");
}
function validateSource(value: unknown) {
  fields(
    value,
    [
      "publisher",
      "title",
      "url",
      "datasetId",
      "methodologyId",
      "releasedOn",
      "vintage",
    ],
    "source",
  );
  for (const key of [
    "publisher",
    "title",
    "datasetId",
    "methodologyId",
    "vintage",
  ])
    text(value[key], 300, `source.${key}`);
  https(value.url, "source.url");
  date(value.releasedOn, "source.releasedOn");
}
function validateReuse(value: unknown, requireClearedReuse: boolean) {
  fields(
    value,
    ["display", "exports", "evidenceUrl", "note", "checkedOn"],
    "reuse",
  );
  for (const key of ["display", "exports"]) {
    choice(value[key], ["unknown", "allowed", "denied"], `reuse.${key}`);
    if (requireClearedReuse && value[key] !== "allowed")
      fail(`reuse.${key}`, "Reuse must be cleared before review.");
  }
  https(value.evidenceUrl, "reuse.evidenceUrl");
  text(value.note, 2000, "reuse.note");
  date(value.checkedOn, "reuse.checkedOn");
}
function validateObservation(
  row: unknown,
  currentMonth: string,
  priorMonth: string,
): DataHubElectricityObservation {
  fields(
    row,
    ["period", "geography", "seriesId", "value", "status"],
    "observation",
  );
  month(row.period, "observation.period");
  if (![currentMonth, priorMonth].includes(row.period))
    fail("observation.period", "Compare the same month one year apart.");
  fields(row.geography, ["level", "code"], "observation.geography");
  const geo = row.geography;
  if (
    !(geo.code === "NJ" && geo.level === "state") &&
    !(geo.code === "US" && geo.level === "nation")
  ) {
    fail(
      "observation.geography",
      "Use New Jersey or the United States at the correct level.",
    );
  }
  text(row.seriesId, 120, "observation.seriesId");
  if (
    typeof row.value !== "number" ||
    !Number.isFinite(row.value) ||
    row.value < 0 ||
    row.value > 1e6
  ) {
    fail(
      "observation.value",
      "Use a finite nonnegative price in cents per kWh.",
    );
  }
  choice(row.status, ["preliminary", "final"], "observation.status");
  return row as unknown as DataHubElectricityObservation;
}
function validatePayload(value: unknown) {
  fields(
    value,
    ["kind", "unit", "adjustment", "sector", "currentMonth", "observations"],
    "payload",
  );
  if (
    value.kind !== "electricity-price" ||
    value.unit !== "cents_kwh" ||
    value.adjustment !== "not_seasonally_adjusted" ||
    value.sector !== "residential"
  ) {
    fail("payload", "Use the residential electricity price profile.");
  }
  month(value.currentMonth, "payload.currentMonth");
  const priorMonth = `${String(Number(value.currentMonth.slice(0, 4)) - 1).padStart(4, "0")}${value.currentMonth.slice(4)}`;
  month(priorMonth, "payload.priorMonth");
  if (!Array.isArray(value.observations) || value.observations.length !== 4)
    fail("observations", "Supply both geographies for both matched months.");
  const keys = new Set<string>();
  const series = new Map<string, string>();
  for (const raw of value.observations) {
    const row = validateObservation(raw, value.currentMonth, priorMonth);
    const geo = row.geography;
    const key = `${geo.code}:${row.period}`;
    if (keys.has(key))
      fail("observations", "Do not duplicate a geography and month.");
    keys.add(key);
    if (series.has(geo.code) && series.get(geo.code) !== row.seriesId)
      fail(
        "observation.seriesId",
        "Historical comparisons must use the same series.",
      );
    series.set(geo.code, row.seriesId);
  }
  if (series.get("NJ") === series.get("US"))
    fail(
      "observation.seriesId",
      "Use the geographic series identifiers from the source.",
    );
}

/** The same input boundary compiles for forms and Functions; no server fields accepted.
 * Other figure payloads deliberately have no permissive fallback in this increment.
 * Shared source/vintage/method, units and adjustment apply to all four observations.
 */
export function parseDataHubElectricityInput(
  value: unknown,
  { requireClearedReuse = false }: { requireClearedReuse?: boolean } = {},
): DataHubElectricityInput {
  fields(
    value,
    [
      "schemaVersion",
      "figureId",
      "baseRevisionId",
      "changeKind",
      "changeNote",
      "source",
      "verifiedOn",
      "nextReviewOn",
      "reuse",
      "methodNote",
      "chartText",
      "payload",
    ],
    "input",
  );
  if (value.schemaVersion !== 1 || value.figureId !== "electricity")
    fail("input", "Use the supported electricity schema version.");
  if (
    value.baseRevisionId !== null &&
    (typeof value.baseRevisionId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value.baseRevisionId))
  ) {
    fail(
      "baseRevisionId",
      "Use an existing revision identifier or null for initial migration.",
    );
  }
  choice(value.changeKind, ["new_release", "correction"], "changeKind");
  text(value.changeNote, 2000, "changeNote");
  validateSource(value.source);
  date(value.verifiedOn, "verifiedOn");
  date(value.nextReviewOn, "nextReviewOn");
  const source = value.source as DataHubElectricityInput["source"];
  if (
    value.verifiedOn < source.releasedOn ||
    value.nextReviewOn < value.verifiedOn
  )
    fail("verifiedOn", "Keep release, verification and review dates in order.");
  validateReuse(value.reuse, requireClearedReuse);
  if (
    (value.reuse as DataHubElectricityInput["reuse"]).checkedOn >
    value.verifiedOn
  )
    fail("reuse.checkedOn", "Verify after checking reuse terms.");
  text(value.methodNote, 4000, "methodNote");
  text(value.chartText, 2000, "chartText");
  validatePayload(value.payload);
  const payload = value.payload as DataHubElectricityInput["payload"];
  const monthEnd = new Date(`${payload.currentMonth}-01T00:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  if (source.releasedOn < monthEnd.toISOString().slice(0, 10))
    fail(
      "source.releasedOn",
      "A monthly observed price cannot precede its completed month.",
    );
  if (
    new TextEncoder().encode(JSON.stringify(value)).length >
    MAX_DATA_HUB_INPUT_BYTES
  )
    fail("input", "Keep the input within 64 KiB.");
  return structuredClone(value) as unknown as DataHubElectricityInput;
}
