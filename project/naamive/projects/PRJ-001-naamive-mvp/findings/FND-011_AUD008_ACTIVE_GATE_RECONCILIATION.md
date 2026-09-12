# FND-011 — AUD8-001 reconciliação de instruções ativas do gate

**Status:** RESOLVED — remediation materialized in v1.0; audit phase closed by human decision
**Severity:** P1  
**Blocking:** NO — historical causal record retained
**source_finding:** AUD8-001  
**source_evidence:** audits/AUD-008_PLANNING_ROUND_1_CODEX.md  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**owner:** human:manuel-hinojosa:project-owner  
**supersedes:** FND-009

AUD-008 demonstrou que `MANUAL_OPERATING_MODEL.md` e
`AGENT_EXECUTION_POLICY.md`, ambos ativos e membros do pacote v0.8, ainda
apresentavam v0.5 e a autoria ChatGPT como candidata corrente. A v0.9
reconcilia explicitamente ambos para `PBL-PRJ001-R1-v0.9` e
`agent:codex:naamive-aud8-remediation`; baselines e produtores anteriores são
somente evidência histórica.

AUD-009 demonstrou que a reconciliação v0.9 era parcial: 24 objetos materiais
ativos ainda declaravam v0.5 sem record individual de revalidação. A sucessora
v1.0 atualiza os objetos candidatos e registra source, target, decisão,
autoridade, evidência e resultado candidato por objeto em
`governance/BASELINE_REVALIDATION_AUD009.md`.

A decisão humana de fechamento confirmou que a revalidação da v1.0 materializa
corretamente a remediação. AUD-010 foi descartado porque o próprio registro
possuía metadata temporal inválida; nenhum finding substantivo novo foi aceito.
AUD-009 permanece a última auditoria histórica válida. Este encerramento não
promove lifecycle, não concede readiness e não autoriza implementação.
