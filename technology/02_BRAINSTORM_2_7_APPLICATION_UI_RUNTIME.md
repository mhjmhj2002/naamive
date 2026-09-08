# NAAMIVE — Technology Baseline Brainstorm 2.7
## Application Shell, UI Runtime and Real-Time Projection Consumption

**Status:** BRAINSTORM — PROPOSED FOR APPROVAL  
**Versão:** 0.1  
**Natureza:** desenho técnico derivado; não normativo  
**Deriva de:** `NB-0002`  
**Technology Baseline atual:** `technology/01_TECHNOLOGY_BASELINE.md` v0.6  
**Implementação:** NOT AUTHORIZED  
**Próximo passo após aprovação:** incorporar ao Technology Baseline e seguir para 2.8

---

## 1. Objetivo

Definir como o frontend React materializa a experiência humana ratificada em
`NB-0002` sem transformar o browser em fonte de verdade, autoridade, lifecycle
ou continuidade.

A UI deve responder de forma clara:

```text
onde estou?
qual Project está selecionado?
qual fase está ativa?
qual etapa funcional está acontecendo?
qual valor está sendo produzido?
qual Work Item está ativa?
qual Execution está rodando?
o executor está vivo?
houve progresso funcional?
existe blocker/finding/decisão?
o que posso fazer agora?
```

---

## 2. Princípios obrigatórios derivados de NB-0002

```text
UI renders canonical projections
UI does not invent lifecycle
backend decides authority
frontend presents allowed actions
heartbeat != functional progress
material error != ephemeral toast
reload must reconstruct journey
no fake percentage
stale command fails closed
semantic command != setStatus
```

A UI nunca persiste estado canônico como substituto do backend.

---

# 3. Estrutura principal da aplicação

## D2.7-01 — Login separado do AppShell

Manter a decisão existente:

```text
/login
  ↓
authenticated session
  ↓
AppShell
```

Tela de login não utiliza o shell autenticado.

---

## D2.7-02 — AppShell estável

Estrutura:

```text
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR                                                      │
├────────────────┬─────────────────────────────────────────────┤
│ PROJECT        │                                             │
│ SIDEBAR        │                CONTENT                      │
│                │                                             │
│                │                                             │
├────────────────┴─────────────────────────────────────────────┤
│ ACTIVITY CENTER — drawer/panel persistente quando aberto     │
└──────────────────────────────────────────────────────────────┘
```

O shell não é desmontado a cada navegação de conteúdo.

---

## D2.7-03 — Top Bar

Responsabilidade de plataforma:

```text
identidade da aplicação
contexto do usuário
busca global
atalhos de plataforma aplicáveis
acesso ao Activity Center
logout
```

Não colocar decisões de lifecycle na Top Bar por conveniência.

---

## D2.7-04 — Project Sidebar

O menu lateral mostra somente Projects que o backend projeta como visíveis ao
principal autenticado.

```text
principal
→ backend projection
→ authorized projects
→ sidebar
```

Regra:

```text
frontend filter != authorization
```

A lista deve suportar busca/filtro quando a quantidade justificar.

---

## D2.7-05 — Seleção explícita de Project

No MVP não existe Project implícito escondido.

Sem Project selecionado, a content area pode exibir estado neutro de seleção.

Deep link pode selecionar diretamente um Project autorizado.

---

# 4. Routing e deep links

## D2.7-06 — React Router

Mantém-se:

```text
React Router
```

Rotas conceituais:

```text
/login
/
/projects/:projectId
/projects/:projectId/activity
/projects/:projectId/modules
/projects/:projectId/modules/:moduleId
/projects/:projectId/value-increments/:valueIncrementId
/projects/:projectId/work-items/:workItemId
/projects/:projectId/executions/:executionId
/projects/:projectId/decisions
/projects/:projectId/timeline
```

A lista final pode ser refinada sem alterar a regra de deep-linkability.

---

## D2.7-07 — URL representa contexto navegável

Contextos que precisam sobreviver a refresh/share devem estar na URL quando
adequado.

Não usar memória React como única identidade de:

```text
Project selecionado
Module aberto
ValueIncrement aberta
Work Item aberta
Execution aberta
surface de decisão atual
```

---

# 5. Server state

## D2.7-08 — TanStack Query

Proposta:

```text
@tanstack/react-query
```

Responsabilidades:

```text
fetch
cache
deduplication
invalidation
refetch
loading/error state de transporte
```

