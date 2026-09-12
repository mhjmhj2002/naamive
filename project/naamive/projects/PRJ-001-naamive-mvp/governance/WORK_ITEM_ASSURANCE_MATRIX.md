# Work Item Assurance Matrix — VI-001

**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002

This matrix is an index. The individual WI file is authoritative for its full
acceptance/test/evidence obligations.

| WI | Dependency refs | Minimum test obligation | Minimum evidence | Review/evidence |
|---|---|---|---|---|
| WI-001 | none | frozen pnpm install succeeds from committed lockfile (+ WI-specific suite) | tool/version snapshot and lockfile digest (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-002 | WI-001 | clean PostgreSQL migration creates principal structures and constraints (+ WI-specific suite) | migration output on PostgreSQL 18.6 (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-003 | WI-002 | valid credential succeeds through typed endpoint (+ WI-specific suite) | unit/application tests for credential/rate-limit rules (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-004 | WI-003 | raw reusable session token is never stored in DB (+ WI-specific suite) | database inspection proving no raw token (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-005 | WI-002, WI-004 | allowed grant permits exact Project scope (+ WI-specific suite) | AuthorityService unit/application tests (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-006 | WI-004, WI-005 | valid session returns typed bootstrap DTO (+ WI-specific suite) | API schema/contract tests (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-007 | WI-005, WI-006, WI-013 | allowed Projects returned from canonical Project source (+ WI-specific suite) | API integration tests with allowed/denied Projects (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-008 | WI-007 | deep link /projects/:projectId loads allowed Project after refresh (+ WI-specific suite) | router/UI behavior tests (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-009 | WI-006, WI-007, WI-008 | Login remains separate from AppShell (+ WI-specific suite) | React Testing Library behavior tests (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-010 | WI-008, WI-009, WI-013 | projection rows retain source_ref/source_version/watermark (+ WI-specific suite) | projection integration/rebuild test outputs (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-011 | WI-009, WI-010 | one authenticated stream per AppShell/tab (+ WI-specific suite) | SSE integration tests (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-012 | WI-003..WI-011, WI-013 | Playwright happy path login→authorized Project→context→Activity Center (+ WI-specific suite) | Playwright reports/traces/screenshots where applicable (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |
| WI-013 | WI-001 | clean migration creates Project current/history structures in real PostgreSQL (+ WI-specific suite) | migration/constraint integration outputs (+ referenced outputs) | MATERIAL: independent evidence or exact upstream coverage |

## Global rule

WI-012 consolidates integrated/E2E Validation evidence. It does **not** replace
unit/application/integration/API/UI/architecture evidence owned by earlier WIs.

Every dependency must satisfy the explicit condition in the dependent WI on a
compatible baseline; file existence or agent assignment is insufficient.

## TB-140 mapping assurance

| WI set | Normative owner | Physical TB-140 anchor | Owner verification |
|---|---|---|---|
| WI-001 | PROJECT: PRJ-001 | PROJECT_TRANSVERSAL + project_id | project_id == PRJ-001 |
| WI-002..WI-013 | MODULE: MOD-001 | VALUE_INCREMENT + value_increment_id=VI-001 | VI-001.module_id == MOD-001 |

Before readiness and before Execution, Module-owned WIs must prove the mapping
still resolves on the current/covered baseline.

A mismatch is blocking and must not be repaired by inventing a new persistence
shape during implementation.

See `../decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.
