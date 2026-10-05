# IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `86ca1b32-e421-4ba2-9382-bdf47320b91e` |
| Código | `IT-018` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar no núcleo de domínio (`src/domain/`) as entidades puras `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao`, os enums `ConclusaoVerificacao` (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`), `MetodoObservacao`, o invariante estrito de não presunção de conformidade (ausência de evidência resulta em `EVIDENCIA_INSUFICIENTE`) e o serviço de domínio `MotorVerificacaoSoftware` para avaliação fundamentada e explicável de conformidade técnica.
* **Fronteira técnica:** Camada de domínio puro (`src/domain/`) e suíte de testes unitários (`tests/it018-dominio-verificacao.test.ts`).
* **Dependências de outros itens:** `IT-017`.
* **Contratos lógicos observados:** Especificação da EV-005 e contratos de domínio de M-005, assegurando distinção entre evidência e conclusão, tolerâncias e explicabilidade dos laudos.
* **Decisões locais autorizadas:** Nomenclatura interna de métodos auxiliares, estrutura de erros tipados de validação e imutabilidade dos laudos de conformidade.

## Critérios Técnicos de Aceitação

1. **Entidades Ricas e Imutabilidade de Laudos:** Criação das entidades `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao` com invariantes e integridade.
2. **Invariante de Não Presunção:** Avaliação de critério sem evidências associadas produz estritamente a conclusão `EVIDENCIA_INSUFICIENTE`, sem presumir sucesso.
3. **Detecção de Divergências e Inconsistências:** Evidências contraditórias ou que falham em satisfazer as condições do critério geram conclusões `CRITERIO_NAO_DEMONSTRADO` ou `DIVERGENCIA_ENCONTRADA` com fundamentação detalhada.
4. **Verificação Estrita:** Aprovação em `npm run typecheck`, `npm run build` e suíte de testes unitários com 100% de cobertura das regras de domínio.

## Execução e Evidências

* **Executor:** Ator agêntico **Engenheiro de Software** (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`)
* **Artefatos produzidos / alterados:**
  - `src/domain/tipos-verificacao.ts`: Enums e tipos de domínio de Verificação de Software (`MetodoObservacao`, `ConclusaoVerificacao`).
  - `src/domain/valores-verificacao.ts`: Interfaces de dados e Value Objects (`DadosCriacaoResultadoSoftware`, `DadosCriacaoCriterioVerificavel`, `DadosCriacaoEvidenciaVerificacao`, `DadosCriacaoLaudoVerificacao`, `ResumoLaudoCriterio`, `LaudoVerificacaoAgregado`).
  - `src/domain/verificacao.ts`: Entidades puras `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao` com validação estrita de invariantes e imutabilidade de laudos e evidências.
  - `src/domain/motor-verificacao.ts`: Serviço de domínio puro `MotorVerificacaoSoftware` implementando as invariantes de não presunção de conformidade (`EVIDENCIA_INSUFICIENTE`), detecção de conflitos e divergências (`DIVERGENCIA_ENCONTRADA`), avaliação individual e consolidação do laudo técnico agregado.
  - `tests/it018-dominio-verificacao.test.ts`: Suíte de testes unitários com 14 testes cobrindo exaustivamente todos os critérios de aceitação.
* **Resultado de testes locais:**
  - `npm run typecheck`: Compilação de checagem estrita sem erros (0 diagnósticos).
  - `npm run build`: Compilação TypeScript com geração de artefatos em `dist/` com 100% de sucesso.
  - `npm test`: 18 arquivos de teste e 126 testes automatizados executados e 100% aprovados, sem nenhuma regressão.
* **Conclusão técnica:** Todos os 4 critérios técnicos de aceitação atendidos com rigor absoluto.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 (Conclusão técnica pelo Engenheiro de Software)

## Handoff para o IT-019

Com a conclusão do `IT-018` (`EXECUCAO_CONCLUIDA`), a dependência técnica de `IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background` foi plenamente satisfeita. O `IT-019` avança para **`PRONTO_PARA_EXECUCAO`**.
