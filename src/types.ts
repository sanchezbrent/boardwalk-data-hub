import type { DataHubElectricityInput } from "./electricity.js";
export type Action = "save" | "submit" | "validate" | "approve";
export interface Attestation {
  actorId: string;
  digest: string;
  evidence: string;
  at: string;
}
export interface Revision {
  version: number;
  state: "draft" | "review" | "validated" | "approved";
  input: DataHubElectricityInput;
  digest: string;
  authorId: string;
  contributorIds: string[];
  validation: Attestation | null;
  approval: Attestation | null;
}
export type Command =
  | { action: "save"; expectedVersion: number; input: unknown }
  | { action: "submit"; expectedVersion: number }
  | {
      action: "validate" | "approve";
      expectedVersion: number;
      evidence: string;
    };
/** Read responses and actor context are supplied by the trusted host API. */
export interface WorkspaceSnapshot {
  revision: Revision | null;
  actions: Action[];
  initialInput?: DataHubElectricityInput;
}
export interface WorkspaceBridge {
  read(): Promise<WorkspaceSnapshot>;
  execute(command: Command): Promise<WorkspaceSnapshot>;
}