Não é fonte canônica.

---

## D2.7-09 — Sem Redux/Zustand inicialmente

Não adicionar global store para duplicar estado do servidor.

Usar:

```text
TanStack Query → server state
React Router   → navigational state
React state    → local transient UI state
Context        → shell/session concerns realmente locais
```

Adicionar outro state manager somente diante de necessidade concreta.

---

## D2.7-10 — Não persistir canonical state no browser

`localStorage`/`sessionStorage` podem guardar somente preferências não
autoritativas, por exemplo:

```text
sidebar collapsed
layout preference
last non-sensitive UI preference
```

Não guardar ali:

```text
auth token
canonical lifecycle state
allowed actions como autoridade
roadmap canônico
pending decision como verdade
```

---

# 6. API Client

## D2.7-11 — Native fetch wrapper

Usar `fetch` nativo por trás de um `ApiClient` pequeno e tipado.

Responsabilidades:

```text
base URL
credentials
CSRF
request id / correlation quando aplicável
JSON parsing
standard error mapping
stale-response handling
abort/cancellation
```

Não adicionar Axios sem necessidade concreta.

---

## D2.7-12 — Contratos de transporte explícitos

O frontend consome DTOs/projections e command contracts.

Não importar entities internas do backend/domain no frontend.

Compartilhamento futuro deve ocorrer por package público de contratos, nunca por
acesso a internals.

A forma física final do package fica para consolidação da estrutura do monorepo.

---

# 7. Commands e mutations

## D2.7-13 — Semantic commands only

A UI envia intenção semântica:

```text
acceptValueIncrement
approveDeliveryTargetVersion
splitValueIncrement
mergeValueIncrement
prioritizeOptional
resolveDecision
acceptDelivery
cancelWorkItem
```

Proibido como API de negócio:

```text
setStatus("DONE")
setProjectState("DELIVERED")
```

---

## D2.7-14 — Expected version em commands materiais

Mutations governadas carregam versão/identity esperada conforme contrato.

Se o estado mudou:

```text
command
→ STALE / VERSION CONFLICT
→ refetch canonical projection
→ explicar mudança
→ usuário reavalia
```

A UI não reaplica a intenção silenciosamente contra versão nova.

---

## D2.7-15 — Sem optimistic update de estado governado

Não mostrar como concluída uma transição material antes da confirmação canônica.

Optimistic UI só é aceitável para estado puramente local, por exemplo:

```text
expand/collapse
draft input
tab selection
visual preference
```

Não para:

```text
state transition
authority decision
ValueIncrement acceptance
Delivery acceptance
finding resolution
```

---

## D2.7-16 — Double click seguro

A UI bloqueia reenvio acidental enquanto a mesma mutation está pendente.

O backend continua responsável por idempotência real.

---

# 8. Real-time

## D2.7-17 — SSE como transporte inicial

Proposta:

```text
Server-Sent Events
```

Motivo:

```text
fluxo principal = servidor → browser
menor complexidade que WebSocket
HTTP-friendly
reconnect nativo
adequado a projection invalidation/activity updates
```

WebSocket não entra inicialmente.

---

## D2.7-18 — SSE transporta sinal, não verdade canônica

Evento SSE não deve ser aplicado diretamente como mutation de canonical state no
browser.

Fluxo:

```text
backend changes canonical state
→ projection updated
→ SSE invalidation signal
→ TanStack Query invalidate
→ canonical refetch
→ UI renders fresh projection
```

SSE pode trazer:

```text
event type
resource ref
projection ref
version hint
correlation
timestamp
```

Mas a projection obtida por query continua sendo a representação consumida pela UI.

---

## D2.7-19 — Reconnect seguro

Ao reconectar:

```text
SSE reconnect
→ refetch relevant current projections
```

Não depender de receber todos os eventos perdidos para reconstruir a tela.

---

## D2.7-20 — Fallback polling

Quando SSE estiver indisponível por período relevante:

```text
degraded mode
→ polling com backoff
→ canonical refetch
```

Cadências exatas ficam abertas.

---

## D2.7-21 — Um stream autenticado por AppShell

MVP:

```text
1 authenticated SSE connection / browser tab
```

O backend publica invalidation signals somente para escopos visíveis/permitidos.

O browser não deve conseguir ampliar escopo escolhendo identifiers arbitrários.

---

# 9. Activity Center

