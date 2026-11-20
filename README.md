# Boardwalk Data Hub

The first Boardwalk CMS plugin pilot: a separate Data Hub editor with an explicit
host contract, strict electricity-data profile, private review workflow and local
browser demonstration. The intended public home is
[sanchezbrent/boardwalk-data-hub](https://github.com/sanchezbrent/boardwalk-data-hub).
Repository creation and hosted settings require a verified bootstrap receipt;
this link alone does not claim that setup has completed.

This is a working development increment. Boardwalk's production CMS is not yet
wired to it. There is no production publication endpoint, database adapter, full
18-figure editor or claim of renderer/export parity.

## Try the pilot

Use Node 22.23.5 and npm:

```sh
npm ci --ignore-scripts
npm run demo
```

Open http://127.0.0.1:4173. The demo has synthetic values, simulated staff roles,
a fixed November 20, 2026 test clock and tab-local state. Save a private draft,
request validation, switch to the independent validator and record evidence,
then switch to the editorial approver and approve the exact revision. Reloading
clears state. It cannot affect Boardwalk or public data.

Only the demo supplies synthetic starting values. An actual host must supply a
reviewed import before a first draft can be created. The production UI never
silently seeds a draft with the synthetic fixture.

## What belongs here

| Surface | Responsibility |
| --- | --- |
| `src/contract.ts` | Framework-neutral manifest, API compatibility, exact host allowlist, mount/unmount lifecycle |
| `src/electricity.ts` | Strict input schema, source and reuse metadata, matched NJ/US monthly comparisons |
| `src/server.ts` | Trusted review transitions, SHA-256 input binding, capability checks and stale-version refusal |
| `src/host-adapter.ts` | Authentication/transaction port for a small Boardwalk server adapter |
| `src/ui.ts` | Framework-neutral editor, value preview and review actions using only a supplied bridge |
| `scripts/inventory.mjs` | Explicit-path, read-only inventory of all 18 existing figures and snapshot parity |
| `examples/boardwalk/PluginRoute.tsx` | Type-checked React route wrapper for Boardwalk's lazy routes |
| `.github/` | CI, CodeQL, Dependabot, PR/issues, ownership and applyable merge rules |

Boardwalk owns staff identity, explicit plugin activation/grants, trusted storage,
audit retention, public rendering and release control. A manifest requests
capabilities; it grants none. First-party plugin code is reviewed and bundled with
the host. The contract is not a sandbox for untrusted third-party JavaScript.

## Verify

```sh
npm run check
npx --no-install playwright install chromium
npm run test:browser
npm run pack:check
python3 -m unittest discover -s tests -p '*_test.py'
```

CI also runs a high-severity dependency audit, dependency review, scheduled
CodeQL, browser accessibility checks and package/SBOM artifact generation.
All action references are immutable SHAs. PR and merge-group checks run without
path filters; `ci` fails if a required job fails or is unexpectedly skipped.
No CI job deploys, publishes to npm or approves a PR.

The active main ruleset requires one independent approval, code-owner review,
new approval after the last push, stale-review dismissal, resolved threads,
up-to-date `ci` and `codeql` checks from GitHub Actions, and CodeQL results
without high/critical security findings or error-level alerts. It blocks forced
updates and deletion, requires linear history and permits squash merges.
Release tags cannot be deleted or moved. These are enforcement settings only
once applied and independently read back through GitHub.

## Boardwalk integration

Start with the [source-backed integration investigation](docs/boardwalk-integration.md),
[plugin decision](docs/plugin-architecture.md) and [delivery roadmap](docs/roadmap.md).
The complete editor requirements remain tracked in
[Boardwalk issue 213](https://github.com/CenterCoopMedia/njpbs/issues/213).

Use `npm run inventory -- --reader /absolute/reader.html --snapshot /absolute/snapshot.json`
for local migration inspection. This validates registry/snapshot identity and
retains heterogeneous payloads internally. It emits metadata only. It neither
converts legacy values to approved data nor proves source accuracy or reuse rights.

## GitHub bootstrap

The local Git history separates a minimal governance/CodeQL baseline on `main`
from `feature/data-hub-plugin-pilot`. With the official GitHub CLI authenticated:

```sh
python3 scripts/bootstrap-github.py --owner sanchezbrent --name boardwalk-data-hub
python3 scripts/bootstrap-github.py --owner sanchezbrent --name boardwalk-data-hub --apply
```

The first command is a plan. Apply creates a new public repository, verifies admin
and existing code-owner access, scans the baseline, applies and reads back settings,
then opens the implementation as a draft PR. It grants no collaborator access,
merges nothing and deploys nothing. Read [the bootstrap runbook](docs/github-bootstrap.md)
before applying or resuming a partial setup.

Code is MIT licensed, retaining the NJ PBS notice. No editorial-data, trademark
or logo rights are implied. See [NOTICE](NOTICE).
