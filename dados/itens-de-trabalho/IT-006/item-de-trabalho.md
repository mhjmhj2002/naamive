# IT-006 — Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `7a2fe792-26fe-4bd8-b9a3-0b37d29f2140` |
| Código | `IT-006` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CONCLUIDO` |

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

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/domain/tipos-projeto.ts`: Definição de `StatusProjeto`, `EtapaFormacaoProjeto`, `TipoResultadoProcessoProjeto`, `DecisaoMaterialOwnerProjeto` e `AtorCompetenteProjeto`.
  - `src/domain/valores-projeto.ts`: Interfaces de dados, registros imutáveis de etapas, auditorias, direção consolidada e decisões.
  - `src/domain/projeto.ts`: Entidade rica `Projeto` com máquina de estados, proteção de invariantes, condução de etapas de formação, parecer de auditoria, consolidação de direção e cancelamento excepcional pelo Owner.
  - `src/domain/repositorio-projeto.ts`: Contrato de persistência de Projeto.
  - `src/index.ts`: Re-exportação dos novos módulos de domínio de Projeto.
  - `tests/it006-dominio-projeto.test.ts`: Suíte completa de 12 testes unitários cobrindo todos os critérios técnicos de aceitação.
* **Resultado de testes locais:**
  - `npm test`: 6 arquivos de teste aprovados, 46/46 testes unitários e de integração verdes (12 testes novos específicos do IT-006).
  - `npm run typecheck`: 0 erros de tipagem estrita no TypeScript.
  - `npm run build`: Compilação limpa em `dist/`.
* **Conclusão técnica:** Todos os 4 critérios técnicos de aceitação foram cumpridos integralmente.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Engenheiro de Software
