# Contributing

Use Node 22.23.5 and `npm ci --ignore-scripts`. Work on a feature branch, then
run `npm run check`, `npm run test:browser` and `npm run pack:check`. Install the
browser once with `npx --no-install playwright install chromium`.

PRs need an independent approval, code-owner review, approval after the last push,
resolved conversations, an up-to-date branch, `ci`, `codeql`, and CodeQL results
without high/critical security findings or error-level alerts. The rulesets must
be applied in GitHub; checked-in JSON alone does not enforce these requirements.
An author cannot supply their own approval. Do not bypass a gate to land the pilot.

Changes to a public schema, protocol, trust boundary or public renderer need a
compatibility note and focused failure cases. During 0.x, minor releases may break
consumers; pin an exact version and update host and plugin together after review.
Preserve the NJ PBS MIT notice for adapted source. Editorial data and branding are
not covered by the code license. Production deployment and activation are separate.
