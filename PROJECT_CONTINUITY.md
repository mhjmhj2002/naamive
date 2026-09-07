# NAAMIVE — Project Continuity

**Status:** LIVING PROJECT DOCUMENT  
**Natureza:** documento operacional e de continuidade; não normativo  
**Local recomendado:** raiz do repositório  
**Arquivo:** `PROJECT_CONTINUITY.md`  
**Última atualização:** 2026-09-07  
**Branch ativa:** `lifecycle-reboot`  
**Último commit validado:** `36dafaf4f62f3b7a6e017696444fb547ce9aed90`  
**Normative Baseline vigente:** `NB-0001`

---

## 1. Propósito

Este documento existe para responder rapidamente:

```text
onde o projeto está?
o que já foi concluído?
qual é a lei vigente?
qual é a próxima etapa?
o que não pode ser perdido?
como continuar o trabalho sem reconstruir contexto do zero?
```

Ele deve permitir que uma pessoa ou um novo agente entre no projeto, leia este
arquivo e saiba qual é o estado operacional atual do NAAMIVE.

Este documento é deliberadamente **vivo**.

Ele deve ser atualizado sempre que houver mudança material de fase, baseline,
branch, arquitetura aprovada, milestone concluído, bloqueio relevante ou próxima
ação principal.

Ele **não é normativo**.

Quando houver divergência entre este arquivo e uma Normative Baseline vigente,
a Normative Baseline prevalece.

---

## 2. Resumo executivo atual

O NAAMIVE concluiu a primeira grande rodada documental do lifecycle reboot.

Essa rodada definiu principalmente:

- propósito e domínio;
- lifecycles;
- regras de transição;
- authority;
- gates;
- findings, risk e exception;
- evidence e audit;
- canonical state;
- persistence e projections em nível normativo;
- handoffs;
- continuity;
- recovery e reconciliation;
- orchestration;
- segurança;
- API;
- UI;
- observability;
- readiness para implementação;
- política de uso do legado.

O corpus foi auditado, corrigido, ratificado e congelado como:

```text
NB-0001
```

A documentação normativa da primeira rodada está encerrada.

O projeto agora entra na **segunda rodada documental**, voltada a responder:

```text
COMO implementar tecnicamente a necessidade e a lei já definidas?
```

Nenhum código novo do reboot deve ser iniciado antes da aprovação da Technology
Baseline aplicável.

---

## 3. Visão do produto

NAAMIVE existe para:

```text
Transforming Business Needs into Delivered Software
```

A necessidade de negócio vem primeiro.

O software é consequência.

O objetivo é transformar uma necessidade real em valor entregue, de forma
governada, verificável, auditável, recuperável e capaz de evoluir.

Lifecycle conceitual principal:

```text
Platform
  ↓
Need
  ↓
Project
  ↓
Business Modules
  ↓
Applications / Work
  ↓
Validation
  ↓
Delivery
  ↓
Evolution
```

---

## 4. Fontes que devem ser lidas primeiro

Para continuar o projeto, usar esta ordem:

```text
README.md
PROJECT_CONTINUITY.md
AGENTS.md
00_NAAMIVE_CONSTITUTION.md
governance/normative-baselines/NB-0001.md
lifecycle/diagrams/00_LIFECYCLE_VISUAL_GUIDE.md
documentação normativa específica da task
```

### Papel de cada entrada

`README.md`
: porta de entrada e mapa humano.

`PROJECT_CONTINUITY.md`
: estado vivo do projeto, sequência e handoff entre sessões.

`AGENTS.md`
: regras operacionais para agentes.

`NB-0001`
: baseline normativa vigente e imutável.

`lifecycle/diagrams/`
: leitura visual derivada, não normativa.

---

## 5. Estado normativo

### Baseline vigente

```text
Normative Baseline: NB-0001
Status: IN FORCE
Membership: 43 documentos normativos
Ratificação: humana
```

Certificado:

```text
governance/normative-baselines/NB-0001.md
```

