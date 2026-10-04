# IT-011 — Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `5943f3b0-c748-4d37-bd0e-d0bd170fb3e3` |
| Código | `IT-011` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a persistência concreta em PostgreSQL para as entidades de coordenação (`RepositorioCoordenacaoPostgres`), o serviço de aplicação (`ServicoAplicacaoCoordenacao`) orquestrando os casos de uso de avaliação de elegibilidade, identificação do próximo avanço válido, despacho de handoffs e recepção idempotente de retornos, além de integrar o processamento contínuo em background no worker desacoplado (`src/worker/worker-segundo-plano.ts`) para reavaliação periódica de dependências e monitoramento de condições operacionais.
* **Fronteira técnica:** Camada de aplicação e infraestrutura (`src/application/`, `src/infrastructure/database/`, `src/worker/`).
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

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/domain/repositorio-coordenacao.ts`: Interface do contrato de repositório puro para trabalhos coordenados, handoffs e retornos.
  - `src/domain/erros.ts`: Adição da classe de erro de domínio `RecursoNaoEncontradoErro`.
  - `src/domain/coordenacao.ts`: Ajuste de compatibilidade de tipos para referências opcionais no despacho de handoff.
  - `src/infrastructure/database/repositorio-coordenacao-postgres.ts`: Implementação concreta transacional em PostgreSQL para trabalhos, handoffs e retornos com suporte a jsonb e integridade referencial.
  - `src/infrastructure/database/repositorio-coordenacao-memoria.ts`: Implementação em memória para isolamento rápido em testes e fallback.
  - `src/application/servico-aplicacao-coordenacao.ts`: Orquestração de casos de uso de coordenação (cadastro, avaliação de elegibilidade, seleção de próximo avanço, despacho idempotente, recepção de retorno e detalhamento com dependências).
  - `src/worker/worker-segundo-plano.ts`: Integração da tarefa assíncrona `REAVALIAR_COORDENACAO` no loop de background com telemetria para o M-004.
  - `src/server.ts`: Injeção e inicialização de `repositorioCoordenacao` e `servicoCoordenacao` no bootstrap do sistema e no worker desacoplado.
  - `src/index.ts`: Exportação dos novos módulos de aplicação e infraestrutura de coordenação.
  - `tests/it011-repositorio-e-servico-coordenacao.test.ts`: Suíte de 9 testes cobrindo persistência relacional PostgreSQL, casos de uso do serviço e integração contínua com o worker.
* **Resultado de testes locais:**
  - `npm run typecheck`: Sucesso sem erros de compilação TypeScript (`tsc --noEmit`).
  - `npm run build`: Sucesso na compilação do projeto para a pasta `dist/`.
  - `npm test`: 11 suítes de teste e 81 testes aprovados com 100% de sucesso (incluindo testes de IT-001 a IT-011).
* **Conclusão técnica:** Todos os 6 critérios de aceitação foram integralmente atendidos com robustez transacional, idempotência e desacoplamento DDD.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Engenheiro de Software
