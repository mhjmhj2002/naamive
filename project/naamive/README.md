# NAAMIVE — Self-hosted Project Workspace

**Canonical root:** `project/naamive/`  
**Papel:** roteador estável do workspace; não é dashboard de status.

## Propósito

Este diretório contém os artefatos de planejamento, governança, decisões,
evidências e projeções operacionais do projeto NAAMIVE MVP.

## Navegação

- [PROJECT_CONTINUITY.md](../../PROJECT_CONTINUITY.md) — índice de Projects e
  ponto de entrada do ramo corrente;
- [projects/](projects/) — Projects e a hierarquia de `STATUS.md`;
- `projects/<project>/governance/` — gates, decisões e baselines do Project;
- `projects/<project>/audits/` e `reviews/` — evidências de auditoria e review;
- `projects/<project>/executions/`, quando existir — executions;
- `projects/<project>/activity/` — histórico factual append-only.

Para status, entre pelo `STATUS.md` do Project apontado por
`PROJECT_CONTINUITY.md` e siga apenas filhos diretos `DOING` ou `BLOCKED`.
Arquivos de definição (`PROJECT.md`, `MODULE.md`, `VALUE_INCREMENT.md`) dizem o
que a entidade é; os `STATUS.md` dizem onde ela está.

## Regras para agentes

Agentes que operarem neste workspace devem ler o `AGENTS.md` na raiz do
repositório antes da task. Resolva a lei pelo `normative_baseline_ref` do
Project, nunca por `HEAD` ou pela versão mais recente de um documento.
