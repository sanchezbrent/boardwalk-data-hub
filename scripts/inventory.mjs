#!/usr/bin/env node
/** Read-only inventory. No network, credentials, CMS writes or publication. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { FIGURE_IDS as DATA_HUB_DATA_FIGURES } from "../dist/figures.js";
const sourcePattern =
  /<script id="source-data" type="application\/json">([\s\S]*?)<\/script>/g;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function checkNumbers(value) {
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("Nonfinite legacy value.");
  if (value && typeof value === "object")
    Object.values(value).forEach(checkNumbers);
}

export function readLegacyDataHub(readerHtml) {
  const matches = [...readerHtml.matchAll(sourcePattern)];
  if (matches.length !== 1)
    throw new Error("Expected exactly one compiled Data Hub source payload.");
  const source = JSON.parse(matches[0][1]);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) ||
    !Number.isFinite(Date.parse(`${source.asOf}T00:00:00Z`)) ||
    new Date(`${source.asOf}T00:00:00Z`).toISOString().slice(0, 10) !==
      source.asOf
  ) {
    throw new Error("Expected a real dated source snapshot.");
  }
  const ids = source.metrics?.map((metric) => metric.id);
  if (
    !Array.isArray(ids) ||
    ids.length !== DATA_HUB_DATA_FIGURES.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !DATA_HUB_DATA_FIGURES.includes(id))
  ) {
    throw new Error("Expected the complete, unique existing figure registry.");
  }
  checkNumbers(source);
  return source;
}

/** Preserve heterogeneous payloads for audit, never coerce them into review inputs.
 * Dependency locations are candidates for manual review, not a complete static
 * analysis of the renderer. Even the electricity profile needs a reviewed adapter.
 */
export function inventoryDataHubData(readerHtml, snapshotJson) {
  const source = readLegacyDataHub(readerHtml);
  const snapshot = JSON.parse(snapshotJson);
  if (!isDeepStrictEqual(source, snapshot))
    throw new Error("Compiled reader and dated snapshot differ.");
  const outsideSource = readerHtml.replace(sourcePattern, (match) =>
    match.replace(/[^\n]/g, " "),
  );
  const lines = outsideSource.split("\n");
  return {
    schemaVersion: 1,
    state: "inventory_only",
    asOf: source.asOf,
    readerSha256: sha256(readerHtml),
    snapshotSha256: sha256(snapshotJson),
    reviewRequired: [
      "Check every data-bearing reader literal, no-script table, accessible description, caption and export.",
      "Source terms and existing verified labels are legacy claims, not independent validation or approval.",
      "Review the complete source envelope, release calendar and geographic datasets before migration.",
    ],
    // Retain the whole envelope as well as each specialized figure. No data loss.
    legacySource: source,
    figures: source.metrics.map((metric) => ({
      id: metric.id,
      legacyPayload: structuredClone(metric),
      profile: metric.id === "electricity" ? "electricity-price" : "pending",
      readyForReview: false,
      metadataToReview: [
        "typed_periods",
        "geographic_identifiers",
        "series_and_methodology_identifiers",
        "source_vintage",
        "preliminary_or_final_per_observation",
        "reuse_display_and_exports_evidence",
        "independent_validation",
        "editorial_approval",
        "owner_and_next_review",
      ],
      dependencyCandidateLines: lines.flatMap((line, index) =>
        line.includes(metric.id) ? [index + 1] : [],
      ),
    })),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--reader" || args[2] !== "--snapshot")
    throw new Error(
      "Usage: npm run inventory -- --reader /path/to/reader.html --snapshot /path/to/snapshot.json",
    );
  const report = inventoryDataHubData(
    readFileSync(resolve(args[1]), "utf8"),
    readFileSync(resolve(args[3]), "utf8"),
  );
  // Print metadata only. Editorial payloads stay in the explicitly supplied files.
  const { legacySource, ...summary } = report;
  summary.figures = summary.figures.map(
    ({ legacyPayload, ...figure }) => figure,
  );
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