### Regra de freeze

`NB-0001` é imutável.

Não editar silenciosamente um membro ratificado e continuar chamando o resultado
de `NB-0001`.

Qualquer mudança normativa futura exige nova baseline, por exemplo:

```text
NB-0001
   ↓
NB-0002
```

---

## 6. Último checkpoint validado

Último commit validado:

```text
36dafaf4f62f3b7a6e017696444fb547ce9aed90
docs(governance): ratify normative baseline NB-0001
```

Resultado do fechamento:

```text
43 membros normativos........ RATIFIED / IN FORCE
NB-0001 certificate.......... PASS
AUD-005...................... PASS
Membership................... 43 / 43
SHA-256...................... 43 / 43
Regressão normativa.......... NONE
Freeze....................... CONFIRMED
```

---

## 7. O que foi concluído

### Lifecycle reboot

A documentação anterior foi preservada e o projeto foi reiniciado a partir de
um modelo novo de lifecycle.

Principais problemas históricos que motivaram o reboot:

- múltiplas fontes de verdade;
- ausência de fonte normativa soberana;
- estados contraditórios;
- lifecycle incompleto;
- recovery antes da definição da lei;
- handoffs não atômicos;
- pause/cancel sem fencing suficiente;
- falta de aggregation rules;
- estados sem continuidade;
- retry incorreto;
- risco de ressuscitar execução terminal;
- UI, timeline e runtime misturados com regra normativa;
- dificuldade de explicar o sistema de ponta a ponta.

### Auditorias

```text
AUD-003
→ findings
→ reforma
→ AUD-004
→ correções menores
→ AUD-005 PASS
→ ratificação
→ NB-0001
```

### Entrada humana e de agentes

Criados:

```text
README.md
AGENTS.md
lifecycle/diagrams/00_LIFECYCLE_VISUAL_GUIDE.md
```

---

## 8. Legado

O legado pré-reboot permanece preservado em:

```text
naamive/backup/
```

Regra:

```text
legacy can teach
legacy cannot govern
```

O legado pode ser usado como evidência histórica, referência técnica ou fonte de
aprendizado.

Ele não deve ser restaurado como lei, contrato ou requisito de compatibilidade
por padrão.

O backup não deve ser apagado até que a nova implementação esteja consolidada e
a preservação histórica deixe de ser necessária por decisão explícita.

---

## 9. Fase atual

### Fase

```text
SECOND DOCUMENTATION ROUND
TECHNICAL IMPLEMENTATION DESIGN
```

Pergunta central:

```text
como transformar a NB-0001 em uma implementação concreta?
```

Ainda não estamos na fase de escrever a primeira fatia real de código.

Primeiro precisamos fechar e aprovar a **Technology Baseline**.

---

## 10. Próximo milestone principal

### Technology Baseline

Objetivo:

definir e aprovar as decisões técnicas estruturais necessárias para implementar
a `NB-0001`.

A segunda rodada não deve redesenhar a lei do produto.

Ela deve derivar tecnicamente da lei já vigente.

A Technology Baseline deverá deixar claro, entre outros pontos:

- linguagem e versões;
- runtime;
- framework;
- banco de dados;
- estratégia de migrations;
- estrutura do repositório;
- boundaries técnicos;
- persistência;
- transaction model;
- locking e fencing;
- events / jobs / queues, se aplicáveis;
- API;
- autenticação e autorização;
- secrets;
- observability;
- testing;
- ambientes;
- deploy;
- recovery operacional;
- critérios técnicos de readiness.

As decisões ainda não tomadas não devem ser preenchidas por suposição neste
documento.

---

## 11. Roadmap técnico da segunda rodada

A sequência abaixo define o caminho de trabalho, não decisões técnicas já
aprovadas.

