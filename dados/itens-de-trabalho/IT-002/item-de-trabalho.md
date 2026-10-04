# IT-002 — Núcleo de Domínio da Necessidade, Regras de Transição e Compromisso

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `e5dcae16-17b5-4a67-a068-d06efceabfbe` |
| Código | `IT-002` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CRIADO` |

## Definição Técnica

* **Objetivo técnico:** Implementar as classes e entidades puras de domínio em TypeScript para a Necessidade, catálogo oficial de status da Necessidade, validação de transições de ciclo de vida, registro de pareceres/qualificações por atores competentes e geração do Compromisso consolidado após `APROVADO`.
* **Fronteira técnica:** Camada de domínio puro (`src/domain/`), repositórios/interfaces de persistência e serviços de domínio desacoplados de bibliotecas externas de transporte ou interface gráfica.
* **Dependências de outros itens:** `IT-001`.
* **Contratos lógicos observados:**
  1. Catálogo oficial de status da Necessidade mantido isolado de histórico e resultados;
  2. Validação estrita de autoridade (apenas o Owner autenticado pode emitir `APROVADO`);
  3. Geração do Compromisso como visão derivada consolidada apenas após decisão humana válida;
  4. Rejeição de transições ou resultados inválidos sem alteração do status corrente.
* **Decisões locais autorizadas:** Nomenclatura interna de tipos, métodos e funções utilitárias do domínio, mantendo fidelidade estrita à terminologia em Português do Brasil.

## Critérios Técnicos de Aceitação

1. **Invariantes de Domínio:** Entidades do domínio TypeScript garantem que uma Necessidade não pode transicionar diretamente sem passar pelos marcos normativos requeridos.
2. **Separação Conceitual:** Testes unitários comprovam que Resultados do Processo, pareceres de atores e decisões do Owner não são tratados como status.
3. **Composição do Compromisso:** Função de composição do Compromisso gera visão consolidada idêntica à especificação quando a decisão `APROVADO` estiver presente e falha se invocada em outro estado.
4. **Cobertura Unitária:** Suíte de testes unitários locais com execução via `npm test` cobrindo todos os cenários válidos e inválidos de transição de ciclo de vida.

## Execução e Evidências

* **Executor:** (Aguardando conclusão de IT-001)
* **Artefatos produzidos / alterados:** N/A
* **Resultado de testes locais:** N/A
* **Conclusão técnica:** N/A

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
