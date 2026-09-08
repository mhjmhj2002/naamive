# NAAMIVE — Semantic Action and Progress API Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  
**Escopo:** comandos semânticos, stale fencing e queries para internal progress

---

# 1. Stale command

Commands materiais devem carregar expected version/watermark/context. Stale command é rejeitado e exige refresh/refetch antes de nova decisão.

# 2. Semantic commands

API representa intenção de negócio/governança. Exemplos: `acceptValueIncrement`, `approveTargetVersion`, `splitValueIncrement`, `prioritizeOptional`, `acceptDelivery`. Setter genérico de status é inválido.

# 3. Query completeness

Queries devem expor contexto suficiente para target/version, phase cycle, roadmap, value map, current work, functional progress, findings/risks, allowed actions e timeline refs.
