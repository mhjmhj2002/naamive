# IT-011 — Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `5943f3b0-c748-4d37-bd0e-d0bd170fb3e3` |
| Código | `IT-011` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a persistência concreta em PostgreSQL para as entidades de coordenação (`RepositorioCoordenacaoPostgres`), o serviço de aplicação (`ServicoAplicacaoCoordenacao`) orquestrando os casos de uso de avaliação de elegibilidade, identificação do próximo avanço válido, despacho de handoffs e recepção idempotente de retornos, além de integrar o processamento contínuo em background no worker desacoplado (`src/worker.ts`) para reavaliação periódica de dependências e monitoramento de condições operacionais.
* **Fronteira técnica:** Camada de aplicação e infraestrutura (`src/aplicacao/coordenacao/`, `src/infraestrutura/persistencia/`, `src/worker.ts`).
* **Dependências de outros itens:** `IT-010`.
* **Contratos lógicos observados:** Métodos e interfaces: `avaliarElegibilidadeTrabalhos`, `obterProximoAvancoValido`, `despacharProximoAvanco`, `registrarRetornoExecucao`, `listarTrabalhosCoordenados`, `obterDetalhesTrabalho`.
* **Decisões locais autorizadas:** Estruturação de consultas SQL com transações atômicas (`BEGIN / COMMIT`), isolamento contra race conditions e formatação do payload JSONB do handoff com referências canônicas.

## Critérios Técnicos de Aceitação

1. **Repositório Transacional PostgreSQL:** Implementação robusta que realiza a leitura e escrita das tabelas de coordenação, garantindo consistência atômica entre transições de estado, emissão de handoffs e persistência de retornos.
2. **Idempotência de Despacho e Retorno:** Tentativas repetidas de despachar o mesmo trabalho em execução ou retornos duplicados não duplicam registros nem causam corrupção de estado.
3. **Casos de Uso Completos:** Serviço de aplicação atende a todos os contratos definidos na Especificação da EV-003.
4. **Worker Desacoplado Integrado:** Tarefas de coordenação executando no loop do worker sem afetar negativamente o processamento das tarefas já existentes da EV-001 e EV-002.
5. **Testes de Integração de Casos de Uso:** Bateria de testes de serviço e repositório validando o ciclo completo (cadastro de trabalhos com dependências → cálculo do próximo avanço → despacho → retorno com sucesso → liberação do sucessor).
6. **Verificação Estrita:** `npm run typecheck`, `npm run build` e suíte de testes aprovados sem erros.

## Execução e Evidências

* **Executor:** (A ser atribuído — Engenheiro de Software)
* **Artefatos produzidos / alterados:** (A preencher na execução)
* **Resultado de testes locais:** (A preencher na execução)
* **Conclusão técnica:** (A preencher na execução)

## Resultado do Processo

* **Resultado da Execução:** (A preencher na execução: `EXECUCAO_CONCLUIDA` ou `EXECUCAO_IMPEDIDA`)
* **Data / Registro:** (A preencher na execução)
