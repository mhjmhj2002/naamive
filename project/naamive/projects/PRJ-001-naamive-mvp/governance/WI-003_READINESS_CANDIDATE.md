# WI-003 — Preparação de Readiness R1

**status:** PREPARED / BLOCKED  
**work_item:** WI-003 — Username / Password Login  
**work_item_state:** PROPOSED  
**impact:** MATERIAL  
**governing_scope:** MODULE / MOD-001  
**value_increment_ref:** VI-001 — Authenticated Project Context  
**dependency:** WI-002 — DONE  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**preparation_input_commit:** 0b2cbcbadb1762310827bc3454ebbcb17582a7c0  
**author_principal:** agent:codex:readiness:WI-003:R1  
**nature:** non-normative readiness preparation; not audit, approval or authority  
**readiness_authority:** NOT GRANTED  
**development_cycle:** NOT CREATED  
**execution:** NONE  
**implementation:** NOT AUTHORIZED  
**prepared_at:** 2026-09-13T17:33:55-03:00

## 1. Conclusão e elegibilidade

```text
conclusão................... BLOCKED
pronto para auditoria........ NÃO
pronto para implementação.... NÃO
```

WI-002 está `DONE`, aceito por humano, e usa as mesmas baselines. O mapeamento
`WI-003 → VI-001 → MOD-001` e a âncora TB-140 são compatíveis; não há
classificação pendente de baseline. Logo, a dependência é satisfeita, mas não é
suficiente para readiness.

`DEC-008` fornece username current e a regra de que somente Principal `ACTIVE`
é elegível para sucesso. `security/01_IDENTITY_AND_ACCESS_MODEL.md` preserva a
separação `authentication != authorization`: login não cria grant nem torna o
cliente autoridade.

## 2. Traceabilidade

| Critério de WI-003 | Fonte e regra | Evidência de implementação | Situação |
|---|---|---|---|
| Argon2id | TB-84/TB-85; TIR-017: Argon2id, 64 MiB, 3 iterações, paralelismo 1, salt 16 bytes, hash 32 bytes; armazenamento simples/reversível proibido | testes de parâmetros/verificação, teste de logs e diff limitado | bloqueado por FND-001 |
| Erro genérico | TB-92 e TIR-018; `DEC-008`: somente `ACTIVE` tem sucesso | integração comparando username inexistente, senha inválida e `SUSPENDED`, sem segredo | bloqueado por FND-002/FND-004 |
| Rate limit/atraso | TB-92; TIR-018: 5 falhas username+IP/15 min, 25 IP/15 min, atraso após terceira; `api/03` tem `RATE_LIMITED` | testes de janelas, contadores, atraso, reset, concorrência e restart | bloqueado por FND-003 |
| `POST /api/session/login` tipado/validado | WI-003; `readiness/03_FIRST_VERTICAL_SLICE_PLAN.md`; API Model §§3, 10–11 | contrato request/response, validação e integração | bloqueado por FND-002 |
| Credencial válida/inválida | WI-003, TIR-017 e `DEC-008` (lookup current / `ACTIVE`) | unit/application tests de lookup/verificação e integração | bloqueado por FND-001 |
| Sem segredo exposto | `security/02` §§8, 10, 14; TB-94; TB-92 | testes negativos de request, resposta e logs | coberto, condicionado aos blockers |
| Fronteira de sessão | `security/01` §§2–9; TB-86/TB-139; TIR-014..016; WI-003 exclui sessão durável e WI-004 a implementa | prova de não criar token/sessão/grant fora de WI-003 e contrato de sucesso | bloqueado por FND-004 |

`VALIDATION_PLAN.md` associa resposta genérica e rate limiting a WI-003. A
`WORK_ITEM_ASSURANCE_MATRIX.md` exige sucesso de credencial pelo endpoint tipado
e provas próprias; WI-012 não substitui essa evidence.

## 3. Findings materiais bloqueadores

### FND-WI003-RCP-001 — Credencial e vínculo com Principal

Não há contrato governado para a credencial: associação a `principal_id`, hash
versionado, criação/provisionamento, alteração/reset/revogação e rehash de
TIR-017. Sem isso não existe fonte objetiva de credencial válida nem lifecycle
contra o qual verificar login. É necessária decisão material do Project Owner no
contexto MOD-001, registrada em artefato governado de `decisions/`, que preserve
a distinção entre credencial, username, Principal, sessão e grant.

### FND-WI003-RCP-002 — Contrato HTTP e resultado de autenticação

A rota existe, mas faltam DTO de request, limites de validação, response,
status/códigos de erro e resultado de sucesso. "Tipado e validado" não oferece
oracle objetivo para integração, validação ou erro genérico. É necessária decisão
material de API pelo Project Owner no contexto MOD-001, em `decisions/`, que
separe falha de validação de falha de autenticação sem expor segredo ou a
existência da conta.

### FND-WI003-RCP-003 — Semântica verificável do controle de abuso

TIR-018 fixa limiares e janela, mas não função, unidade ou teto do atraso; nem
retenção/reset, comportamento após sucesso, concorrência/restart, escopo para
username inexistente ou fonte confiável do IP. Portanto, os testes não podem
determinar PASS/FAIL de "progressive delay behave as specified" e o controle
pode divergir entre instâncias. É necessária decisão material de segurança/API
pelo Project Owner no contexto MOD-001, em `decisions/`, que fixe essas regras e
respeite a proibição de lock global/permanente de TIR-018.

### FND-WI003-RCP-004 — Fronteira com a sessão de WI-004

WI-003 exclui sessão durável e WI-004 a implementa, mas não define o efeito de
sucesso de login nessa fronteira. Criar cookie/token/sessão anteciparia WI-004;
não definir resultado deixa endpoint e evidence indeterminados. É necessária
decisão material de arquitetura/API pelo Project Owner no contexto MOD-001, em
`decisions/`, que defina o resultado de WI-003 e o handoff para WI-004 sem
antecipar token reutilizável, sessão durável, grant ou autoridade.

## 4. Limites e evidence futura

O erro genérico é a proteção normativa explícita contra enumeração por conteúdo;
não foi inventada obrigação independente de equalização temporal. Username
inexistente, senha inválida e `SUSPENDED` devem ter a mesma falha externa. Names
físicos, bibliotecas e layout permanecem detalhes de implementação posteriores.

Depois de resolver os findings e repetir a preparação, a implementação deverá
produzir testes unitários/aplicação de lookup, `ACTIVE`, Argon2id e rate limit;
contrato e integração de login; testes negativos de enumeração por conteúdo e
vazamento em logs; provas determinísticas do controle de abuso; diff limitado;
e auditoria independente proporcional. WI-003 é `MATERIAL` e não há cobertura
upstream reutilizável exata.

## 5. Continuidade

```text
WI-003...................... PROPOSED
readiness authority.......... NOT GRANTED
independent readiness audit.. REQUIRED / NOT EXECUTED
Development Cycle............ NOT CREATED
Execution.................... NONE
implementation............... NOT AUTHORIZED
```

A próxima ação é decisão material do Project Owner que resolva
`FND-WI003-RCP-001..004`, seguida de nova preparação de readiness. Esta
preparação não abre auditoria, não promove WI-003 e não inicia implementação.
