# AUD-WI003-01 — Auditoria independente de readiness — WI-003

**audit_id:** AUD-WI003-01
**audit_type:** INDEPENDENT READINESS AUDIT
**object:** WI-003 — Username / Password Login
**object_state:** PROPOSED
**impact:** MATERIAL
**scope:** MOD-001 / VI-001
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**Technology Baseline / TIR:** v0.10 — APPROVED / FROZEN / v1.0 — APPROVED
**audit_input_commit:** 5a2c33e66b03003cf0a8eeede5e9e9028e93e65f
**auditor_principal:** agent:codex:audit:AUD-WI003-01
**independence:** principal lógico distinto dos responsáveis pela preparação R2, pela preparação/materialização de DEC-009 e pela futura implementação de WI-003
**audit_authority:** designação humana desta task, limitada à produção desta evidência
**governing_decisions:** DEC-008_WI002_PRINCIPAL_SEMANTICS.md; DEC-009_AUTHENTICATION_CONTRACT.md
**readiness_candidate:** WI-003_READINESS_CANDIDATE_R2.md
**result:** PASS WITH NON-BLOCKING FINDINGS
**blocking_findings:** 0
**nonblocking_findings:** 1
**audited_at:** 2026-09-13T19:27:20-03:00

## Objeto, escopo e efeito

Esta auditoria verifica se há evidência suficiente para submeter a futura
transição `WI-003: PROPOSED → READY` ao respectivo readiness gate. O seu objeto
é somente a prova de credenciais humanas por `POST /api/session/login`.

Permanecem fora de escopo a Durable Server-side Session de WI-004, cookies,
tokens reutilizáveis, Grants, authorization, listagem/seleção de Project e
AppShell. A auditoria não aprova gate, não concede authority, não cria
Development Cycle ou Execution, não promove lifecycle e não autoriza
implementação.

## Independência e evidências examinadas

O auditor atua nesta task como `agent:codex:audit:AUD-WI003-01`, distinto dos
principals lógicos declarados para a preparação R2 e para a preparação e
materialização da DEC-009. Não é o futuro principal de implementação. A
independência é declarada por principal lógico e task; não há atestação
criptográfica de identidade de agente disponível.

Foram examinados, no snapshot de entrada: `AGENTS.md`; WI-003; WI-002;
`WI-003_READINESS_CANDIDATE_R2.md`; DEC-008; DEC-009 e as seções 3–6 da sua
candidata incorporada por referência; Work Item Lifecycle §§4–7; Gate Policy
§§17–24 e 30; Audit and Review Policy §§4–6, 11–18, 23, 27–30, 36–38 e 42;
Authority Policy §§2–9 e 15; `security/02_SECRETS_AND_TRUST_BOUNDARY_MODEL.md`;
`api/03_ERROR_IDEMPOTENCY_AND_CONCURRENCY_MODEL.md`; TB-84–86, TB-92 e TB-139;
e TIR-014–018. Também foram conferidos a projeção de VI-001 e a integridade
de membresia declarada da PBL para WI-003.

## Avaliação por critério

