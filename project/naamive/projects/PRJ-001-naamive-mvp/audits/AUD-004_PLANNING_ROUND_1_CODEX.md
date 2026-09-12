# AUD-004 — Quarta auditoria independente, destrutiva e adversarial da rodada 1

**Resultado:** FAIL
**Data:** 2026-09-11T22:26:27-03:00
**audit_id:** AUD-004
**Objeto:** ROUND-1-APPROVAL-CANDIDATE
**business_baseline_ref:** PBL-PRJ001-R1-v0.4
**normative_baseline_ref:** NB-0002
**manifest_sha256 verificado:** 7dfa2dd5a72dacf5df8fba47af9136c072af70297ea5095d4bf5591ad97ac4d2

## Registro de independência e escopo

    auditor_principal_id: agent:codex:naamive-independent-audit
    author_principal_id:  agent:chatgpt:naamive-planning-r1-v0.4
    independence_status:   ATTESTED — principals declarados distintos; sem atestação criptográfica local
    scope:                 exclusivamente project/naamive/; PRJ-001 / MOD-001 / VI-001,
                           baseline v0.4, AUD3-001 e AUD-001..010 / AUD2-001..004
    baseline:              PBL-PRJ001-R1-v0.4 / NB-0002
    criteria:              lifecycles, TB v0.10/TB-140, evidence, authority, continuity/recovery e currentness
    evidence_considered:   MANIFEST, certificado, 50 membros, AUD-001..003, DEC-001..005,
                           FND-001..002, matriz, WI-001..013 e normas ratificadas locais
    result:                FAIL
    limitations:           somente arquivos locais; sem web, remoto, GitHub, fetch, pull ou sincronização;
                           sem prova criptográfica externa da identidade SaaS dos principals

Não foi alterado artefato de planejamento, estado, aprovação ou baseline. Este
relatório é a única escrita desta auditoria.

## Integridade da baseline candidata

O SHA-256 calculado para MANIFEST.md é
7dfa2dd5a72dacf5df8fba47af9136c072af70297ea5095d4bf5591ad97ac4d2, igual ao
certificado. Também conferem baseline_id PBL-PRJ001-R1-v0.4,
normative_baseline_ref NB-0002, member_count 50, supersedes_ref
PBL-PRJ001-R1-v0.3 e currentness de candidata para reauditoria, não aprovada.

Foram recalculados SHA-256 e tamanho das 50 linhas hash/size/path: todos
conferem e não há membro ausente ou divergente. Manifesto e certificado não são
membros por desenho declarado; AUD-004 é evidence posterior e também não é
membro. Arquivos não listados foram tratados como fora desta candidata. A
baseline é íntegra e reconstruível como conjunto de membros.

## Teste destrutivo de AUD3-001 / DEC-005

Tentei invalidar DEC-005 por três vias: converter VALUE_INCREMENT em owner
normativo, exigir work_item.module_id, ou tornar a revalidação de Module ambígua.
Nenhuma se sustenta nas autoridades locais.

- NB-0002 dá precedência a lifecycle e impõe fail-closed. 01_LIFECYCLE_MODEL
  §4.5 e 05_WORK_ITEM_LIFECYCLE §2 exigem exatamente um owner, Project ou
  Module; §44 fixa Module → ValueIncrement → Work Item e a referência à VI.
- 23_CROSS_LIFECYCLE_MODEL §2 confirma Work Item Project or Module scope, com
  VI no caminho Module; ValueIncrement pertence a exatamente um Module. TB-31
  confirma um único Module owner da ValueIncrement.
- TB-140 congela somente o mecanismo físico: VALUE_INCREMENT exige FK real para
  ValueIncrement e project_id NULL; PROJECT_TRANSVERSAL exige FK real para
  Project e value_increment_id NULL. Não cria novo owner normativo, e a
  baseline técnica declara que não redefine lifecycle.

DEC-005 preserva campos, enums e FKs de TB-140. WI-001 mapeia PROJECT: PRJ-001
para PROJECT_TRANSVERSAL + project_id; WI-002..WI-013 mapeiam MODULE: MOD-001
pela relação total e unívoca work_item.value_increment_id →
value_increment.module_id. VALUE_INCREMENT é âncora física/FK, não terceiro
owner; não é necessária coluna module_id no Work Item, nem enum MODULE.

Os 13 WIs estão PROPOSED, 0 READY e 0 possuem Execution. WI-001 declara Project
owner; WI-002..WI-013 declaram Module owner, VI-001, VALUE_INCREMENT e
VI-001.module_id = MOD-001. A matriz reproduz a mesma relação.

DEC-005 requer antes de READY e de cada Execution revalidar WI, VI,
VI.module_id, Module, Project ancestral, baseline, authority e cobertura KEEP,
REVALIDATE, SUPERSEDE, REVOKE e RECONCILE. Também determina impacto de mudança
de Module pelo join de value_increment.module_id, de VI pela FK direta e de
Project direta ou por VI→Module→Project, e proíbe expor o discriminador físico
como owner no domínio/transport. Não resta decisão material ao implementador.

**Conclusão de AUD3-001:** RESOLVED. DEC-005 é correspondência
semântico-física válida; não altera TB-140 nem requer sucessora da Technology
Baseline.

## Revalidação dos findings históricos

