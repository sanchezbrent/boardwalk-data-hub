# Boardwalk integration investigation

Inspected November 20, 2026 at canonical `CenterCoopMedia/njpbs` commit
[`9448591b8fd2f42e9172d89b9e9b00f50d61074d`](https://github.com/CenterCoopMedia/njpbs/tree/9448591b8fd2f42e9172d89b9e9b00f50d61074d).
The checkout was read-only. The old private `njpbs-site` repository was not used
as the current integration target. Source inspection is not a production-serving
receipt. The prior electricity contract was recovered from the team's unmerged
foundation work based on `d25d481`; this project does not claim that draft landed.

## Findings and consequences

| Existing surface                                                                                                                                                                                                                                                                                                                                                                                                            | What it establishes                                                                                                                                     | Integration consequence                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Root README](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/README.md)                                                                                                                                                                                                                                                                                                             | Astro Site, React Admin, Functions, Cloudflare API, shared contracts and serializer services; Node 22; CI and independent review                        | Keep the editor in its own repository, with small reviewed host changes through the canonical repository                                                                                       |
| [Shared content-core](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/packages/content-core/README.md)                                                                                                                                                                                                                                                                               | Source contracts are framework-neutral TypeScript imported by relative path; Functions uses compiled contracts                                          | An external plugin is a new package boundary. Pin the package, compile server contracts deliberately and test browser/server parity rather than copy hand-maintained mirrors                   |
| [Lazy route modules](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/admin/src/routes/routeModules.ts) and [route builder](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/admin/src/routes/buildRoutes.tsx)                                                                                                                                  | React Router lazy workspaces within a shared shell, inner error boundary and host focus behavior                                                        | Add a host-owned `/plugins/data-hub` lazy route and navigation item; mount the DOM editor through the provided React wrapper. Preserve shell, admission, errors and focus manager              |
| [Hub composition](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/packages/content-core/src/data-hub-composition.ts)                                                                                                                                                                                                                                                                 | `data_hub_section` selects compiled sections and editorial headings/introductions                                                                       | Existing Page composition cannot replace data-value authoring. Keep layout/reporting changes and data revisions separate                                                                       |
| [Dataset model](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/packages/content-core/src/datasets.ts), [dataset API](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/functions/datasets.js), [figure model](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/packages/content-core/src/data-figure.ts) | Generic datasets have release validation, optimistic versions, permissions and refresh processing; figures choose latest-approved or pinned release IDs | Reuse patterns and host facilities; do not redirect the Hub pilot through dataset approval and accidentally trigger owner-by-owner refreshes                                                   |
| [RBAC](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/packages/content-core/src/rbac.ts)                                                                                                                                                                                                                                                                                            | Deny-by-default capabilities, trusted principal resolution, explicit scopes; super_admin derives from the complete capability list                      | Installation needs explicit plugin grants and an activation gate. Do not infer data approval from content publishing or append permissions to a list that silently expands every administrator |
| [Admin transport](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/admin/src/lib/functions.ts), [gateway config](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/cms-api/src/config.ts) and [Firestore rules](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/firestore.rules)                          | Host auth/App Check/session transport, endpoint body/rate contracts and server-only dataset storage                                                     | Add one explicit host endpoint with the existing request protections. Keep direct client DB access denied; never give the plugin Firebase tokens or provider credentials                       |
| [Compiled reader](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/site/src/data/njpbs-data-hub-v16.html)                                                                                                                                                                                                                                                                             | One embedded source envelope, specialized shapes and data-bearing rendering/export literals                                                             | Inventory is only a migration start. Every figure needs a strict profile plus public/preview/export parity. Do not force treemaps, county data, cohorts and totals into electricity's schema   |
| [Cloud publication](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/docs/cms/cloud-publisher.md) and [public Worker controls](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/docs/cms/public-worker-deploy.md)                                                                                                                               | Pinned source/context, immutable artifacts, owners, journals, acceptance receipts and recovery rules                                                    | The plugin prepares private candidates. The existing release owner must eventually activate one complete Hub/embeds/export family against its expected predecessor                             |

No general runtime plugin registry or installable CMS plugin loader was found in
the package layout, route registry or gateway configuration inspected. Existing
integrations and the Premiere panel are useful precedents for boundaries, not
proof of a reusable in-CMS plugin system. ADR 0020 is a proposed vendor-neutral
integration principle; it does not already implement the host needed here.

The read-only inventory at this SHA found exactly 18 unique registered figures,
with the reader source matching the November 9 dated snapshot. The report contains
file digests and metadata gaps; it does not independently validate agency values,
source licenses, current production content or the reader's out-of-JSON literals.

## Proposed first host PR

1. Add a static reviewed installation configuration, default off, containing the
   exact package version/integrity, host API major and declared plugin permissions.
   Define host-owned activation and per-user plugin grants. Require an active staff
   principal and explicit grants, including for administrators. Keep existing
   roles and non-plugin workflows unchanged.
