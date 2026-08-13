---
document_type: phase-planning
status: PLANNING_COMPLETE_PENDING_IMPLEMENTATION_AUTHORIZATION
created_at: 2026-08-13
scope: conceptual planning of Phase 6 only; no runtime implementation authorization
primary_roadmap: 01_DELIVERY_ROADMAP.md
related_protocol: ../../ORCHESTRATION_PROTOCOL.md
related_compass: ../../LIFECYCLE_COMPASS.md
---

# Planejamento da Fase 6 — Agent Supervision & Assurance

## Origem e objetivo

Testes práticos da Fase 5 revelaram duas lacunas: agentes podem declarar uma
execução bem-sucedida deixando partes autorizadas incompletas, e bloqueios hoje
exigem que o operador encontre manualmente outro agente para investigá-los.

Esta fase prepara a capacidade nativa de supervisionar toda execução delegada:
verificar de forma independente a completude antes do aceite, conduzir rework e
assistir bloqueios com diagnóstico, alternativas, roteamento e escalonamento.
O princípio obrigatório é:

```text
EXECUTION_SUCCEEDED != WORK_ACCEPTED
SELF_CHECK != INDEPENDENT_REVIEW
```

Uma execução bem-sucedida somente prova que o produtor terminou a tentativa e
submeteu uma saída; não autoriza a orquestração a tratá-la como trabalho aceito.
Esta fase não implementa runtime, altera contratos certificados ou simula review
na Fase 5. A compatibilidade será desenhada de forma aditiva no detalhamento e
na implementação posteriores.

## Micro-lifecycle universal

O lifecycle macro de projeto e módulo continua inalterado. Não haverá uma fase
macro artificial de auditoria entre análise, definição, arquitetura, planning,
implementação, validação ou entrega. Em vez disso, cada trabalho delegado terá
o seguinte micro-lifecycle conceitual:

```text
DISPATCH → PRODUCE → OUTPUT_SUBMITTED → INDEPENDENT_REVIEW → ACCEPTED
                                      └→ FINDINGS → REWORK_REQUIRED → PRODUCE

DISPATCH → PRODUCE → BLOCK → ASSIST / ROUTE / ESCALATE → novo dispatch ou resolução
```

Somente `ACCEPTED` encerra o trabalho delegado para a orquestração. `OUTPUT_SUBMITTED`
e `execution success` são estados/fatos distintos de aceite. A futura modelagem
deverá preservar `EVIDENCE_REVIEW`, gates e estados já publicados: validação de
evidência, review de completude, review especializado, aceite técnico e decisão
de gate são controles diferentes e não devem ser colapsados.

## Independent Work Assurance

Todo review é independente do produtor. O reviewer recebe, no mínimo, o
despacho original, atividade autorizada, `input_artifacts`, `expected_outputs`,
`required_evidence`, `completion_criteria`, artefatos/evidências produzidos,
decisões registradas e a saída declarada pelo produtor. Seu objetivo adversarial
é identificar o que foi omitido, entregue parcialmente, contradiz entradas ou
requisitos, não tem evidência suficiente, ou introduz decisão não autorizada ou
não registrada.

Atividades delegáveis poderão ter modos conceituais `PRODUCE` e `REVIEW`. A
preferência é reutilizar o papel especialista existente em execução separada,
contexto de revisão e, quando possível, permissões read-only; por exemplo,
`solution-architecture/REVIEW` para uma produção de arquitetura. O desenho
final deve respeitar separação de responsabilidades e pode selecionar outro
reviewer quando a independência ou especialidade o exigir. Self-check do
produtor é útil, mas nunca substitui esse review.

## Findings, rework e limites

Findings serão entidades rastreáveis, não texto perdido na resposta de LLM. O
modelo físico será definido depois, mas deve correlacionar origem, execução e
dispatch, projeto/módulo/work item, categoria, severidade, descrição,
requisito/critério, evidência, lacuna/inconsistência, ação de rework, status,
resolução e evidência da resolução.

O dispatch de rework é delimitado pelos findings e continua sujeito a execution
context, autoridade, `target_path`, ferramentas permitidas, evidências e gates.
O produtor não pode autoatestar uma correção: todo rework retorna a review
independente. A política futura será configurável e registrará contador de
rework, findings recorrentes, problema repetido e ausência de progresso; ao
atingir os critérios definidos, escala em vez de permitir ciclos infinitos.
Não se fixa nesta fase um número universal de tentativas.

