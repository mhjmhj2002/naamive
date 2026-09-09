# NAAMIVE — Technology Baseline 2.10 Remediation Backlog

**Status:** OPEN  
**Source:** `audits/AUD-014_TECHNOLOGY_BASELINE_DESTRUCTIVE_AUDIT.md`  
**Target:** close all P1 before 2.11  
**Implementation:** NOT AUTHORIZED

---

# R-TB-01 — Decision traceability

Close `TB-AUD-001`.

Deliver:

```text
complete D2.1..D2.8 → consolidated TB mapping
restore omitted material decisions
mark deliberate supersessions explicitly
no silent decision loss
```

Acceptance:

```text
every approved D2.x-y has one disposition:
PRESERVED
MAPPED
SUPERSEDED WITH REASON
```

---

# R-TB-02 — Cross-module Unit of Work

Close `TB-AUD-002`.

Add explicit architecture rule:

```text
Application Coordinator opens transaction
module public/application ports participate in same UoW
module adapters write only module-owned tables
repositories never commit independently inside coordinated command
single boundary commit
```

Add destructive test scenario for failure between module writes.

---

# R-TB-03 — Session / authority persistence

Close `TB-AUD-003`.

Define physical model for:

```text
principal
human session
session hash/token identity
expiration
revocation
grant
delegation
revocation
authority history
baseline binding
security audit linkage
```

Prove restart + revocation.

---

# R-TB-04 — Work Item governing scope FK

Close `TB-AUD-004`.

Choose enforceable physical model.

Required property:

```text
exactly one governing scope
+
real FK
+
no orphan
```

Do not leave only `(scope_type, scope_id)` without DB-enforceable referential
integrity.

---

# Verification after remediation

```text
P0 expected = 0
P1 expected = 0
```

Then proceed to:

```text
2.11 — Technology Baseline approval / freeze
```