| Finding | Classificação | Evidência concreta na v0.4 |
|---|---|---|
| AUD-001 | RESOLVED | DEC-005, matriz e WI-001..013 deixam Project/Module como únicos owners; VI é referência/âncora física. |
| AUD-002 | RESOLVED | Module e VI permanecem IDENTIFIED; definição é candidata e transições seguem ordenadas. |
| AUD-003 | RESOLVED | Project segue PLANNING; DEC-001, gate, baseline e proibição de execução estão materializados. |
| AUD-004 | PARTIALLY_RESOLVED | DT-001 tem campos e membership corretos, mas sua evidence diz que o próximo audit é AUD-003, já concluído. |
| AUD-005 | PARTIALLY_RESOLVED | Roadmap aponta para CURRENT_CONTINUITY canônica, mas o record não tem cause_ref e manda refazer AUD-003. |
| AUD-006 | RESOLVED | DEC-002 separa TIR de authority/lifecycle; todos os WIs continuam PROPOSED. |
| AUD-007 | RESOLVED | DEC-003/004 e WI-013/010/011 definem fonte Project, projection, watermark, rebuild, invalidação e testes. |
| AUD-008 | RESOLVED | 13 WIs e matriz trazem owner, escopo, dependências verificáveis, critérios, testes, evidence e audit proporcional. |
| AUD-009 | RESOLVED | A candidata usada é somente project/naamive/; não há árvore aninhada concorrente. |
| AUD-010 | STILL_OPEN | CURRENT_STATE:38 e EXECUTION_BOARD:17 dizem AUD-003 NOT EXECUTED; AUD-003 e ACTIVITY_LOG:A-014 registram seu FAIL. |
| AUD2-001 | RESOLVED | Manifesto/certificado v0.4 fecham em 50 membros, hashes e tamanhos íntegros. |
| AUD2-002 | RESOLVED | Solicitação e registro de segregação identificam autor, auditor, baseline e limitação. |
| AUD2-003 | RESOLVED | Registro de riscos contém owner, impacto, tratamento, vínculos e gatilhos de revalidação. |
| AUD2-004 | RESOLVED | Disposição permanece membership da VI; Module a declara somente derivação. |

Dos 13 findings que AUD-003 marcou RESOLVED, 10 permanecem resolvidos, dois
regrediram para PARTIALLY_RESOLVED e um para STILL_OPEN.

## Novo finding

### AUD4-001 — Continuidade canônica inválida e divergente do histórico auditável

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** CURRENT_CONTINUITY.md, ROADMAP.md, CURRENT_STATE.md,
  EXECUTION_BOARD.md, DELIVERY_TARGET.md e a elegibilidade em
  ROUND_1_APPROVAL_CANDIDATE.md.
- **Regra/autoridade violada:** NB-0002 §4; contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT
  §§3, 12, 38 e BLOCKING continuity; governance/04_AUDIT_AND_REVIEW_POLICY
  §§14–15, 27, 30 e 46–48.
- **Evidência encontrada:** a fonte explicitamente canônica,
  CURRENT_CONTINUITY.md:9, manda rodar AUD-003 contra v0.4, mas as próprias
  condições de sucesso/falha e saída de AUD3-001 exigem AUD-004 (linhas 23, 30
  e 41). Ela não contém cause_ref; intent não o substitui. ROADMAP:54–58
  delega-lhe a ação atual e repete AUD-003. CURRENT_STATE:38,
  EXECUTION_BOARD:17 e DELIVERY_TARGET:43 também a apresentam como
  não-executada/próxima, contrariando AUD-003 e ACTIVITY_LOG:A-014 (AUD-003
  FAIL) e A-015 (AUD-004 para v0.4).
- **Cenário concreto de falha:** após restart, um orquestrador consulta a fonte
  canônica e reexecuta AUD-003 como se seu finding não existisse; outro usa a
  saída interna e submete AUD-004. Não há rota única auditável para
  FND-002/AUD3-001 nem evidence consistente para decisão humana.
- **Remediação exigida:** em nova baseline versionada, definir cause_ref para
  FND-002/AUD3-001, apontar a ação para AUD-004 e reconciliar as
  projeções/evidências ainda presas a AUD-003. Preservar AUD-003 como histórico
  FAIL; não reexecutar sua instância. Reauditar a sucessora antes de aprovação.

## Teste final de prontidão

| Pergunta | Resposta |
|---|---|
| 1. AUD3-001 está RESOLVED? | YES |
| 2. DEC-005 preserva NB-0002? | YES |
| 3. DEC-005 preserva TB-140 sem mudança física? | YES |
| 4. Existe um único owner normativo determinável por WI? | YES |
| 5. WI de Module é revalidável deterministicamente após mudança de Module? | YES |
| 6. Alguma decisão material foi deixada ao implementador no mapping? | NO |
| 7. Os 13 findings antes resolvidos continuam resolvidos? | NO — 10 sim; AUD-004/AUD-005 parciais; AUD-010 aberto. |
| 8. Existe novo blocker? | YES — AUD4-001. |
| 9. PBL-PRJ001-R1-v0.4 é íntegra e reconstruível? | YES — 50/50 membros, hashes e tamanhos verificados. |
| 10. VI-001 está apta para submissão à decisão humana? | NO — continuidade/evidence canônica contraditória e inválida. |

## Totais e verdict

| Métrica | Total |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 0 |
| P3 | 0 |
| blocking findings | 1 |

FAIL

Este resultado não promove estado, não concede approval, não autoriza
implementação nem muda a Technology Baseline. A continuidade é remediar
AUD4-001 em baseline versionada e reauditar independentemente.