## D2.7-22 — Activity Center persistente no AppShell

Activity Center será uma superfície do shell, disponível durante navegação.

Deve poder:

```text
abrir/fechar sem perder contexto
continuar atualizando enquanto usuário navega
deep-linkar para recurso relacionado
abrir versão full-page para investigação
```

---

## D2.7-23 — Hierarquia explícita

Activity Center deve separar visualmente:

```text
Project phase
Internal Phase step
Module
ValueIncrement
Work Item
Execution
```

Nunca colapsar tudo em um genérico:

```text
RUNNING
```

---

## D2.7-24 — Estados funcionais legíveis

Etapas semânticas usam labels humanos derivados da projection.

Estados visuais aplicáveis:

```text
A FAZER
FAZENDO
FEITO
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
NÃO APLICÁVEL
```

Cor não pode ser o único indicador.

---

## D2.7-25 — Três relógios

Mostrar separadamente quando relevante:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Exemplo:

```text
Executor: ativo agora
Atividade operacional: agora
Último progresso funcional: 46 min atrás
```

---

## D2.7-26 — Progresso factual somente

Permitido:

```text
3 / 5 semantic steps
2 / 4 Work Items
4 / 6 REQUIRED ValueIncrements accepted
```

Proibido:

```text
73%
```

quando não houver cálculo canônico/factual que justifique o percentual.

---

## D2.7-27 — Finding/impediment visível

Activity Center mostra impedimentos persistidos.

Para cada Finding aplicável:

```text
severity
affected scope
reason
evidence/ref
remediation
continuity
allowed next action
```

`NON_BLOCKING` não deve visualmente parecer paralisação global.

---

# 10. Decision Surfaces

## D2.7-28 — Action descriptor server-derived

A UI não deriva ações a partir de strings de state.

```text
projection
→ allowed action descriptors
→ render controls
```

---

## D2.7-29 — Decision Drawer/Modal contextual

Decisão simples pode usar modal/drawer.

Decisão material com muita evidência deve possuir surface dedicada/deep-linkável.

A escolha do container visual nunca altera authority.

---

## D2.7-30 — Conteúdo mínimo de decisão material

Quando aplicável mostrar:

```text
question
alternatives
recommendation
evidence
findings
risk
exception
baseline
normative baseline
consequences
required inputs
```

---

# 11. Timeline e history

## D2.7-31 — Current state separado da timeline

Não usar timeline como fonte de current state.

```text
current projection
!=
historical events
```

Página/tela deve deixar essa diferença explícita.

---

## D2.7-32 — Local activity history e global Project timeline

Separar:

```text
Activity Center local history
→ execução/ciclo atual

Project Timeline
→ história global governada
```

---

# 12. Error handling

## D2.7-33 — Material error é persistente

Falha de domínio/governança relevante vem da projection e continua visível até
tratamento/disposition.

Toast pode complementar, nunca substituir.

---

## D2.7-34 — Transport error separado de governed failure

Exemplos:

```text
HTTP temporariamente indisponível
SSE reconnecting
```

são erros operacionais da UI.

Não devem ser apresentados como:

```text
Execution FAILED
Project BLOCKED
```

sem fato canônico correspondente.

---

## D2.7-35 — No eternal spinner

Operação que passa de uma interação curta deve possuir:

```text
handoff claro
Activity Center
continuity
```

e não um spinner que mantém a página refém.

---

# 13. Loading e freshness

## D2.7-36 — Query loading factual

Usar skeleton/loading somente enquanto falta projection necessária.

Tela já conhecida pode manter conteúdo anterior marcado como refreshing quando
seguro para leitura.

Ações materiais devem respeitar version/freshness.

---

## D2.7-37 — Refetch triggers

Proposta de triggers:

```text
initial route entry
SSE invalidation
SSE reconnect
window refocus quando útil
mutation success
stale command response
explicit refresh
```

Tempos exatos de `staleTime` ficam abertos por categoria de projection.

---

# 14. Visual implementation

## D2.7-38 — Bootstrap 5 CSS

Proposta:

```text
Bootstrap 5 CSS
+
Bootstrap Icons
+
NAAMIVE design tokens / scoped CSS
```

Não usar Bootstrap JS imperativo.

Componentes interativos continuam React.

Objetivo:

```text
base visual madura
baixo custo
acessibilidade previsível
sem criar design system do zero
```

---

