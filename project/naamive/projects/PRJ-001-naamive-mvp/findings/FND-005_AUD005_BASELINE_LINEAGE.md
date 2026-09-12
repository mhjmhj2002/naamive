# FND-005 — AUD5-002 linhagem de baseline

**Status:** SUPERSEDED — AUD-006 abriu sucessores de cobertura/currentness  
**Severity:** P1  
**Blocking:** NO — histórico; a consequência ativa foi sucedida  
**source_finding:** AUD5-002  
**source_evidence:** audits/AUD-005_PLANNING_ROUND_1_CODEX.md  
**business_baseline_ref:** PBL-PRJ001-R1-v0.6  
**normative_baseline_ref:** NB-0002  
**owner:** human:manuel-hinojosa:project-owner
**superseded_by:** FND-006 / AUD6-001; FND-007 / AUD6-002

## Gap e remediação candidata

PBL-PRJ001-R1-v0.5 contém uma auto-referência em `supersedes_ref`, em conflito
com seu certificado. PBL-PRJ001-R1-v0.6 substitui explicitamente v0.5; seu
manifesto e certificado devem declarar o mesmo predecessor e ser verificados
como um pacote determinístico.

AUD-006 deve confirmar que não há auto-supersessão nem predecessor concorrente
nas fontes de baseline, que v0.5 é preservada como evidência histórica e que a
classificação de impacto da sucessora está explícita.

AUD-006 preservou este finding como histórico e abriu FND-006/FND-007. Este
registro não define blocker ou próxima ação corrente.
