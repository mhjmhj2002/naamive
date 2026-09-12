# DT-001 — DeliveryTarget v1

**delivery_target_id:** DT-001  
**version:** 1  
**currentness:** CANDIDATE / NOT CURRENT  
**Project:** PRJ-001 — NAAMIVE MVP  
**target_name:** NAAMIVE MVP — First Usable Governed Context  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**Technology Baseline:** v0.10 — APPROVED / FROZEN  
**TIR:** v1.0 — APPROVED (technical envelope)  
**created_at:** 2026-09-11T20:43:24-03:00  
**supersedes_ref:** none  
**decision_status:** PENDING AUDIT + HUMAN APPROVAL  
**decision_authority_ref:** human:manuel-hinojosa:project-owner

## Scope statement

The candidate target commits the first usable governed NAAMIVE context: an
authorized human principal can authenticate, see only permitted Projects,
explicitly enter a Project context and observe factual contextual activity.

## Candidate membership

| Value Increment | Disposition |
|---|---|
| VI-001 — Authenticated Project Context | REQUIRED_FOR_TARGET |

## Candidate sets

```text
required_set......... VI-001
optional_set......... EMPTY
out_of_target_set.... EMPTY
```

## Decision evidence

```text
planning baseline.... PBL-PRJ001-R1-v0.5
approval candidate... governance/ROUND_1_APPROVAL_CANDIDATE.md
audit history........ audits/AUD-001..., audits/AUD-002...
next required audit.. AUD-005 against exact manifest
```

This file is not proof that the target is current. `CANDIDATE → CURRENT` is an
explicit decision proposed for the later human approval package.

## Versioning rule

After v1 becomes CURRENT, any material change to scope or membership creates a
new governed version/decision. v1 must not be silently rewritten to reduce
commitment.

## Delivery rule if approved

Because VI-001 would be `REQUIRED_FOR_TARGET`:

```text
VI-001 not in a valid delivery condition
→ Delivery acceptance BLOCKED
```

No Delivery exists yet.

## Current gate evidence

```text
continuity_ref = CONT-PRJ001-005
cause_ref      = FND-003 / AUD4-001
next_audit     = AUD-005
```

This does not make DT-001 current. DT-001 v1 remains CANDIDATE / NOT CURRENT.
