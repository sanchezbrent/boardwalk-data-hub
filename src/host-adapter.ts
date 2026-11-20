import { snapshot, transition, WorkflowError, type TrustedContext, type AuditEvent } from "./server.js";
import type { Revision, WorkspaceSnapshot } from "./types.js";
export interface HostTransaction {
  /** Resolve grants, activation state and the server clock from trusted host state. */
  contextFor(actorId: string): Promise<TrustedContext>;
  readRevision(): Promise<Revision | null>;
  /** Append audit/history and CAS-write the revision atomically; retain all older versions. */
  writeRevision(expectedVersion: number, next: Revision, audit: AuditEvent): Promise<void>;
}
export interface HostServices {
  /** Verify the host's staff session; never take an actor ID or grant from the request. */
  authenticate(): Promise<{ actorId: string }>;
  transaction<T>(work: (tx: HostTransaction) => Promise<T>): Promise<T>;
}
/** Reference server seam. The persistence/identity provider belongs to Boardwalk. */
export async function handleWorkspaceRequest(raw: unknown, host: HostServices): Promise<WorkspaceSnapshot> {
  const identity = await host.authenticate();
  const request = structuredClone(raw);
  return host.transaction(async tx => {
    const ctx = await tx.contextFor(identity.actorId);
    if (ctx.actorId !== identity.actorId) throw new WorkflowError("Host identity binding failed.", 500);
    const before = await tx.readRevision();
    if (request && typeof request === "object" && !Array.isArray(request) &&
        Object.keys(request).length === 1 && (request as { action?: unknown }).action === "read") return snapshot(before, ctx);
    const { next, audit } = await transition(before, request, ctx);
    await tx.writeRevision(before?.version ?? 0, next, audit);
    return snapshot(next, ctx);
  });
}