```text
T1 — Technology Baseline
        ↓
T2 — Estrutura concreta da solução
        ↓
T3 — Modelo físico de dados e persistência
        ↓
T4 — Runtime, transações, idempotência e fencing
        ↓
T5 — API, identity e trust boundaries
        ↓
T6 — Orchestration, execution, recovery e reconciliation
        ↓
T7 — UI / action surfaces / explainability
        ↓
T8 — Observability e forensics
        ↓
T9 — Test strategy, environments e deployment
        ↓
T10 — Technical Implementation Readiness
        ↓
FIRST VERTICAL SLICE
```

A ordem pode ser refinada durante a rodada técnica, mas mudanças materiais devem
ser registradas aqui.

---

## 12. Primeira fatia de implementação planejada

Depois da Technology Baseline e do readiness técnico:

```text
Need
```

será a primeira vertical slice.

Sequência conceitual esperada:

```text
state
  ↓
persistence
  ↓
transition
  ↓
authority
  ↓
projection
  ↓
API
  ↓
UI / agent action
  ↓
tests
  ↓
observability
  ↓
recovery
```

O objetivo é provar um fluxo vertical governado antes de expandir
horizontalmente para todas as entidades.

---

## 13. Princípios que não podem se perder na implementação

```text
one canonical truth
immutable history
projections are not truth
terminal means terminal
FAILED Execution is never resurrected
retry/recovery creates causal successor
authority must be provable
handoffs must be durable
fail-closed must remain actionable
unknown external effect requires reconciliation
baseline changes require impact coverage
human authority cannot be silently replaced by an agent
```

Impact classification canônica:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

---

## 14. Lifecycles normativos principais

### Need

```text
CAPTURED
→ QUALIFYING
→ IN_DISCOVERY
→ READY_FOR_COMMITMENT
→ ACCEPTED
```

Estados alternativos:

```text
WAITING
REJECTED
CANCELLED
```

### Project

```text
CONCEPTION
→ ARCHITECTURE
→ PLANNING
→ IMPLEMENTATION
→ VALIDATION
→ DELIVERY
→ DELIVERED
```

Condições transversais:

```text
BLOCKED
PAUSED
```

Terminal alternativo:

```text
CANCELLED
```

### Module

```text
IDENTIFIED
→ DEFINED
→ PLANNED
→ IMPLEMENTING
→ VALIDATING
→ READY_FOR_INTEGRATION
→ INTEGRATED
```

### Work Item

```text
PROPOSED
→ READY
→ IN_PROGRESS
→ IN_REVIEW
→ DONE
```

### Execution

```text
CREATED
→ ELIGIBLE
→ RUNNING
→ SUCCEEDED
```

Terminais/autoridade revogada:

```text
FAILED
CANCELLED
STALE
EXPIRED
```

Consultar sempre os documentos normativos para transições completas, retornos,
gates e condições.

---

## 15. Regras operacionais para continuidade

### Um agente por task

Nova task material:

```text
novo agente
novo contexto operacional
```

Evitar acumular tarefas independentes no mesmo agente.

### Git

O operador humano controla:

```text
commit
push
merge
rebase
reset
clean
history
```

Agentes não devem publicar mudanças sem autorização explícita.

### Escopo

Não expandir task silenciosamente.

Finding fora do escopo deve ser registrado antes de ser corrigido, salvo
necessidade direta para preservar uma invariável da própria task.

---

## 16. O que NÃO fazer agora

Não:

- reabrir a rodada normativa da NB-0001 sem finding real;
- modificar a NB-0001 em place;
- restaurar o runtime legado;
- começar a programar por impulso antes da Technology Baseline;
- decidir stack técnica apenas porque ela já existia no legado;
- tratar diagrama como fonte normativa;
- duplicar regras normativas em documentação técnica de forma divergente.

A segunda rodada deve produzir **derivações implementáveis**, não uma nova versão
paralela da lei.

---

## 17. Atualização deste documento

Atualizar este arquivo quando ocorrer qualquer um destes eventos:

