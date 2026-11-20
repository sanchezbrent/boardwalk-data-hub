import { parseDataHubElectricityInput } from "./electricity.js";
import type { WorkspaceBridge, WorkspaceSnapshot, Action, Command } from "./types.js";
export { manifest } from "./contract.js";
const labels: Record<string, string> = {
  baseRevisionId: "Base published revision", changeKind: "Type of change", changeNote: "Reason for change",
  verifiedOn: "Source verified on", nextReviewOn: "Next source review", methodNote: "Methodology note", chartText: "Accessible chart description",
  source: "Source and methodology", publisher: "Source publisher", title: "Source table title", url: "Source URL",
  datasetId: "Source dataset ID", methodologyId: "Methodology ID", releasedOn: "Source release date", vintage: "Source vintage",
  reuse: "Reuse review", display: "Display reuse", exports: "Export reuse", evidenceUrl: "Reuse evidence URL", note: "Reuse evidence note", checkedOn: "Reuse checked on",
  payload: "Monthly observations", currentMonth: "Current comparison month", observations: "Values", period: "Observation month", seriesId: "Series ID", value: "Price (cents per kWh)", status: "Release status",
};
const choices: Record<string, string[]> = { changeKind: ["new_release", "correction"], display: ["unknown", "allowed", "denied"], exports: ["unknown", "allowed", "denied"], status: ["preliminary", "final"] };
const fixed = ["schemaVersion", "figureId", "kind", "unit", "adjustment", "sector"];
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
/** Host owns auth and transport. All user text is placed with textContent or value. */
export function mount(target: HTMLElement, bridge: WorkspaceBridge): () => void {
  const root = element("section"); root.className = "bdh";
  const style = element("style", `.bdh{font:1rem/1.5 system-ui;max-width:72rem;margin:auto;color:#162d38;background:#fff;padding:1rem}.bdh fieldset{border:1px solid #667985;border-radius:.4rem;margin:1rem 0;padding:1rem;min-width:0}.bdh legend{font-weight:700}.bdh label{display:grid;gap:.25rem;margin:.7rem 0}.bdh input,.bdh select,.bdh textarea{font:inherit;padding:.6rem;max-width:100%;border:1px solid #526674;border-radius:.2rem}.bdh textarea{min-height:5rem}.bdh button{font:inherit;padding:.65rem 1rem;background:#143e51;color:white;border:2px solid transparent;border-radius:.3rem;margin:.4rem}.bdh :focus-visible{outline:3px solid #784500;outline-offset:3px}.bdh table{border-collapse:collapse;width:100%}.bdh th,.bdh td{border-bottom:1px solid #74848f;padding:.5rem;text-align:left}.bdh .bdh-status{padding:1rem;border-left:4px solid #256349;min-height:1.5rem}.bdh button:disabled{opacity:.65}.bdh .bdh-actions{display:flex;flex-wrap:wrap}.bdh .bdh-preview{overflow:auto}`);
  root.append(style, element("h1", "Residential electricity prices"), element("p", "Edit source-backed values, then request independent validation and editorial approval."));
  const status = element("div", "Opening editor…"); status.className = "bdh-status"; status.setAttribute("role", "status"); status.tabIndex = -1;
  const body = element("div"); root.append(status, body); target.append(root);
  let disposed = false; let generation = 0; let busy = false;
  let snapshot: WorkspaceSnapshot = { revision: null, actions: [] };
  const events = new AbortController();
  function announce(message: string) { if (!disposed) { status.textContent = message; status.focus(); } }
  async function command(c: Command) {
    if (busy) return; busy = true;
    body.querySelectorAll("button").forEach(b => b.disabled = true);
    try { const state = await bridge.execute(c); if (!disposed) { snapshot = state; render(); announce(`Revision ${state.revision?.version}: ${state.revision?.state}.`); } }
    catch (error) { announce(error instanceof Error ? error.message : "The action failed. Reload and try again."); if (!disposed) render(); }
    finally { busy = false; }
  }
  function render() {
    body.replaceChildren();
    const state = snapshot.revision;
    const seed = state?.input ?? snapshot.initialInput;
    if (!seed) { body.append(element("p", "A reviewed source import is required before creating the first draft.")); return; }
    const input = structuredClone(seed);
    body.append(element("p", state ? `Revision ${state.version} · ${state.state}` : "New private draft"));
    const form = element("form"); const enabled = snapshot.actions.includes("save");
    let id = 0;
    function fields(record: Record<string, unknown>, parent: HTMLElement, prefix = "") {
      for (const [key, value] of Object.entries(record)) {
        if (fixed.includes(key)) continue;
        if (key === "geography") { parent.append(element("p", `Geography: ${(value as { code: string }).code}`)); continue; }
        if (Array.isArray(value)) {
          const group = element("fieldset"); group.append(element("legend", labels[key] ?? key));
          value.forEach((row: Record<string, unknown>, index) => {
            const fieldset = element("fieldset"); fieldset.append(element("legend", `Observation ${index + 1}`));
            fields(row, fieldset, `${prefix}${key}.${index}.`); group.append(fieldset);
          }); parent.append(group); continue;
        }
        if (value && typeof value === "object") {
          const group = element("fieldset"); group.append(element("legend", labels[key] ?? key));
          fields(value as Record<string, unknown>, group, `${prefix}${key}.`); parent.append(group); continue;
        }
        const label = element("label", labels[key] ?? key);
        const multiline = ["changeNote", "methodNote", "chartText", "note"].includes(key);
        const control = choices[key] ? element("select") : multiline ? element("textarea") : element("input");
        control.id = `bdh-field-${++id}`; control.name = `${prefix}${key}`; label.htmlFor = control.id;
        if (control instanceof HTMLSelectElement) choices[key]?.forEach(v => { const option = element("option", v.replaceAll("_", " ")); option.value = v; control.append(option); });
        if (control instanceof HTMLInputElement) {
          control.type = typeof value === "number" ? "number" : /On$/.test(key) ? "date" : ["period", "currentMonth"].includes(key) ? "month" : /[Uu]rl$/.test(key) ? "url" : "text";
          if (control.type === "number") { control.min = "0"; control.step = "any"; }
        }
        control.value = String(value ?? ""); control.disabled = !enabled;
        control.required = key !== "baseRevisionId";
        control.addEventListener("input", () => { record[key] = typeof value === "number" ? Number.parseFloat(control.value) : key === "baseRevisionId" && !control.value ? null : control.value; }, { signal: events.signal });
        label.append(control); parent.append(label);
      }
    }
    fields(input as unknown as Record<string, unknown>, form);
    const actions = element("div"); actions.className = "bdh-actions";
    const previewButton = element("button", "Preview current input"); previewButton.type = "button";
    const preview = element("div"); preview.className = "bdh-preview";
    function previewInput() {
      try {
        const parsed = parseDataHubElectricityInput(input);
        preview.replaceChildren(element("h2", "Value preview"), element("p", parsed.chartText));
        const table = element("table"); const caption = element("caption", "Matched monthly prices in cents per kWh"); table.append(caption);
        const header = element("tr"); ["Geography", "Month", "Price", "Status"].forEach(t => { const th = element("th", t); th.scope = "col"; header.append(th); });
        const thead = element("thead"); thead.append(header); table.append(thead); const tbody = element("tbody");
        parsed.payload.observations.forEach(row => { const tr = element("tr"); [row.geography.code, row.period, String(row.value), row.status].forEach(t => tr.append(element("td", t))); tbody.append(tr); });
        table.append(tbody); preview.append(table, element("p", "This checks the typed values. The public chart and export parity review is still required."));
        announce("Value preview ready.");
      } catch (error) { announce(error instanceof Error ? error.message : "Invalid input."); }
    }
    previewButton.addEventListener("click", previewInput, { signal: events.signal }); actions.append(previewButton);
    const save = element("button", "Save private draft"); save.type = "submit"; save.disabled = !enabled;
    actions.append(save); form.append(actions); body.append(form);
    const evidenceLabel = element("label", "Independent review evidence");
    const evidence = element("textarea"); evidence.id = "bdh-evidence"; evidenceLabel.htmlFor = evidence.id; evidenceLabel.append(evidence);
    const reviews = element("div"); reviews.className = "bdh-actions";
    const actionNames: Record<Exclude<Action, "save">, string> = { submit: "Request validation", validate: "Record independent validation", approve: "Approve exact revision" };
    for (const action of ["submit", "validate", "approve"] as const) {
      if (!snapshot.actions.includes(action)) continue;
      if (action !== "submit" && !evidenceLabel.parentElement) body.append(evidenceLabel);
      const button = element("button", actionNames[action]); button.type = "button";
      button.addEventListener("click", () => {
        const expectedVersion = snapshot.revision?.version ?? 0;
        void command(action === "submit" ? { action, expectedVersion } : { action, expectedVersion, evidence: evidence.value });
      }, { signal: events.signal }); reviews.append(button);
    }
    body.append(reviews, preview);
    form.addEventListener("submit", event => { event.preventDefault(); void command({ action: "save", expectedVersion: snapshot.revision?.version ?? 0, input }); }, { signal: events.signal });
    if (state?.state === "approved") body.append(element("p", "Approved for the pilot review record. Public publication is not enabled."));
  }
  async function read() {
    const token = ++generation;
    try { const state = await bridge.read(); if (!disposed && token === generation) { snapshot = state; render(); status.textContent = "Private editor ready."; } }
    catch (error) { announce(error instanceof Error ? error.message : "Editor unavailable."); }
  }
  void read();
  return () => { disposed = true; generation++; events.abort(); root.remove(); };
}
