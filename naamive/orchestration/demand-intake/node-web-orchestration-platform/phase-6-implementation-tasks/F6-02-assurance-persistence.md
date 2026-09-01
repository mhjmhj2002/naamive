---
task: F6-02
status: DONE
depends_on: [F6-01]
---

# F6-02 — Persistência aditiva e segurança de assurance

## Diretrizes para o agente

Use migrations aditivas e transacionais. Não reinterprete linhas F3/F4/F5 existentes, não introduza cascata destrutiva e não persista dados sensíveis. Atualize os itens `TO_DO` para `DOING`/`DONE` no próprio arquivo; ao concluir todos, atualize o status da task, valide o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Criar migrations para `work_acceptances`, versões de review/decisões, `work_blocks`, propostas de assistência, exceções de independência e referências auditáveis, com FKs, índices por alvo/estado/correlação e chaves de idempotência.
- [x] **DONE:** Estender aditivamente `agent_executions` com `OUTPUT_SUBMITTED` e a entidade canônica F3 `findings` com referências de assurance, origem `ASSURANCE_REVIEW` e restrição de alvo compatível com todos os alvos F3.
- [x] **DONE:** Aplicar constraints para um review ativo por aceite, decisão terminal única por versão, block aberto deduplicado por `(source_type, source_id, block_code)` e nenhuma correção ativa paralela por work item/revisão.
- [x] **DONE:** Implementar repositórios transacionais que armazenem somente referências/hash/metadados e evidência sanitizada, preservem histórico e proíbam prompt, payload bruto, logs, segredos e paths internos.

## Aceite

Verificar upgrade em base com dados legados, rollback seguro para novos dispatches, atomicidade e todas as constraints/índices de unicidade.
