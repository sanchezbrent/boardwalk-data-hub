# Contributor instructions

- Read README.md and the relevant source before changing it. Use a feature branch and PR.
- Keep the host protocol framework neutral. Browser bundles must import no server credentials or vendor SDKs.
- Installation grants no authority. Server adapters authenticate afresh and deny unspecified capabilities.
- Keep fixtures synthetic with example.org sources. Keep credentials, private data and deployment settings out of source and logs.
- Preserve strict schemas, review separation, digest binding, CAS, history and failure behavior.
- Run npm run check, npm run test:browser and npm run pack:check for affected changes.
- Do not weaken assertions, silently change snapshots, merge, deploy or publish as part of source work.
- Explain changed/removed tests and document API compatibility in the PR.
- UI work requires keyboard/focus, narrow-screen and accessibility checks.
