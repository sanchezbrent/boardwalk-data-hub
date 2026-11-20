import { mount, manifest } from "/dist/ui.js";
import { installPlugin } from "/dist/contract.js";
// The demo server has no mutation endpoints. State and transitions run only in this tab.
// This test adapter is not authentication and must never be deployed as a CMS service.
import { electricityInput } from "/dist/synthetic.js";
import { transition, snapshot } from "/dist/server.js";
const grants = {
  author: ["data-hub.read", "data-hub.edit"],
  validator: ["data-hub.read", "data-hub.validate"],
  approver: ["data-hub.read", "data-hub.approve"],
  viewer: ["data-hub.read"],
};
const ctx = (persona) => ({
  actorId: persona,
  active: true,
  enabled: true,
  capabilities: grants[persona] ?? [],
  now: "2026-11-20T12:00:00.000Z",
});
const demoTransition = (before, command, persona) =>
  transition(before, command, ctx(persona));
const demoSnapshot = (before, persona) => ({
  ...snapshot(before, ctx(persona)),
  initialInput: electricityInput(),
});
let revision = null;
let persona = "author";
const target = document.querySelector("#plugin");
const bridge = {
  read: async () => demoSnapshot(revision, persona),
  execute: async (command) => {
    const { next } = await demoTransition(revision, command, persona);
    revision = next;
    return demoSnapshot(revision, persona);
  },
};
let dispose = () => {};
function render() {
  dispose();
  dispose = installPlugin({
    enabled: true,
    allowedId: "data-hub",
    allowedCapabilities: manifest.capabilities,
    allowedVersion: manifest.version,
    hostApiVersion: 1,
    module: { manifest, mount },
    target,
    bridge,
  });
}
document.querySelector("#persona").addEventListener("change", (event) => {
  persona = event.target.value;
  render();
});
document.querySelector("#reset").addEventListener("click", () => {
  revision = null;
  render();
});
render();
