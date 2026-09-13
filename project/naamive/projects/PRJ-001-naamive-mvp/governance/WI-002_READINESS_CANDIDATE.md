# WI-002 — Candidato de Readiness

**status:** NEEDS MATERIAL DECISION  
**work_item:** WI-002 — Principal Persistence  
**work_item_state:** PROPOSED  
**impact:** MATERIAL  
**governing_scope:** MODULE  
**normative_owner:** MOD-001 — Project Context  
**value_increment_ref:** VI-001 — Authenticated Project Context  
**dependency:** WI-001 — DONE  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**preparation_input_commit:** 88b7c0001053175b5427497322a3728131bdb3bd  
**author_principal:** agent:codex:readiness:WI-002  
**nature:** non-normative readiness preparation; not audit, approval or authority  
**readiness_authority:** NOT GRANTED  
**development_cycle:** NOT CREATED  
**execution:** NONE  
**implementation:** NOT AUTHORIZED  
**prepared_at:** 2026-09-13T09:54:24-03:00

---

## 1. Escopo e pergunta central

Esta preparação avalia somente se \`WI-002\`, ainda \`PROPOSED\`, está definida de
forma suficiente, consistente, dependência-satisfeita e compatível com a
baseline para ser submetida a uma auditoria independente de readiness para a
futura transição \`PROPOSED → READY\`.

Ela não é auditoria, não decide gate, não concede authority, não cria
Development Cycle ou Execution e não autoriza implementação.

\`\`\`text
pergunta central: WI-002 está suficientemente definida para auditoria
                  independente de readiness?
conclusão:        NOT READY FOR INDEPENDENT READINESS AUDIT
\`\`\`

## 2. Prova da dependência WI-001

| Verificação requerida | Prova | Resultado |
|---|---|---|
| WI-001 | \`WI-001-workspace-foundation.md\`; \`CURRENT_STATE.md\` | DONE |
| Business Baseline | WI-001 e \`governance/HUMAN_APPROVAL_WI001_ACCEPTANCE.md\` | \`PBL-PRJ001-R1-v1.0\` |
| Normative Baseline | WI-001 e decisão de aceite | \`NB-0002\` |
| Aceite | \`governance/HUMAN_APPROVAL_WI001_ACCEPTANCE.md\` | GRANTED / EXERCISED |
| Findings bloqueadores | decisão de aceite e estado corrente | 0 |

A decisão de aceite de WI-001 identifica \`EX-003\` como Execution autoritativa,
\`CR-WI001-03\` e \`AUD-WI001-ACCEPTANCE-01\` como \`PASS_WITH_FINDINGS\`, e declara
os dois findings documentais resolvidos no fechamento. Entre o
\`decision_input_commit\` da decisão (\`10ec0cef…\`) e este input commit existe
somente o commit de fechamento documental \`88b7c000…\`; ele não altera
Technology Baseline, TIR, apps, packages, migrations ou a evidência de
workspace/PostgreSQL. Portanto, a evidência de foundation/guardrails de WI-001
permanece válida para a condição declarada por WI-002.

## 3. Owner Module / Value Increment / TB-140

| Invariante | Prova | Resultado |
|---|---|---|
| WI-002 referencia VI-001 | \`WI-002-principal-persistence.md\` | conforme |
| VI-001 existe e pertence a MOD-001 | \`VALUE_INCREMENT.md\` | conforme |
| MOD-001 existe | \`MODULE.md\` | conforme |
| Estados ancestrais | \`CURRENT_STATE.md\`, \`MODULE.md\`, \`VALUE_INCREMENT.md\` | PRJ-001 PLANNING; MOD-001/VI-001 PLANNED |
| Baselines ancestrais | documentos acima | \`PBL-PRJ001-R1-v1.0\` / \`NB-0002\` |
| Cobertura pendente de baseline | estado corrente e DEC-005 | nenhuma indicada |

\`DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md\` confirma o mapeamento exclusivo:

\`\`\`text
WI-002 → value_increment_ref = VI-001
       → VI-001.module_id = MOD-001
       → normative owner = MODULE: MOD-001

physical TB-140 anchor = VALUE_INCREMENT
value_increment_id    = VI-001
project_id            = NULL
\`\`\`

Não há interpretação alternativa de owner. Esta preparação não introduz
\`work_item.module_id\` nem \`governing_scope_type = MODULE\`.

## 4. Objetivo, escopo e critérios de aceite

O resultado — persistir de forma restart-safe o principal humano e seu estado
mínimo de identidade — é finito. A separação de escopo também é clara:
credencial/login, ciclo de token de sessão e grants de Project continuam fora
de WI-002. Logo, autenticação, autorização, sessão, UI, seleção de Project,
provisionamento e políticas de senha não podem ser incorporados por esta Work
Item.

Os critérios existentes apontam corretamente para compatibilidade
authority/security, status explícito, histórico material e migrations reais em
PostgreSQL. Contudo, eles não definem a semântica necessária para avaliar de
forma determinística \`duplicate/invalid identity\`, \`status/currentness\` e
\`material history\`. Assim, são insuficientes para um implementador e para a
auditoria de readiness sem uma decisão material adicional.

## 5. Testes e evidências

As obrigações de teste e evidência são adequadas como direção e permanecem
obrigatórias: migration limpa, persistência de status/currentness/histórico,
falha determinística para identidade duplicada/inválida e preservação após
restart; output de migration em PostgreSQL 18.6, testes de constraint/integração,
evidência de restart e diff limitado a WI-002.

Também atendem ao mínimo da \`WORK_ITEM_ASSURANCE_MATRIX.md\`: migration limpa
criando estruturas/constraints de principal e output em PostgreSQL 18.6.
Elas não são ainda executáveis de modo verificável porque falta a regra que
define quais identidades são válidas/únicas, quais status existem e quais fatos
devem entrar em \`principal_history\`.

## 6. Envelope técnico aplicável

| Referência | Efeito aplicável |
|---|---|
| TB-139 | estado de segurança restart-safe em PostgreSQL; \`authority.principal\` e \`authority.principal_history\`; request protegido requer principal ativo |
| TB-138 / Implementation Foundation Contract §5 | comando material multímódulo usa uma transaction PostgreSQL; adapters escrevem apenas tabelas próprias |
| TB-116..TB-119 / TIR-011 / Foundation Contract §8 | migrations Kysely, forward-only, explícitas, sem execução no startup e com lock |
| TIR-002, TIR-040 e TIR-041 / TB-135 | PostgreSQL 18.6 real para integração e prova de constraints |
| TIR-008 | privacidade de módulo; frontend e outros módulos não acessam persistência interna |
| TB-132 | história governada necessária para auditabilidade não é removida por idade |

Essas referências congelam a estrutura conceitual e os limites técnicos, mas
não congelam a identidade única do principal, o conjunto/semântica de status,
ou os fatos e a regra de currentness de \`principal_history\`.

## 7. Finding bloqueador — FND-WI002-RCP-001

\`\`\`text
classificação........ MATERIAL / BLOCKING
critério afetado..... critérios de aceite; testes/evidências; decisões materiais
evidência............ WI-002 exige constraints para identidade duplicada/inválida,
                       status/currentness e história material; TB-139 só fixa
                       principal/principal_history conceituais e principal ativo
lacuna................ não existe decisão aprovada que determine:
                       1. identificador humano canônico, normalização e unicidade;
                       2. vocabulário/semântica e transições de status;
                       3. fatos, versionamento/currentness e retenção que tornam
                          uma mudança de principal material para principal_history
authority/owner....... decisão governada do contexto MOD-001, com autoridade
                       humana material aplicável do Project Owner
condição de saída..... decisão material explícita, compatível com
                       PBL-PRJ001-R1-v1.0 e NB-0002, que fixe essas semânticas e
                       atualize critérios/testes/evidências de WI-002 sem incluir
                       login, sessão ou grants; nova preparação de readiness
\`\`\`

Não é detalhe de implementação: escolher esses elementos localmente mudaria as
regras de identidade e de segurança que os testes devem provar. Nenhum outro
finding bloqueador foi identificado nesta preparação.

## 8. Detalhes não bloqueadores

Dentro da futura decisão material, são detalhes implementáveis e não devem ser
antecipados agora: formato de migration Kysely, nomes físicos compatíveis com as
convenções, índices necessários, forma exata das assertions de integração e
organização interna do adapter. Eles devem respeitar TB/TIR e não criar nova
semântica de domínio.

## 9. Authority e continuidade legítima

\`\`\`text
readiness authority........ NOT GRANTED
independent readiness audit REQUIRED / NOT EXECUTED
Development Cycle.......... NOT CREATED
Execution.................. NONE
Implementation............. NOT AUTHORIZED
\`\`\`

Próximo passo legítimo: encaminhar \`FND-WI002-RCP-001\` para decisão material
governada no contexto de MOD-001. Somente depois de a decisão fixar a semântica
ausente e de nova preparação concluir que não há blocker, WI-002 poderá seguir
para auditoria independente de readiness e eventual decisão de gate.

