# NAAMIVE — TIR Version Snapshot

**Status:** FIXED FOR INITIAL BOOTSTRAP  
**Verified/selected:** 2026-09-10  
**Policy:** exact direct dependency pins + committed pnpm lockfile

---

# Runtime / data

| Component | Selected |
|---|---:|
| Node.js | 24.21.0 LTS |
| PostgreSQL | 18.6 |
| pnpm | 12.3.4 |
| TypeScript | 7.0.2 |

---

# Application stack

| Package | Selected |
|---|---:|
| fastify | 5.12.3 |
| typebox | 1.3.30 |
| @fastify/type-provider-typebox | 6.1.0 |
| react | 19.2.8 |
| react-dom | 19.2.8 |
| react-router | 8.3.1 |
| vite | 8.2.2 |
| @tanstack/react-query | 5.102.8 |
| kysely | 0.29.5 |
| pg | 8.23.0 |
| pino | 10.3.1 |
| uuid | 14.0.2 |
| bootstrap | 5.3.8 |
| bootstrap-icons | 1.13.1 |

---

# Test stack

| Package | Selected |
|---|---:|
| vitest | 5.0.0 |
| @playwright/test | 1.63.0 |
| @testing-library/react | 16.3.3 |
| @testing-library/dom | 10.4.1 |
| @testing-library/jest-dom | 7.0.1 |
| jsdom | 30.0.1 |

---

# Selection policy

The snapshot favors:

```text
supported stable release
+
compatibility with frozen Technology Baseline
+
reproducible bootstrap
```

`react` / `react-dom` deliberately remain on 19.2.8 instead of adopting a
same-day/newer line during the readiness freeze.

Exact direct dependencies must not use `^` or `~` in the initial bootstrap
package manifests.

`pnpm-lock.yaml` freezes the complete resolved graph.

Security/bugfix updates are not forbidden. They must pass the same regression
gates, and major-line changes require explicit technical review.

---

# Source note

The selected versions were checked against official Node.js/PostgreSQL release
information and current npm package metadata on 2026-09-10.

This document records a reproducible engineering snapshot; it is not a claim
that every selected package must remain forever on this exact patch release.