```text
novo milestone concluído
nova fase iniciada
Technology Baseline aprovada
branch principal de trabalho alterada
novo freeze técnico
bloqueio material descoberto
decisão técnica estrutural aprovada
primeira vertical slice iniciada
primeira vertical slice concluída
nova Normative Baseline criada
mudança relevante no plano de execução
```

Em cada atualização, no mínimo revisar:

```text
Última atualização
Branch ativa
Último commit validado
Normative Baseline vigente
Fase atual
Último checkpoint
Próximo milestone
Próxima ação concreta
Bloqueios
```

Não usar este documento como changelog infinito.

Manter o foco em:

```text
passado necessário
+
estado atual
+
próximo caminho
```

---

## 18. Status board

### DONE

```text
Legacy archive
Lifecycle reboot
Normative documentation
Global documentation audit
AUD-003 remediation
AUD-004 verification
Final pre-ratification check
README
AGENTS
Lifecycle visual guide
Human ratification
NB-0001
Normative freeze
```

### DOING

```text
Preparação da segunda rodada documental
```

### NEXT

```text
Technology Baseline
```

### LATER

```text
Technical Implementation Readiness
First Need vertical slice
Incremental implementation of remaining lifecycles
Delivery
Evolution
```

### BLOCKED

```text
NONE known at this checkpoint
```

---

## 19. Próxima ação concreta

```text
Iniciar T1 — Technology Baseline
```

A primeira conversa da segunda rodada deve definir:

```text
quais decisões técnicas precisam existir
antes que a primeira linha de código do reboot seja autorizada?
```

A resposta deve ser derivada de:

```text
NB-0001
+
Implementation Readiness
+
Technology Baseline Model
```

e não do legado por conveniência.

---

## 20. Handoff para um novo chat

Ao iniciar outro chat, fornecer este arquivo ou pedir acesso ao repositório e
usar uma instrução semelhante a:

```text
Estamos continuando o projeto NAAMIVE.

Leia primeiro:
1. PROJECT_CONTINUITY.md
2. README.md
3. AGENTS.md
4. governance/normative-baselines/NB-0001.md

Depois leia somente a documentação normativa necessária para a próxima task.

PROJECT_CONTINUITY.md representa o estado operacional vivo.
NB-0001 representa a lei normativa vigente.

Não recrie decisões já fechadas.
Não altere a NB-0001.
Continue a partir de "Próxima ação concreta".
```

Depois da leitura, o agente deve conseguir responder:

```text
qual é a fase atual?
qual foi o último checkpoint?
qual baseline governa o sistema?
o que já terminou?
qual é o próximo milestone?
qual é a próxima ação concreta?
```

Se não conseguir, deve investigar os documentos antes de executar trabalho.

---

## 21. Regra de continuidade do projeto

Este documento deve acompanhar o projeto até o fim.

Ele não precisa crescer indefinidamente.

Quando uma fase termina:

- resumir o que passou;
- registrar o checkpoint final;
- atualizar a fase atual;
- atualizar o próximo milestone;
- remover detalhe operacional que deixou de ser necessário;
- preservar decisões que sejam indispensáveis para retomada futura.

A intenção é que `PROJECT_CONTINUITY.md` continue sendo legível em poucos minutos,
mesmo depois de meses de projeto.

---

## 22. Estado atual em uma tela

```text
PROJECT............. NAAMIVE
BRANCH.............. lifecycle-reboot
NORMATIVE BASELINE.. NB-0001
NORMATIVE DOCS...... CLOSED / IN FORCE
LAST CHECKPOINT...... 36dafaf4f62f3b7a6e017696444fb547ce9aed90
CURRENT PHASE........ SECOND DOCUMENTATION ROUND
CURRENT GOAL......... TECHNICAL IMPLEMENTATION DESIGN
NEXT MILESTONE....... TECHNOLOGY BASELINE
CODE AUTHORIZED?..... NO — aguardando Technology Baseline / readiness
BLOCKERS............. NONE known
NEXT ACTION.......... iniciar T1 — Technology Baseline
```
