# NAAMIVE — Project Continuity

**Natureza:** índice operacional de Projects; não normativo
**Regra:** cada fato mutável tem um único dono; este arquivo só localiza o
Project a abrir.
**Última reconciliação do índice:** 2026-09-14T20:09:01-03:00

## Navegação

`navigation_status` é um marcador operacional, distinto de `lifecycle_state`.
Abra ramos `DOING` ou `BLOCKED`; não abra `TODO` por padrão. Um ramo `DONE` só
deve ser aberto quando a task exigir evidência histórica ou dependência.

| Project | Navigation | Entry point |
|---|---|---|
| PRJ-001 — NAAMIVE MVP | DOING | [project status](project/naamive/projects/PRJ-001-naamive-mvp/STATUS.md) |

Para descobrir a lei aplicável, abra o `STATUS.md` do Project, leia seu
`normative_baseline_ref` e siga para o certificado correspondente em
`governance/normative-baselines/`. O certificado, e não `HEAD` ou `latest`,
define a membership normativa efetiva.
