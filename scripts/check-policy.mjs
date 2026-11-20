import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
for (const name of readdirSync(
  new URL("../.github/workflows", import.meta.url),
)) {
  const text = read(`.github/workflows/${name}`);
  assert(
    !/pull_request_target|secrets\.|self-hosted|npm publish/.test(text),
    `Unsafe workflow trigger or authority: ${name}`,
  );
  for (const [, ref] of text.matchAll(/uses:\s+([^\s#]+)/g))
    assert(/@[a-f0-9]{40}$/.test(ref), `Unpinned action ${ref}`);
  assert(
    text.includes("persist-credentials: false"),
    `Checkout credentials persisted: ${name}`,
  );
  assert(
    text.includes("pull_request:") && text.includes("merge_group:"),
    `Missing PR/queue event: ${name}`,
  );
}
const rules = JSON.parse(read(".github/settings/main.ruleset.json"));
assert.equal(rules.enforcement, "active");
assert.deepEqual(rules.bypass_actors, []);
assert.deepEqual(rules.conditions.ref_name.include, ["refs/heads/main"]);
const pr = rules.rules.find((r) => r.type === "pull_request").parameters;
assert(
  pr.required_approving_review_count >= 1 &&
    pr.require_code_owner_review &&
    pr.require_last_push_approval &&
    pr.required_review_thread_resolution &&
    pr.dismiss_stale_reviews_on_push,
);
const checks = rules.rules.find(
  (r) => r.type === "required_status_checks",
).parameters;
assert(checks.strict_required_status_checks_policy);
assert.deepEqual(checks.required_status_checks.map((c) => c.context).sort(), [
  "ci",
  "codeql",
]);
assert(checks.required_status_checks.every((c) => c.integration_id === 15368));
assert(rules.rules.some((r) => r.type === "code_scanning"));
const pkg = JSON.parse(read("package.json"));
for (const version of Object.values(pkg.devDependencies))
  assert(/^\d+\.\d+\.\d+$/.test(version), "Dependencies must be exact");
for (const file of [
  "src/index.ts",
  "src/ui.ts",
  "src/contract.ts",
  "src/electricity.ts",
])
  assert(
    !/firebase|wrangler|process\.env|node:|https?:\/\//.test(read(file)),
    `Unexpected browser vendor/network authority in ${file}`,
  );
process.stdout.write(
  "Workflow and package policy passed. Hosted settings still require explicit application.\n",
);
