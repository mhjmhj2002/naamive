# APPLY — 2.9 Continuity Fix

Correção somente operacional do `PROJECT_CONTINUITY.md`.

Motivo:
o commit de consolidação 2.9 está correto, mas o continuity ainda continha
trechos antigos de 2.7/2.8 e uma duplicação de 2.9.

Esta correção:
- atualiza o checkpoint validado para `4424c0c9...`;
- registra 2.9 como COMPLETE;
- coloca 2.10 como CURRENT;
- remove status antigo `v0.6 BRAINSTORM`;
- remove a linha duplicada de 2.9;
- atualiza o handoff e o status board.

Não altera:
- NB-0002;
- Technology Baseline v0.9;
- decisões técnicas 2.1..2.8.
