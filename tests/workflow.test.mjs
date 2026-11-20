import { test } from "node:test";
import assert from "node:assert/strict";
import { transition, snapshot, inputDigest } from "../dist/server.js";
import { electricityInput } from "../dist/synthetic.js";
const now = "2026-11-20T12:00:00.000Z";
const context = (
  actorId = "author",
  caps = ["data-hub.read", "data-hub.edit"],
) => ({ actorId, active: true, enabled: true, capabilities: caps, now });
const reviewer = (actorId, cap) =>
  context(actorId, ["data-hub.read", `data-hub.${cap}`]);
const step = async (before, action, ctx, extra = {}) =>
  (
    await transition(
      before,
      { action, expectedVersion: before?.version ?? 0, ...extra },
      ctx,
    )
  ).next;
const draft = () =>
  step(null, "save", context(), { input: electricityInput() });
async function validated() {
  let r = await draft();
  r = await step(r, "submit", context());
  return step(r, "validate", reviewer("validator", "validate"), {
    evidence: "Independent source and arithmetic checked.",
  });
}
test("author, validator and approver complete review without publication", async () => {
  let r = await validated();
  r = await step(r, "approve", reviewer("approver", "approve"), {
    evidence: "Exact source vintage and values approved.",
  });
  assert.equal(r.state, "approved");
  assert.equal(r.version, 4);
  assert.equal(r.approval.digest, r.digest);
  assert.equal(r.validation.digest, r.digest);
  assert.equal(r.digest.length, 64);
  assert.equal(Object.hasOwn(r, "published"), false);
  await assert.rejects(
    () => transition(r, { action: "publish", expectedVersion: 4 }, context()),
    /Invalid command/,
  );
});
test("an edit clears validation and approval and isolates input references", async () => {
  const r = await validated();
  const changed = structuredClone(r.input);
  changed.payload.observations[1].value++;
  const next = await step(r, "save", context("second-editor"), {
    input: changed,
  });
  assert.equal(next.state, "draft");
  assert.equal(next.validation, null);
  assert.equal(next.approval, null);
  assert.notEqual(next.digest, r.digest);
  assert.deepEqual(next.contributorIds, ["author", "second-editor"]);
  changed.chartText = "mutated";
  assert.notEqual(next.input.chartText, "mutated");
});
for (const field of ["enabled", "active"])
  test(`rejects ${field}=false`, async () => {
    const ctx = context();
    ctx[field] = false;
    await assert.rejects(
      () => step(null, "save", ctx, { input: electricityInput() }),
      /unavailable/,
    );
    assert.throws(() => snapshot(null, ctx), /unavailable/);
  });
test("no grants, unknown grants and read-only staff cannot mutate", async () => {
  for (const caps of [
    [],
    ["data-hub.read"],
    ["data-hub.edit"],
    ["content.publish", "datasets.approve"],
  ])
    await assert.rejects(
      () =>
        step(null, "save", context("actor", caps), {
          input: electricityInput(),
        }),
      /unavailable/,
    );
});
test("stale concurrent writes and replay fail without changing stored input", async () => {
  const r = await draft();
  const before = structuredClone(r);
  await assert.rejects(
    () =>
      transition(
        r,
        { action: "save", expectedVersion: 0, input: electricityInput() },
        context(),
      ),
    (e) => e.status === 409,
  );
  assert.deepEqual(r, before);
});
test("every contributor is excluded from independent validation", async () => {
  let r = await draft();
  r = await step(r, "save", context("second-editor"), { input: r.input });
  r = await step(r, "submit", context("second-editor"));
  for (const uid of ["author", "second-editor"])
    await assert.rejects(
      () =>
        step(r, "validate", reviewer(uid, "validate"), { evidence: "Checked" }),
      /different staff/,
    );
});
test("validator cannot approve and revocation prevents approval", async () => {
  const r = await validated();
  await assert.rejects(
    () =>
      step(r, "approve", reviewer("validator", "approve"), {
        evidence: "Checked",
      }),
    /third staff/,
  );
  await assert.rejects(
    () =>
      step(r, "approve", context("approver", ["data-hub.read"]), {
        evidence: "Checked",
      }),
    /unavailable/,
  );
});
test("cannot skip workflow stages or forge client context/server fields", async () => {
  const r = await draft();
  await assert.rejects(
    () =>
      step(r, "approve", reviewer("approver", "approve"), {
        evidence: "Checked",
      }),
    /validation/,
  );
  await assert.rejects(
    () =>
      transition(
        r,
        { action: "submit", expectedVersion: r.version, actorId: "admin" },
        context(),
      ),
    /Invalid command/,
  );
  await assert.rejects(
    () => step(r, "submit", context("other")),
    /Only the draft author/,
  );
  const fake = structuredClone(r.input);
  fake.approvedBy = "owner";
  await assert.rejects(
    () => step(r, "save", context(), { input: fake }),
    /documented fields/,
  );
});
test("unknown rights, overdue review, future verification and missing evidence fail", async () => {
  const input = electricityInput();
  input.reuse.exports = "unknown";
  const r = await step(null, "save", context(), { input });
  await assert.rejects(
    () => step(r, "submit", context()),
    /Reuse must be cleared/,
  );
  const overdue = await draft();
  const ctx = context();
  ctx.now = "2026-12-01T12:00:00.000Z";
  await assert.rejects(() => step(overdue, "submit", ctx), /overdue/);
  const future = electricityInput();
  future.verifiedOn = "2026-11-21";
  await assert.rejects(
    () => step(null, "save", context(), { input: future }),
    /future/,
  );
  const submitted = await step(await draft(), "submit", context());
  await assert.rejects(
    () =>
      step(submitted, "validate", reviewer("validator", "validate"), {
        evidence: "",
      }),
    /evidence/,
  );
});
test("corrupted stored values and wrong digests are rejected", async () => {
  const r = await draft();
  r.input.payload.observations[1].value++;
  await assert.rejects(() => step(r, "submit", context()), /integrity/);
});
test("digest ignores object key order and covers metadata", async () => {
  const input = electricityInput();
  const reversed = structuredClone(
    Object.fromEntries(Object.entries(input).reverse()),
  );
  assert.equal(await inputDigest(input), await inputDigest(reversed));
  input.source.vintage = "Revised vintage";
  assert.notEqual(await inputDigest(input), await inputDigest(reversed));
});
test("visible actions reflect current server grants and no self-review", async () => {
  let r = await draft();
  assert.deepEqual(snapshot(r, context()).actions, ["save", "submit"]);
  r = await step(r, "submit", context());
  assert.deepEqual(snapshot(r, reviewer("author", "validate")).actions, []);
  assert.deepEqual(snapshot(r, reviewer("validator", "validate")).actions, [
    "validate",
  ]);
});
