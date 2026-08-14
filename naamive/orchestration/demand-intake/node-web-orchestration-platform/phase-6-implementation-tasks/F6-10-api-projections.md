---
task: F6-10
status: DONE
depends_on: [F6-05, F6-06, F6-07, F6-08, F6-09]
---

# F6-10 — APIs e projeções sanitizadas de assurance

## Diretrizes para o agente

Exponha projeções read-only e comandos governados, nunca fatos calculados no navegador. Autorize cada comando pelo papel/gate apropriado e preserve classificação/sanitização no egress. Atualize itens e status no arquivo; valide o diff, faça commit e push ao terminar.

## Itens de implementação

- [x] **DONE:** Publicar contratos/versionamento de leitura para aceite, review, findings, blocks, propostas, routing e histórico, contendo apenas IDs, estados, decisões, evidências sanitizadas, próxima ação e metadados permitidos.
- [x] **DONE:** Expor endpoints de consulta aninhados por projeto/módulo/work item e por correlação, com paginação, ordenação estável e filtros de estado/categoria permitidos.
- [x] **DONE:** Expor comandos idempotentes para selecionar resolução, pausar/cancelar, escalar, registrar gate humano e reconciliar manualmente; a reconciliação requer On-call Owner autorizado, registra ator/motivo/evidência/correlação e aplica somente transições já permitidas.
- [x] **DONE:** Rejeitar dados brutos, segredos, paths, prompts e tentativa de trocar autoridade/política via payload; aplicar classificação máxima e autorização no servidor.

## Aceite

Cobrir contratos fechados, isolamento por escopo, idempotência, autorização — inclusive reconciliação manual exclusiva do On-call Owner — e ausência de informações proibidas em respostas/erros.
