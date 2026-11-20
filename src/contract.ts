/** v1 is experimental. Only reviewed modules bundled by the host can be installed. */
import { HOST_API_VERSION } from "./host-api-version.js";
export const API_VERSION = HOST_API_VERSION;
export const CAPABILITIES = ["data-hub.read", "data-hub.edit", "data-hub.validate", "data-hub.approve"] as const;
export type Capability = typeof CAPABILITIES[number];
export interface PluginManifest {
  id: string;
  version: string;
  hostApiVersion: 1;
  route: string;
  capabilities: readonly string[];
}
export const manifest: PluginManifest = Object.freeze({
  id: "data-hub", version: "0.1.0", hostApiVersion: API_VERSION,
  route: "/plugins/data-hub", capabilities: Object.freeze([...CAPABILITIES]),
});
export function checkManifest(candidate: unknown, hostApiVersion: number): PluginManifest {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("Invalid plugin manifest.");
  const m = candidate as Record<string, unknown>;
  const keys = ["id", "version", "hostApiVersion", "route", "capabilities"];
  if (Object.keys(m).length !== keys.length || Object.keys(m).some(k => !keys.includes(k)) ||
      typeof m.id !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(m.id) || m.id.length > 80 || m.route !== `/plugins/${m.id}` ||
      typeof m.version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(m.version) ||
      m.hostApiVersion !== API_VERSION || hostApiVersion !== API_VERSION ||
      !Array.isArray(m.capabilities) || m.capabilities.length < 1 || m.capabilities.length > 32 ||
      new Set(m.capabilities).size !== m.capabilities.length ||
      m.capabilities.some(c => typeof c !== "string" || !c.startsWith(`${m.id}.`) || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(c.slice(String(m.id).length + 1)))) throw new Error("Incompatible plugin manifest.");
  return Object.freeze({ ...m, capabilities: Object.freeze([...m.capabilities]) }) as unknown as PluginManifest;
}
export interface PluginModule<Bridge> {
  manifest: PluginManifest;
  mount(target: HTMLElement, bridge: Bridge): () => void;
}
/** This is an admission/lifecycle boundary, not a sandbox or authorization engine. */
export function installPlugin<Bridge>(options: {
  enabled: boolean; allowedId: string; allowedVersion: string; allowedCapabilities: readonly string[]; hostApiVersion: number;
  module: PluginModule<Bridge>; target: HTMLElement; bridge: Bridge;
}): () => void {
  if (!options.enabled) return () => undefined;
  const parsed = checkManifest(options.module.manifest, options.hostApiVersion);
  if (parsed.id !== options.allowedId || parsed.version !== options.allowedVersion ||
      JSON.stringify([...parsed.capabilities].sort()) !== JSON.stringify([...options.allowedCapabilities].sort())) throw new Error("Plugin version is not allowlisted.");
  return options.module.mount(options.target, options.bridge);
}
