---
task: GAT-01
status: DONE
title: Catálogo server-side de gates e autoridade
depends_on: [LR-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-01 — Catálogo server-side de gates e autoridade

## Objetivo e problema corrigido

Publicar uma fonte server-side versionada que determine quais gates podem abrir,
sob quais condições, para qual autoridade e com quais decisões/consequências.
Corrige `MODULE_APPROVAL`, arquitetura e baseline universais, gates implícitos e
`WAITING_FOR_ESCALATION` sem contrato completo.

## Contexto, atual e esperado

Gates legítimos existem de forma dispersa e estados técnicos viraram aprovações.
O servidor deve preservar `REGISTER_PROJECT`, `PRODUCT_COMMITMENT`,
`MODULE_PLAN_APPROVAL` e aceite final; avaliar materialidade para arquitetura,
risco, segurança/compliance, independência e rework esgotado; impedir qualquer
gate não publicado.

## Trava de pré-validação do catálogo

Antes de criar ou alterar migration, catálogo, policy evaluator, contrato, API,
projeção, gate record, workflow transition ou regra de autoridade, produzir e
validar uma matriz completa de gates. Cada célula deve apontar para condição e
política normativa publicadas; condição ausente, indeterminada ou não derivável
não pode ser preenchida por conveniência de implementação.

| Gate | Tipo | Condição de abertura | Evidência exigida | Autoridade | Decisões permitidas | Consequência | Continuação |
| ---- | ---- | -------------------- | ----------------- | ---------- | ------------------- | ------------ | ----------- |
| `REGISTER_PROJECT` | humano normativo | condição normativa publicada | evidência normativa aplicável | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| `PRODUCT_COMMITMENT` | humano normativo | condição normativa publicada | evidência normativa aplicável | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| `MODULE_PLAN_APPROVAL` | humano normativo | condição normativa publicada | evidência normativa aplicável | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| aceite final de entrega | humano normativo | condição normativa publicada | evidência normativa aplicável | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| arquitetura material | condicional | materialidade publicada | evidência que prova a materialidade | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| risco residual/produção de alto risco | condicional | risco publicado | evidência que prova o risco | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| segurança/compliance quando aplicável | condicional | aplicabilidade publicada | evidência que prova a aplicabilidade | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| exceção de independência | condicional | exceção publicada | evidência que prova a exceção | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| rework esgotado/material | condicional | limite/materialidade publicados | evidência que prova limite ou materialidade | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |
| escalada humana aplicável | condicional | condição de escalada publicada | evidência que prova a escalada | papel/escopo publicado | decisões publicadas | efeito determinístico publicado | próximo estado publicado |

A validação da matriz é pré-requisito da implementação funcional e deve
confirmar que toda linha tem condição, evidência, autoridade, decisões,
consequência e continuação determinísticas. Se algum valor não puder ser
derivado da documentação normativa ou de política publicada, registrar
`DECISÃO ARQUITETURAL NECESSÁRIA` e parar antes de implementar o gate afetado.

## Distinção entre gate humano, estado e controle técnico

Não são gates humanos por si só: blocker externo, dependência técnica, erro
técnico, retry, restart, resume, rework automático, QA automática, review
independente, espera por reviewer, `OUTPUT_SUBMITTED`, `EVIDENCE_REVIEW`,
elegibilidade e integração técnica. Esses estados e controles só podem provocar
gate humano quando houver condição normativa explícita de materialidade, risco,
autoridade, exceção ou escalada; uma parada técnica não se transforma em
aprovação humana.

O happy path ordinário deve provar a ausência de gate humano quando não houver
condição material: arquitetura sem decisão material segue por revisão
independente; QA aprovada não abre gate; dependência técnica satisfeita não abre
gate; review `ACCEPT` continua automaticamente; e merge/integração técnica não
abre gate humano por padrão.

## Invariantes

- controles automatizados/review independente avançam sem humano quando passam;
- gate condicional só abre com condição/materialidade e evidência;
- cada gate informa motivo, espera, autoridade, decisões, efeitos e continuação;
- decisão é versionada, idempotente, auditável e validada no servidor;
- agente/advisory/governance não substitui autoridade humana.
- gate condicional só abre com condição publicada, evidência que a prove,
  autoridade definida, decisões possíveis definidas e consequência determinística;
- `needs_human=true`, strings livres de materialidade, estados aparentemente
  importantes e gates universais por conveniência histórica não são regra válida.

## Componentes prováveis

Gate policy evaluator, catálogos/contratos, `workflow_transitions`, gate records,
APIs/projeções, assurance routing e migrations aditivas.

## Dependências e restrições

Depende de LR-01. Autenticação é GAT-03; entrega/pausa/cancelamento é GAT-02.
Não remover gate legítimo nem preservar gate universal por conveniência histórica.

GAT-01 define catálogo e política dos gates: autoridade necessária, papel/escopo
que pode decidir, condições de autorização, contrato do gate, decisão válida e
efeitos permitidos. GAT-03 implementará identidade autenticada, autenticação,
RBAC, proteção contra spoofing e vínculo verificável entre usuário e papel.
Até GAT-03, manter o contrato de autoridade explícito e testável, sem inventar
mecanismo novo de autenticação nem tratar headers declarativos como segurança
definitiva.

GAT-01 pode publicar os contratos dos gates de entrega e aceite final, mas GAT-02
implementará o lifecycle funcional de entrega, aceite final, pausa, retomada e
cancelamento. Não antecipar nessa task a implementação funcional completa de
GAT-02.

Se `LIFECYCLE_COMPASS.md`, `PROJECT_LIFECYCLE.md`, `MODULE_LIFECYCLE.md`,
`ORCHESTRATION_PROTOCOL.md`, `STATE_MACHINE_MODEL.md`, `GATE_POLICY.md` ou o
planejamento aprovado da Fase 6.5 entrarem em conflito, não escolher
silenciosamente uma interpretação. Registrar os documentos em conflito, gate
afetado, condição, autoridade, impacto, alternativas e recomendação; parar antes
da alteração funcional correspondente e solicitar decisão humana.

## Estratégia de implementação e compatibilidade

Inventariar gates/consumidores; publicar catálogo/conditions; centralizar abertura
e decisão; desativar gates implícitos no workflow novo; preservar leitura de
decisões históricas com sua versão; exigir evidência de materialidade.

## Critérios de aceite

- apenas gates catalogados abrem;
- fluxo ordinário não abre `MODULE_APPROVAL` nem arquitetura humana universal;
- gates condicionais abrem somente quando a regra passa;
- `WAITING_FOR_ESCALATION` projeta contrato completo;
- decisão obsoleta/não autorizada não altera estado;
- todos os gates normativos possuem testes de presença e ausência.
- matriz de gates fechada e validada antes da implementação funcional;
- blocker, retry, rework automático, review independente e dependência técnica
  não são tratados como gates humanos;
- happy path prova ausência de gate quando não existe condição material;
- `WAITING_FOR_ESCALATION` possui contrato de saída completo;
- GAT-01 não implementa autenticação/RBAC da GAT-03;
- GAT-01 não antecipa o lifecycle funcional completo da GAT-02;
- nenhum gate condicional abre sem condição, evidência, autoridade e decisões
  publicadas, além de consequência determinística.

## Testes obrigatórios

Gates ordinários/condicionais, materialidade positiva/negativa, versão obsoleta,
autoridade incorreta, replay, concorrência, ausência de gate no happy path e
coexistência histórica.

Cada gate condicional deve testar tanto a abertura quando todos os requisitos da
matriz forem atendidos quanto a não abertura no caminho ordinário sem condição
material. Testar também que controles e estados técnicos não abrem gate humano
por si só, e que toda escalada legítima expõe saída operacional.

## Contrato de escalada

`WAITING_FOR_ESCALATION` não é apenas estado persistido. Toda escalada legítima
deve informar motivo, condição causadora, evidências, autoridade responsável,
decisões permitidas, consequência de cada decisão, próximo estado e
possibilidade de retry, rework ou resume quando aplicável. Nenhuma escalada pode
ficar sem saída operacional definida.

## Riscos e evidências esperadas

Riscos: remover controle material ou criar aprovação recorrente. Evidências:
catálogo/version/hash, matriz gate→condição→autoridade, decisões auditadas e E2E.

Riscos adicionais: gate humano criado por conveniência técnica; gate condicional
virar gate universal; blocker, retry ou review serem confundidos com gate;
GAT-01 absorver GAT-02 ou GAT-03; e autoridade declarada ser confundida com
identidade autenticada. Mitigar com matriz de pré-validação, testes de presença e
ausência, fronteiras explícitas e parada obrigatória diante de decisão
arquitetural não coberta.

## Evidências de implementação

- Matriz de pré-validação fechada em `GAT-01-gate-matrix.md`.
- Catálogo versionado, hash de publicação, snapshots de contrato, gate records e
  decisões auditáveis publicados pelas migrations `049` a `052`.
- Projeções e decisão server-side expõem somente decisões catalogadas; o ator
  ainda é declarativo até GAT-03.
- Testes unitários e PostgreSQL cobrem presença/ausência, condição/evidência,
  autoridade incorreta, versão obsoleta, replay, concorrência, imutabilidade e
  saídas operacionais de escalada.
