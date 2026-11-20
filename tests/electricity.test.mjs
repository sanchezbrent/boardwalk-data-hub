import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDataHubElectricityInput as parse } from "../dist/electricity.js";
import { electricityInput } from "../dist/synthetic.js";
import { FIGURE_IDS } from "../dist/figures.js";
const invalid = [
  ["forged approval", v => { v.approvedBy = "editor@example.org"; }],
  ["forged digest", v => { v.digest = "f".repeat(64); }],
  ["forged publication state", v => { v.published = true; }],
  ["unsupported schema", v => { v.schemaVersion = 2; }],
  ["unimplemented payload", v => { v.figureId = "snap"; }],
  ["unknown figure", v => { v.figureId = "new-energy-jobs"; }],
  ["missing field", v => { delete v.nextReviewOn; }],
  ["invalid base revision", v => { v.baseRevisionId = "../main"; }],
  ["blank explanation", v => { v.changeNote = " "; }],
  ["missing source publisher", v => { delete v.source.publisher; }],
  ["missing source vintage", v => { v.source.vintage = ""; }],
  ["missing methodology", v => { v.source.methodologyId = ""; }],
  ["script URL", v => { v.source.url = "javascript:alert(1)"; }],
  ["HTTP URL", v => { v.source.url = "http://example.org/table"; }],
  ["credential URL", v => { v.source.url = "https://user:synthetic@example.org/table"; }],
  ["URL whitespace", v => { v.source.url = "https://example.org/a b"; }],
  ["URL backslash", v => { v.source.url = "https://example.org/\\table"; }],
  ["impossible release date", v => { v.source.releasedOn = "2026-02-30"; }],
  ["release before observation month ends", v => { v.source.releasedOn = "2026-08-02"; }],
  ["verification before release", v => { v.verifiedOn = "2026-10-01"; }],
  ["review before verification", v => { v.nextReviewOn = "2026-10-21"; }],
  ["reuse checked after verification", v => { v.reuse.checkedOn = "2026-11-10"; }],
  ["missing reuse evidence", v => { v.reuse.evidenceUrl = ""; }],
  ["unknown reuse field", v => { v.reuse.approved = true; }],
  ["HTML note", v => { v.methodNote = "<img src=x onerror=alert(1)>"; }],
  ["oversized chart text", v => { v.chartText = "x".repeat(2001); }],
  ["control character", v => { v.chartText = "Example\u0000text"; }],
  ["unknown payload field", v => { v.payload.comparisonNote = "Override mismatch"; }],
  ["incompatible unit", v => { v.payload.unit = "usd_month"; }],
  ["incompatible adjustment", v => { v.payload.adjustment = "seasonally_adjusted"; }],
  ["incompatible sector", v => { v.payload.sector = "commercial"; }],
  ["invalid month", v => { v.payload.currentMonth = "2026-13"; }],
  ["missing geography", v => { Reflect.deleteProperty(v.payload.observations[0], "geography"); }],
  ["wrong geography level", v => { v.payload.observations[0].geography.level = "nation"; }],
  ["different geography", v => { v.payload.observations[0].geography.code = "NY"; }],
  ["unmatched comparison month", v => { v.payload.observations[0].period = "2025-07"; }],
  ["mixed monthly and annual series", v => { v.payload.observations[0].period = "2025"; }],
  ["different historical series", v => { v.payload.observations[0].seriesId = "commercial-nj"; }],
  ["same series ID for two geographies", v => { v.payload.observations.forEach(r => { r.seriesId = "one-series"; }); }],
  ["observation source override", v => { v.payload.observations[0].vintage = "different release"; }],
  ["duplicate observation", v => { v.payload.observations[0] = structuredClone(v.payload.observations[1]); }],
  ["missing national comparison", v => { v.payload.observations.pop(); }],
  ["missing preliminary/final status", v => { delete v.payload.observations[0].status; }],
  ["legacy verified status", v => { v.payload.observations[0].status = "verified"; }],
  ["nonfinite price", v => { v.payload.observations[0].value = Infinity; }],
  ["NaN price", v => { v.payload.observations[0].value = NaN; }],
  ["string price", v => { v.payload.observations[0].value = "20"; }],
  ["negative price", v => { v.payload.observations[0].value = -1; }],
  ["unbounded price", v => { v.payload.observations[0].value = 1e15; }],
];

for (const [name, mutate] of invalid) test(`rejects ${name}`, () => { const input = electricityInput(); mutate(input); assert.throws(() => parse(input)); });
test("strict profile returns an isolated complete value", () => {
 const value = electricityInput(); const parsed = parse(value, { requireClearedReuse: true });
 assert.deepEqual(parsed,value); parsed.payload.observations[0].value = 100; assert.equal(value.payload.observations[0].value,20);
 assert.equal(FIGURE_IDS.length,18); assert.equal(new Set(FIGURE_IDS).size,18);
});
for (const decision of ["unknown","denied"]) for (const field of ["display","exports"]) test(`blocks ${decision} ${field} at review`, () => {
 const input = electricityInput(); input.reuse[field] = decision;
 assert.equal(parse(input).reuse[field],decision); assert.throws(() => parse(input,{requireClearedReuse:true}));
});
test("rejects symbol properties and prototype-bearing objects",()=>{
 const input=electricityInput(); input[Symbol("hidden")]=true; assert.throws(()=>parse(input));
 const other=electricityInput(); Object.setPrototypeOf(other,{approved:true}); assert.throws(()=>parse(other));
});
