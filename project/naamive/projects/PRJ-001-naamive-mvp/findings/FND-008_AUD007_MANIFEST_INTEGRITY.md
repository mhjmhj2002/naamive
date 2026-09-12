# FND-008 — AUD7-001 integridade dos membros da baseline

**Status:** RESOLVED — verificado por AUD-008  
**Severity:** P1  
**Blocking:** NO — resolução histórica retida  
**source_finding:** AUD7-001  
**source_evidence:** audits/AUD-007_PLANNING_ROUND_1_CODEX.md  
**business_baseline_ref:** PBL-PRJ001-R1-v0.8  
**normative_baseline_ref:** NB-0002  
**owner:** human:manuel-hinojosa:project-owner  
**supersedes:** FND-006

AUD-007 comprovou que `README.md` e `activity/ACTIVITY_LOG.md` divergiam dos
hashes e tamanhos declarados pelo manifesto v0.7. A v0.8 cria uma nova lista
fechada, calculada sobre os conteúdos atuais, com novo certificado e sem alterar
AUD-007 nem declarar a v0.7 íntegra retroativamente.

AUD-008 confirmou hash e tamanho dos 63 membros, a correspondência entre
manifesto e certificado e a proveniência temporal do pacote v0.8. A resolução
é evidence histórica e não aprova a rodada.
