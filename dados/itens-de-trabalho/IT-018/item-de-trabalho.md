# IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `86ca1b32-e421-4ba2-9382-bdf47320b91e` |
| Código | `IT-018` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `PLANEJADO` |

## Definição Técnica

* **Objetivo técnico:** Implementar no núcleo de domínio (`src/domain/verificacao/`) as entidades puras `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao`, os enums `ConclusaoVerificacao` (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`), `MetodoObservacao`, o invariante estrito de não presunção de conformidade (ausência de evidência resulta em `EVIDENCIA_INSUFICIENTE`) e o serviço de domínio `MotorVerificacaoSoftware` para avaliação fundamentada e explicável de conformidade técnica.
* **Fronteira técnica:** Camada de domínio puro (`src/domain/verificacao/`) e suíte de testes unitários (`tests/it018-dominio-verificacao.test.ts`).
* **Dependências de outros itens:** `IT-017`.
* **Contratos lógicos observados:** Especificação da EV-005 e contratos de domínio de M-005, assegurando distinção entre evidência e conclusão, tolerâncias e explicabilidade dos laudos.
* **Decisões locais autorizadas:** Nomenclatura interna de métodos auxiliares, estrutura de erros tipados de validação e imutabilidade dos laudos de conformidade.

## Critérios Técnicos de Aceitação

1. **Entidades Ricas e Imutabilidade de Laudos:** Criação das entidades `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao` com invariantes e integridade.
2. **Invariante de Não Presunção:** Avaliação de critério sem evidências associadas produz estritamente a conclusão `EVIDENCIA_INSUFICIENTE`, sem presumir sucesso.
3. **Detecção de Divergências e Inconsistências:** Evidências contraditórias ou que falham em satisfazer as condições do critério geram conclusões `CRITERIO_NAO_DEMONSTRADO` ou `DIVERGENCIA_ENCONTRADA` com fundamentação detalhada.
4. **Verificação Estrita:** Aprovação em `npm run typecheck`, `npm run build` e suíte de testes unitários com 100% de cobertura das regras de domínio.