## D2.7-39 — Componente local acima de markup repetido

Criar primitives/components NAAMIVE para padrões recorrentes:

```text
StatusBadge
EntityHeader
FindingCard
ActionBar
DecisionSurface
ActivityStep
ActivityCenter
TimelineEntry
EmptyState
ErrorState
LoadingState
```

Sem construir framework próprio.

---

## D2.7-40 — Desktop-first responsivo

O produto inicial é ferramenta de trabalho.

Prioridade:

```text
desktop
→ tablet utilizável
→ mobile sem quebrar operações básicas
```

Não otimizar primeiro para experiência mobile completa.

---

# 15. Accessibility

## D2.7-41 — WCAG 2.2 AA como target

Target técnico de acessibilidade:

```text
WCAG 2.2 AA
```

Inclui:

```text
keyboard navigation
focus visible
semantic HTML
labels
aria somente quando necessário
contrast
no color-only meaning
reduced-motion respect quando aplicável
```

---

# 16. Testing

## D2.7-42 — Component/integration UI tests

Adicionar:

```text
React Testing Library
```

com Vitest para comportamento de componentes e integração de UI.

Evitar testes frágeis de estrutura interna.

---

## D2.7-43 — Playwright journeys

Playwright cobre desde a primeira vertical slice:

```text
login
AppShell
Project selection
deep link
stale command behavior
Activity Center reconstruction
critical human decision
```

somente conforme cada fluxo existir.

---

## D2.7-44 — Real-time regression

Testes devem provar pelo menos:

```text
SSE invalidates query
canonical refetch occurs
lost event does not lose state after reload
reconnect reconstructs state
material failure remains visible
```

---

# 17. Busca

## D2.7-45 — Busca server-side

Busca global e busca de Projects consultam backend.

Não manter índice de domínio autoritativo no browser.

MVP pode começar com busca simples por identificadores/título.

---

# 18. Security no frontend

## D2.7-46 — Session bootstrap

AppShell obtém do backend:

```text
principal
session state
platform-level visible capabilities
```

Isso orienta renderização, não substitui authorization por request.

---

## D2.7-47 — CSRF integrado ao ApiClient

O wrapper HTTP injeta/provê mecanismo CSRF nas mutations conforme desenho de
Security 2.4.

---

## D2.7-48 — Sem secrets no bundle

Nenhum secret operacional ou credential reutilizável pode depender de variável
exposta ao bundle Vite.

Configuração pública de frontend deve ser explicitamente tratada como pública.

---

# 19. Decisões explicitamente não adotadas agora

```text
Redux.......................... NOT REQUIRED NOW
Zustand........................ NOT REQUIRED NOW
WebSocket...................... NOT REQUIRED NOW
Axios.......................... NOT REQUIRED NOW
SSR / Next.js.................. NOT REQUIRED NOW
Material UI.................... NOT REQUIRED NOW
Tailwind....................... NOT REQUIRED NOW
custom design system completo.. NOT REQUIRED NOW
offline-first canonical state.. FORBIDDEN
optimistic governed state...... FORBIDDEN
fake progress percentage....... FORBIDDEN
```

---

# 20. Pontos que permanecem abertos

```text
exact npm versions
exact SSE retry/backoff cadence
exact query staleTime per projection
final route naming
final design tokens
whether forms require React Hook Form
whether large tables need virtualization
whether project list needs pagination from first slice
```

Esses pontos não bloqueiam a aprovação estrutural do 2.7.

---

# 21. Resultado proposto do Brainstorm 2.7

```text
React + Vite + React Router
AppShell estável
Project selection explícita
server-authorized navigation
TanStack Query para server state
native fetch ApiClient
semantic commands
stale-version fencing
no optimistic canonical mutations
SSE invalidation + canonical refetch
polling fallback
persistent Activity Center
three-clock visibility
durable error surfaces
deep links
Bootstrap 5 CSS + Bootstrap Icons
React Testing Library + Vitest
Playwright E2E
WCAG 2.2 AA target
```

---

# 22. Gate de aprovação

Se aprovado, incorporar este bloco à Technology Baseline como:

```text
Brainstorm 2.7 — Application Shell / UI Runtime / Real-Time
```

e atualizar a derivação global da Technology Baseline:

```text
Deriva de: NB-0002
```

A aprovação de 2.7 não autoriza código.

Próxima etapa:

```text
2.8 — PostgreSQL physical persistence details
```

