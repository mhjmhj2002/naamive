# IT-002 — Domínio da Necessidade, Regras de Transição e Composição do Compromisso

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `23fd7c20-dad2-4f4f-91cb-7b91bffa9199` |
| Código | `IT-002` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CRIADO` |

## Definição Técnica

* **Objetivo técnico:** Implementar as classes de domínio, objetos de valor, serviços de aplicação e máquina de estados que governam o ciclo de vida da Necessidade, garantindo validações prévias, transições permitidas de status, atribuição de competência dos Atores e geração da visão consolidada do Compromisso da Necessidade após decisão `APROVADO`.
* **Fronteira técnica:** Camada de domínio e aplicação (core business logic isolada de frameworks web/banco); entidades de domínio, enumerações normativas de status e resultados do processo, serviços de caso de uso.
* **Dependências de outros itens:** `IT-001` (para persistência e esquema base).
* **Contratos lógicos observados:** Regras de negócio 1 a 5 da EV-001 e catálogo de status de Necessidade (`documentacao/necessidade/06_STATUS_DA_NECESSIDADE.md`); rejeição de transições ilegais sem alteração do estado atual; separação entre status, histórico, Resultados do Processo e decisão humana; visão consolidada do Compromisso somente após `APROVADO`.
* **Decisões locais autorizadas:** Modelagem de agregados, padrões de domínio (Domain Events, Factory, State ou Command Handlers) e tratamento de exceções de domínio ricas em diagnóstico.

## Critérios Técnicos de Aceitação

1. Testes unitários cobrem 100% dos caminhos de transição válidos do ciclo da Necessidade e rejeitam categoricamente transições inválidas com exceções diagnósticas explicativas.
2. Tentativa de transicionar ou registrar parecer/decisão sem cumprir pré-condições normativas falha sem corromper ou alterar o status atual da entidade.
3. Teste unitário demonstra que o método de geração/consolidação do Compromisso retorna a visão completa somente se a Necessidade possuir decisão válida `APROVADO`.

## Execução e Evidências

* **Executor:** *Pendente de atribuição ao Engenheiro de Software*
* **Artefatos produzidos / alterados:** *Pendente*
* **Resultado de testes locais:** *Pendente*
* **Conclusão técnica:** *Pendente*

## Resultado do Processo

* **Resultado da Execução:** *Pendente*
* **Data / Registro:** *Pendente*
