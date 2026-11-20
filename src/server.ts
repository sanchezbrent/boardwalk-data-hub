import { parseDataHubElectricityInput } from "./electricity.js";
import type { Capability } from "./contract.js";
import type { Revision, Command, Action, WorkspaceSnapshot } from "./types.js";
export type { Revision, Command, Action, WorkspaceSnapshot } from "./types.js";
/** Only a trusted host adapter may construct this after fresh authentication and grants. */
export interface TrustedContext {
  actorId: string; active: boolean; enabled: boolean;
  capabilities: readonly Capability[]; now: string;
}
export class WorkflowError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
function deny(message: string, status = 403): never { throw new WorkflowError(message, status); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export async function inputDigest(input: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(parseDataHubElectricityInput(input)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function guard(ctx: TrustedContext, capability: Capability) {
  if (!ctx.enabled || !ctx.active || !/^[A-Za-z0-9_-]{1,128}$/.test(ctx.actorId) ||
      !ctx.capabilities.includes("data-hub.read") || !ctx.capabilities.includes(capability)) deny("This action is unavailable.");
}
function parseCommand(value: unknown): Command {
  if (!value || typeof value !== "object" || Array.isArray(value)) deny("Invalid command.", 400);
  const c = value as Record<string, unknown>;
  const keys = c.action === "save" ? ["action", "expectedVersion", "input"] :
    c.action === "submit" ? ["action", "expectedVersion"] :
      ["validate", "approve"].includes(String(c.action)) ? ["action", "expectedVersion", "evidence"] : [];
  if (!keys.length || Object.keys(c).length !== keys.length || Object.keys(c).some(k => !keys.includes(k)) ||
      !Number.isSafeInteger(c.expectedVersion) || Number(c.expectedVersion) < 0) deny("Invalid command.", 400);
  if (keys.includes("evidence") && (typeof c.evidence !== "string" || !c.evidence.trim() || c.evidence.length > 2000 ||
      /[<>\u0000-\u001f\u007f]/.test(c.evidence))) deny("Record bounded plain-text review evidence.", 400);
  return c as unknown as Command;
}
const required = { save: "data-hub.edit", submit: "data-hub.edit", validate: "data-hub.validate", approve: "data-hub.approve" } as const;
export interface AuditEvent { action: Action; actorId: string; at: string; version: number; digest: string }
/** Pure transition. The host MUST CAS-persist next + audit together in one transaction.
 * No database, network, public projection, implicit approval or publication occurs here.
 * expectedVersion is a CAS precondition, not a durable idempotency receipt.
 */
export async function transition(stored: Revision | null, raw: unknown, context: TrustedContext): Promise<{ next: Revision; audit: AuditEvent }> {
  const before = structuredClone(stored);
  const ctx = structuredClone(context);
  const command = parseCommand(structuredClone(raw));
  guard(ctx, required[command.action]);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ctx.now) ||
      !Number.isFinite(Date.parse(ctx.now)) || new Date(ctx.now).toISOString() !== ctx.now) deny("Invalid server time.", 500);
  if (command.expectedVersion !== (before?.version ?? 0)) deny("This revision changed. Reload before continuing.", 409);
  if (before && before.digest !== await inputDigest(before.input)) deny("Stored revision integrity check failed.", 409);
  let next: Revision;
  if (command.action === "save") {
    const input = parseDataHubElectricityInput(command.input);
    if (input.verifiedOn > ctx.now.slice(0, 10) || input.reuse.checkedOn > ctx.now.slice(0, 10)) deny("Verification cannot be in the future.", 400);
    next = { version: (before?.version ?? 0) + 1, state: "draft", input, digest: await inputDigest(input), authorId: ctx.actorId, contributorIds: [...new Set([...(before && before.state !== "approved" ? before.contributorIds : []), ctx.actorId])], validation: null, approval: null };
  } else {
    if (!before) deny("Save a draft first.", 409);
    next = structuredClone(before);
    next.version++;
    parseDataHubElectricityInput(next.input, { requireClearedReuse: true });
    if (next.input.nextReviewOn < ctx.now.slice(0, 10)) deny("The source review is overdue.", 409);
    if (command.action === "submit") {
      if (next.state !== "draft" || next.authorId !== ctx.actorId) deny("Only the draft author can submit it.", 409);
      next.state = "review";
    } else {
      if (next.contributorIds.includes(ctx.actorId)) deny("A different staff member must review this revision.");
      const attestation = { actorId: ctx.actorId, digest: next.digest, evidence: command.evidence, at: ctx.now };
      if (command.action === "validate") {
        if (next.state !== "review") deny("Submit this revision for validation first.", 409);
        next.validation = attestation;
        next.state = "validated";
      } else {
        if (next.state !== "validated" || next.validation?.digest !== next.digest) deny("Independent validation is required.", 409);
        if (ctx.actorId === next.validation.actorId) deny("Editorial approval needs a third staff member.");
        next.approval = attestation;
        next.state = "approved";
      }
    }
  }
  return { next, audit: { action: command.action, actorId: ctx.actorId, at: ctx.now, version: next.version, digest: next.digest } };
}
export function snapshot(before: Revision | null, ctx: TrustedContext): WorkspaceSnapshot {
  guard(ctx, "data-hub.read");
  const actions: Action[] = [];
  if (ctx.capabilities.includes("data-hub.edit")) {
    actions.push("save");
    if (before?.state === "draft" && before.authorId === ctx.actorId) actions.push("submit");
  }
  if (before && !before.contributorIds.includes(ctx.actorId)) {
    if (ctx.capabilities.includes("data-hub.validate") && before.state === "review") actions.push("validate");
    if (ctx.capabilities.includes("data-hub.approve") && before.state === "validated" && before.validation?.actorId !== ctx.actorId) actions.push("approve");
  }
  return { revision: structuredClone(before), actions };
}
