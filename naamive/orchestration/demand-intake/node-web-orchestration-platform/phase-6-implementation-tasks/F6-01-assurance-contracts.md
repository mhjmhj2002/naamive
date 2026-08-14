---
task: F6-01
status: TODO
depends_on: [F6-GATE]
---

# F6-01 — Contratos e política de assurance

## Diretrizes para o agente

Antes de implementar, leia o planning F6 e os contratos F3/F4. Trabalhe exclusivamente no escopo desta task, mantenha compatibilidade dos requests legados e não exponha conteúdo bruto, segredos, prompts, stdout/stderr ou caminhos internos. Marque cada item como `DOING` ao iniciar e `DONE` somente após sua verificação; quando todos estiverem concluídos, atualize o status da task, revise `git diff --check`, faça commit e push da branch da task.

## Itens de implementação

- [ ] **TO_DO:** Definir contratos versionados e schemas fechados para `assurance-policy`, `work-acceptance`, `review-package`, `review-decision`, `work-block`, proposta de assistência e decisão/gate humano, com IDs de correlação, versão, classificação e idempotência.
- [ ] **TO_DO:** Declarar enums canônicos para modo `PRODUCE`/`REVIEW`, estados de aceite, decisão terminal (`ACCEPT`, `REWORK`, `BLOCK`, `ESCALATE`), categorias/severidades/status de block e ações de routing, sem contratos concorrentes.
- [ ] **TO_DO:** Formalizar as invariantes: sucesso de execução não é aceite; review é terminal e não pode gerar review; uma decisão terminal por versão; no máximo um review ativo; cancelamento vence dispatch; e F4 mantém uma tentativa `DISPATCHED` por execução.
- [ ] **TO_DO:** Modelar a política F6 versionada e opt-in, incluindo elegibilidade, limites de rework/progresso, classificação permitida para exceção de runtime e critérios de falha bloqueável, sem alterar a política ou terminação F4 existente.

## Aceite

Cobrir validação de schemas, propriedades extras, versionamento, invariantes e seleção opt-in; garantir que nenhum tipo ou payload inclua dados proibidos.
