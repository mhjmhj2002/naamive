# NAAMIVE — Semantic Action and Progress API Model

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Escopo:** comandos semânticos, stale fencing e queries para internal progress

---

# 1. Stale command

Commands materiais devem carregar expected version/watermark/context. Stale command é rejeitado e exige refresh/refetch antes de nova decisão.

# 2. Semantic commands

API representa intenção de negócio/governança. Exemplos: `acceptValueIncrement`, `approveTargetVersion`, `splitValueIncrement`, `prioritizeOptional`, `acceptDelivery`. Setter genérico de status é inválido.

# 3. Query completeness

Queries devem expor contexto suficiente para target/version, phase cycle, roadmap, value map, current work, functional progress, findings/risks, allowed actions e timeline refs.