2. Add a lazy route and shell navigation entry using the existing route constants,
   chunk/preload conventions, error boundary, labels and focus rules. Import
   `examples/boardwalk/PluginRoute.tsx` as the reference wrapper. The host constructs
   a stable bridge through its existing authenticated request helper. Responses
   supply allowed actions; buttons are not the authorization layer.
3. Add one configured gateway/Functions endpoint for `read`, `save`, `submit`,
   `validate` and `approve`. Reuse host admission, App Check, CORS/CSRF/origin
   protections, request size/rate controls and privacy-safe error handling.
   `handleWorkspaceRequest` shows the server seam. The verified session binds the
   actor; capabilities/enablement are reread inside the storage transaction.
4. Implement the `HostTransaction` port. Store private revisions, immutable history
   and audit events atomically with the expected version. Enforce source ownership,
   record/family scope and any host-specific retention rules in this adapter. The
   current port is one electricity workspace, not a multi-tenant collection API.
   Recheck source base-revision references against trusted records at import.
   Keep private evidence outside any eventual public projection.
5. Add deny rules for every new private collection. Update explicit configuration
   input, Functions contract build, endpoint inventory and release surface registry
   together where the host's checks require them. Do not add production settings,
   secrets or automatic deployment. Test anonymous/inactive/revoked users, default
   off, direct DB access, stale/concurrent requests and independent review through
   the real emulator/gateway path.
6. Give the first draft a reviewed source import. The pilot refuses to invent
   migration metadata or silently use synthetic values. Check keyboard, focus,
   shell navigation, auth expiry and narrow-screen behavior in the real host.

The wrapper is type-checked against React 18, matching the inspected host. It has
not been applied to Boardwalk or run inside its application. The transaction port
is exercised against a serialized memory implementation only; it is not a
Firestore adapter or authorization-emulator proof. The host's required CI and
independent review still apply to that future PR.

## Publication is a separate boundary

The pilot stops at a private approval bound to the exact input digest. There is no
`publish` action. Before any public activation, the host must verify reviewer/grant
validity and reuse terms, generate all required public outputs under one pinned
renderer/context, verify stored bytes, then atomically choose a complete manifest
against the expected predecessor. Competing Page/data changes must refuse or
revalidate. A timeout or partial preparation must leave the old complete family
selected and retain its original recovery owner/journal.

Latest-approved Hub figures, embeds and downloads must share the accepted manifest.
Pinned revisions must serve retained immutable artifacts, including legacy URLs,
instead of being re-rendered with newer code. Restore creates a new draft and
requires fresh review; public rollback is a reviewed forward activation. None of
these guarantees can be claimed from the current compiled reader or this pilot.

## Immediate data turnaround

Until the full reader/publication path is reviewed and deployed, use a narrow
canonical-source PR: agency evidence and matching-series checks, current source
and every dependent caption/export/accessible literal, a new unused dated snapshot,
separate editorial validation/approval, focused CI and responsive/pinned-output
review. An authorized release operator follows the existing pinned release controls.
Do not overwrite historical snapshots or treat saving/approving a draft as a
public update. No deployment or production publication was authorized in this work.

## Reproducible package delivery is part of the host work

The current [Functions compiler](https://github.com/CenterCoopMedia/njpbs/blob/9448591b8fd2f42e9172d89b9e9b00f50d61074d/scripts/lib/functions-contracts.mjs)
accepts entry facades only under content-core or Site library paths. Its resolver
rejects unexpected package imports and reconstructs compiled contract bytes from
tracked Git inputs. An npm install plus an import into a facade will currently fail.
Do not loosen that resolver to accept arbitrary node_modules or build-time network
fetches; those would lose the existing source/release graph guarantee.

For the first host increment, import an approved plugin package as a committed
snapshot under a dedicated plugin vendor directory. Verify its artifact SHA-256,
reviewed source/tested-tree identity, manifest and version before extraction; keep
compiled dist files, declarations, LICENSE and NOTICE together. Record these
identities in the host-owned installation manifest and audit updates as plugin
upgrades. All plugin authoring and domain tests stay in this external repository.
The host consumes an immutable release snapshot, with no local domain-code edits.

A content-core facade can re-export the vendored server adapter through relative
imports and be added to the existing Functions recipe. Its transitive vendored JS
then belongs to the tracked Git graph and can be compiled by the current resolver.
The Admin lazy wrapper uses the same vendored browser entry and declarations;
adapt the logical package imports in the React example to this host delivery path.
Prove generated CommonJS and browser behavior against the same fixture cases, and
check source/notice retention in the host's immutable serializer build.

A later package-manager source supplier can replace this snapshot step only after
it pins integrity, includes all transitive package bytes in the immutable release
graph, and passes reproducibility/retention tests. A bare ESM import into the
CommonJS Functions entry or an unpinned Git URL is not a supported integration.
No npm registry publication is required for the committed-snapshot pilot.
