# MOD-001 — Project Context

**Project:** PRJ-001  
**Nature:** business capability  
**Impact:** MATERIAL

## Responsabilidade

Prover a capacidade para um principal humano autorizado entrar e operar em um
contexto explícito de Project, sem transformar o navegador em fonte de
autoridade ou verdade canônica.

## Entradas

```text
principal humano autenticado
estado de sessão server-side
authority/grants com escopo de Project
fonte canônica de leitura do Project
```

## Resultados

```text
Projects autorizados visíveis
contexto de Project explicitamente selecionado
projeção factual de Activity Center
reconstrução segura do contexto após restart
```

## Escopo

Inclui autenticação de entrada, bootstrap durável de sessão, grants com escopo,
visibilidade autorizada de Projects, seleção explícita, AppShell e projeção
inicial do Activity Center. Exclui mutação de lifecycle de Project, motor de
execução de Work Item, autonomia de agentes, Delivery e provisionamento HML/PROD.

## Relações

O Module contém o Value Increment `VI-001 — Authenticated Project Context`.
Seu estado e a navegação para filhos diretos estão em [STATUS.md](STATUS.md).
Riscos, decisões, gates e evidências permanecem nos artefatos governados
apropriados; este arquivo descreve somente a capacidade.