## Block management e assistência

`BLOCK` será conceito explícito, distinto de `FAILED` e de texto livre. O
registro conceitual conterá `block_id`, `execution_id`, `dispatch_id`, alvo
(projeto/módulo/work item), categoria, sintomas, evidências, tentativas,
causas suspeitas, severidade, responsável, status, resolução escolhida e sua
evidência. Categorias iniciais incluem `TECHNICAL`, `REQUIREMENT_AMBIGUITY`,
`ARCHITECTURE_CONFLICT`, `DEPENDENCY`, `ENVIRONMENT`, `EXTERNAL_SERVICE`,
`TEST_FAILURE`, `SECURITY`, `POLICY` e `MISSING_INFORMATION`.

O lifecycle conceitual é `OPEN → DIAGNOSING → SOLUTION_PROPOSED →
RESOLUTION_SELECTED → RESOLVING → RESOLVED`, com caminhos para `ESCALATED`,
`PAUSED` e `CANCELLED`, conciliados na implementação com estados normativos já
existentes. A assistência analisa evidências e tentativas, propõe alternativas
com impactos/trade-offs e confiança quando aplicável, recomenda uma opção e
indica especialista ou decisão humana. Não pode mudar silenciosamente requisito,
arquitetura, política ou decisão reservada à autoridade humana.

## Routing e responsabilidades

O orquestrador controla lifecycle, routing, política de retry/rework, loop
detection, escalonamento e retorno ao fluxo normal. `governance-assurance`
verifica processo, autoridade, rastreabilidade e gates; não escolhe solução
técnica. Reviewer de domínio/especialista avalia completude e correção na sua
especialidade. Advisory diagnostica e propõe opções. QA continua responsável
por qualidade, comportamento, testes e aceitação conforme seu papel.

Assim, assurance de completude não substitui QA, `governance-assurance`,
`security-assurance` ou gates humanos. Exemplos de routing: ambiguidade para
`requirements-engineering`, conflito arquitetural para `solution-architecture`,
integração para `integration-engineering`, segurança para `security-assurance`
e problema operacional para o papel operacional aplicável. A necessidade de um
agente oficial `engineering-advisor` fica aberta: primeiro será avaliado se uma
capability/task type satisfaz a responsabilidade sem aumentar a taxonomia.

## Aceite, autoridade e evolução

Review automático pode aceitar tecnicamente uma saída, pedir rework, registrar
findings, assistir block e recomendar ou rotear resolução. Não substitui nem
enfraquece gate humano: decisões humanas continuam humanas. A modelagem futura
deve prever `output submitted`, `review pending`, `rework required`, `accepted`
e `escalated`, com migração compatível e sem quebra desnecessária dos contratos
atuais.

Fundamentos rastreáveis permitirão evolução posterior para análise de padrões e
histórico de blocks, taxas de completude por agente/runtime, tipos de demanda
incompletos, seleção inteligente de reviewer, antecipação de riscos e
supervisão global. Essas capacidades não são escopo de implementação desta fase.

## Critérios de pronto do planejamento

- O roadmap contém Fase 6 nova, Fase 7 (entrega anterior) e Fase 8 (operação anterior), sem perda de escopo.
- O micro-lifecycle e a distinção entre sucesso de execução e aceite de trabalho estão documentados.
- Findings, rework, loop detection, blocks, assistência, routing e escalonamento estão planejados como entidades/processos rastreáveis.
- Ownership entre orquestrador, governance, especialista, advisory, QA e humano está delimitado.
- A documentação declara explicitamente que não há implementação antecipada nem alteração de comportamento da Fase 5.

## Questões para o detalhamento/implementação da Fase 6

1. Schema físico, retenção, índices, APIs e projeções web de acceptance, findings e blocks.
2. Mapeamento exato dos novos fatos aos estados e contratos atuais, incluindo migração e compatibilidade.
3. Política configurável de limites, severidade, ausência de progresso e condições de escalonamento.
4. Algoritmo de seleção de reviewer, garantia operacional de independência e permissões read-only.
5. Matriz de routing, ownership de resolução e decisão sobre `engineering-advisor` como agente ou capability.
6. Critérios de teste, telemetria, auditoria e experiências de operador para os novos ciclos.
