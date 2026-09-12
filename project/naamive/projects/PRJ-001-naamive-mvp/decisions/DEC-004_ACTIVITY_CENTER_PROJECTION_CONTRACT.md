# DEC-004 — Initial Activity Center projection contract

**Status:** PLANNING DECISION CANDIDATE — covered by round audit before approval  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Implementation owner:** WI-010

## Projection identity

```text
projection.activity_center
```

It is a derived read model, never canonical truth.

## Initial canonical sources

Version 1 derives only from explicitly declared durable Project-scoped facts:

```text
Project canonical current/history exposed by the Project public query/source contract
material audit/governance history explicitly linked to PRJ-001 when included by the projection contract
```

Logs, the Execution Board, browser state, SSE payloads and ad-hoc agent prose are
not canonical sources.

Adding another source is a versioned material change to this projection contract.

## Required projection fields

Each projected activity item preserves at minimum:

```text
project_id
source_type
source_ref
source_version / source_watermark
factual event kind
occurred_at
observed_at
projection_version
```

## Rebuild

A rebuild must be able to discard derived rows for the affected Project and
recompute them deterministically from the declared canonical sources.

Rebuild must prove:

```text
same canonical source set → equivalent factual projection
no duplicate canonical mutation
watermark advances monotonically per source
restart does not lose ability to rebuild
```

## Invalidation / realtime

Canonical commit persists a durable projection invalidation/handoff according to
TB/TIR. SSE carries only an invalidation hint. Reconnect or lost notification
causes canonical refetch; NOTIFY/SSE is never the durable source.

## Staleness

Staleness is observable by source watermark/version. The UI must not present a
stale projection as canonical state.

## Tests

WI-010 owns rebuild/idempotence/watermark/source tests. WI-011 owns realtime
invalidations and reconnect/refetch behavior.
