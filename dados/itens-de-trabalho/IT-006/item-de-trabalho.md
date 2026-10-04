# IT-006 — Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `7a2fe792-26fe-4bd8-b9a3-0b37d29f2140` |
| Código | `IT-006` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CRIADO` |

## Definição Técnica

* **Objetivo técnico:** Implementar o modelo de domínio do Projeto em TypeScript com entidades ricas (`Projeto`, `DirecaoProjeto`, `EtapaFormacaoProjeto`), métodos de transição estrita conforme o catálogo de status (`EM_FORMACAO`, `FORMADO`, `EM_CONDUCAO`, `CONCLUIDO`, `CANCELADO`), suporte imutável às etapas de formação (`ENQUADRAMENTO`, `DESCOBERTA`, `DIREÇÃO DA SOLUÇÃO`) e regras de parecer de auditoria (`FORMACAO_SUFICIENTE`, `FORMACAO_INSUFICIENTE`).
* **Fronteira técnica:** Camada de domínio de Projeto (`src/domain/` ou `src/domain/projeto/`), incluindo entidades, tipos, eventos e interfaces de repositório.
* **Dependências de outros itens:** `IT-005`.
* **Contratos lógicos observados:** Catálogos normativos em `documentacao/projeto/` (Status, Etapas, Resultados do Processo) e Especificação da EV-002.
* **Decisões locais autorizadas:** Modelagem de classes ou objetos funcionais de domínio com métodos de fábrica, validações puras e tipagem TypeScript estrita.

## Critérios Técnicos de Aceitação

1. **Entidade de Domínio e Invariantes:** Entidade `Projeto` encapsulando `id`, `codigo`, `necessidadeId`, `titulo`, `status` e histórico de etapas/auditorias com validação de invariantes.
2. **Máquina de Estados Conforme Norma:** Transições permitidas rigorosamente mapeadas; tentativas de avanço inválido disparam erros de domínio explícitos.
3. **Consolidação da Direção do Projeto:** Transição para `FORMADO` gera e disponibiliza a `DirecaoProjeto` vinculada ao `Compromisso da Necessidade`.
4. **Testes Unitários:** Suíte de testes unitários com 100% de aprovação cobrindo criação, avanço de etapas, auditoria favorável/desfavorável e cancelamento exclusivo pelo Owner.

## Execução e Evidências

* **Executor:** (A ser assumido pelo Ator Engenheiro de Software)
* **Artefatos produzidos / alterados:** (A preencher na execução)
* **Resultado de testes locais:** (A preencher na execução)
* **Conclusão técnica:** (A preencher na execução)

## Resultado do Processo

* **Resultado da Execução:** (Pendente de execução)
* **Data / Registro:** (Pendente de execução)