| Critério | Resultado | Evidência e conclusão independente |
|---|---|---|
| Resultado, owner e fronteira de escopo | CONFORME | WI-003 tem resultado finito: provar username/password sem converter o client/login em authority. WI-004 continua dona exclusiva de sessão durável; Grants, authorization, Project selection e AppShell não são introduzidos. |
| Dependência | CONFORME | WI-002 está `DONE`, com `principal_id` UUID estável, username current e somente `ACTIVE` elegível, todos sob as mesmas PBL/NB. DEC-009 usa exatamente essas semânticas. |
| Credential | CONFORME | DEC-009 §3 fixa Credential corrente por `principal_id`, Argon2id TIR-017, versão/formato, salt/hash, revogação, provisionamento, alteração, reset e rehash atômicos. Ausência, revogação, `SUSPENDED` e senha inválida não podem ter sucesso. Segredos não são retornados, logados nem expostos. |
| HTTP login | CONFORME | DEC-009 §4 fixa JSON exclusivo, regex de username, password string de 1–1024 bytes UTF-8, campos/tipos/JSON inválidos e os oráculos `400 VALIDATION_ERROR`, `401 AUTHENTICATION_FAILED`, `429 RATE_LIMITED` e `204` vazio. As causas de autenticação têm a mesma resposta pública; o sucesso não produz cookie, token, Grant ou capability. |
| Controle de abuso | CONFORME | DEC-009 §5 fixa dois sinais, janela de 15 minutos, limiares 5/25, precedência de `429`, fórmula e teto de atraso, `Retry-After`, reset apenas de username+IP, retenção, PostgreSQL atômico, ordem de chaves, concorrência, restart e derivação de IP por proxy confiável. Não resta semântica material a inventar para janela, corrida ou header encaminhado. |
| Fronteira WI-003 → WI-004 | CONFORME | `AuthenticatedPrincipal` é interno, efêmero, não serializável e termina com a invocação. Somente WI-004 poderá persistir sessão, emitir `Set-Cookie` ou token opaco; WI-003 isolada responde `204` sem portador reutilizável. |
| Evidência futura | CONFORME | WI-003/R2 exigem testes unitários, application, API/integração, antienumeração, redaction em logs/respostas, rate limit/atraso, concorrência, restart e boundary. Esses critérios permitem oráculos PASS/FAIL sem decidir produto, segurança, API ou authority adicional. |
| Findings RCP-001..004 | CONFORME | A DEC-009 aprovada incorpora por referência exata §§3–6 da candidata no snapshot `4cb0898…`; seu SHA-256 conferido é o `5f4992…` registrado pela decisão. A cópia atual apenas acrescenta registro histórico depois da seção 8, sem alterar o pacote aprovado. As regras incorporadas foram confrontadas com DEC-008, TB/TIR e os contracts aplicáveis. |
| Gate, authority e continuidade | CONFORME | A WI permanece `PROPOSED`; a audit satisfaz somente a evidência independente exigida a uma WI MATERIAL. O gate ainda precisa verificar authority válida no instante decisório e produzir transição recuperável. |

## Findings

### FND-AUD-WI003-01-001 — membro atual de WI-003 diverge do manifesto fechado da PBL v1.0

**classificação:** NON-BLOCKING
**impacto:** a decisão de readiness não pode usar a PBL sem classificar esta
divergência no momento do gate.

O `project/naamive/MANIFEST.md` registra para WI-003 o digest
`f53e8928a87bae2942acdffa730b7825853cf832bcd31027560c5208bca011a7`, enquanto
o arquivo auditado no snapshot possui
`328977a761855f0468f5176ec7296d57c9baeef49dcfcb59a470c7ac36a15fc4`.
O diff posterior ao baseline registra correção de wording de evidência e a
projeção operacional que aponta para DEC-009/R2; ele não altera Outcome, fora
de escopo, critérios de aceite, dependência ou contrato material que esta
auditoria verificou. Por isso não há blocker de definição da WI, mas o gate
deve registrar a classificação aplicável da evidência/baseline (por exemplo,
`KEEP` ou `REVALIDATE`) antes de aprovação, conforme Gate Policy §§17–18 e
Audit and Review Policy §§14–17. Esta auditoria não reclassifica a baseline.

Não foram identificados findings bloqueadores nem outros findings novos.

## Limitações

- Auditoria documental de readiness: não foram executados código, migrations,
  PostgreSQL, build ou testes; tais outputs são evidence futura de implementação.
- Não houve reauditoria da PBL, NB-0002, Technology Baseline ou TIR como
  objetos autônomos; foram lidos somente os requisitos citados pela WI/R2.
- O timestamp vem do relógio local e a independência não possui atestação
  criptográfica.

## Resultado e continuidade

```text
AUDIT RESULT........... PASS WITH NON-BLOCKING FINDINGS
WI-003................. remains PROPOSED
blocking findings...... 0
readiness authority.... NOT GRANTED
Development Cycle...... NOT CREATED
Execution.............. NONE
Implementation......... NOT AUTHORIZED
next legal action....... READINESS GATE / AUTHORITY for PROPOSED → READY,
                         including baseline-evidence classification for
                         FND-AUD-WI003-01-001
```

Há evidência suficiente para a autoridade competente decidir o readiness gate,
desde que trate o finding não bloqueante de integridade/membresia de baseline.
Este resultado é evidence apenas e não exerce a decisão, authority ou
transição.
