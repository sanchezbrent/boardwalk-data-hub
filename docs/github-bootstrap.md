# GitHub setup and verification

Target selected by the user: `sanchezbrent/boardwalk-data-hub`, public.
Use the official GitHub CLI authenticated as the intended owner. Do not put a token
in source, command arguments, issue bodies or logs. The script delegates credential
handling to `gh` and verifies admin access through the API.

The repository's local `main` commit contains a minimal README, ownership and
contributor policies, license, the host API version marker and the pinned CodeQL
workflow. The feature branch contains the actual plugin and full CI. This lets
CodeQL produce a real base result before the first implementation PR is gated.
The initial baseline push is the sole repository-creation bootstrap; implementation
lands through a reviewed PR after the rules are active.

Inspect CODEOWNERS before creation. Its named users must already have write access;
the bootstrap grants no access. GitHub does not let an author approve their own PR.
If the account is the only eligible owner/reviewer, the PR stays blocked until the
owner separately arranges a qualified independent reviewer and an appropriate
CODEOWNERS update. Do not disable review to unblock the first change.

From the clean implementation branch:

```sh
python3 scripts/bootstrap-github.py --owner sanchezbrent --name boardwalk-data-hub
python3 scripts/bootstrap-github.py --owner sanchezbrent --name boardwalk-data-hub --apply
```

Apply creates the repo, checks access, pushes the baseline, applies repository and
Actions settings, enables security reporting/scanning features, waits for baseline
CodeQL, installs active rulesets with no bypass actors and reads settings back.
Then it pushes the implementation and opens a draft PR. It does not enable a paid
service, grant collaborator access, create deployment secrets, merge, publish a
package or deploy. Main and `v*` tag deletion/force updates are blocked. Merge-queue
events are handled, but a GitHub merge queue is not required or assumed available
for this account/plan.

GitHub may apply stricter organization/account policy or reject an unavailable
setting. The script fails rather than silently omitting the gate. A partial setup
is retained. Inspect its exact state, then use the same command with `--resume`.
Resume verifies the public/admin target, the expected baseline SHA and matching
existing rulesets; it refuses another repository history or a mismatching policy.
A failed setup must not be described as fully protected.

The final receipt reports repository/PR URLs, exact source and verified rulesets.
After CI completes, read PR checks and effective rules once more. In an authorized
disposable branch/PR, prove failed CI and missing approval prevent merging; do not
weaken the real rules to perform that check. This behavioral merge-denial proof is
separate from API settings readback. It is not claimed until performed.

The repository owns candidate package artifacts and SBOMs. A released package
needs its own explicit release authorization, reviewed main SHA, passing required
checks, version/changelog and immutable tag. A future registry publication should
use trusted publishing/provenance and protected release controls. No npm publishing
workflow or token is installed by this pilot.

Verified against official GitHub documentation on November 20, 2026:
[rulesets and code-scanning thresholds](https://docs.github.com/en/rest/repos/rules),
[Actions settings and SHA pinning](https://docs.github.com/en/rest/actions/permissions),
[secure action use](https://docs.github.com/en/actions/reference/security/secure-use),
[repository security features](https://docs.github.com/en/rest/repos/repos).
