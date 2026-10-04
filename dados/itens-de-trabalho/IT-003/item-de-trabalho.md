# IT-003 — Worker em Background Desacoplado, Autenticação e Portas de Integração

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `714fb25c-aa13-43f1-b9ff-29e6128005b6` |
| Código | `IT-003` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar o worker em background desacoplado em Node.js/TypeScript para processamento assíncrono contínuo (tarefas agendadas, reconciliação e eventos), o adaptador de autenticação do Owner e as portas de integração lógica com M-002 (bootstrap idempotente do Projeto) e M-004 (preservação de contexto).
* **Fronteira técnica:** Processo executável independente de worker (`src/worker/`), portas e adaptadores de integração (`src/infrastructure/adapters/`), lógica de mensageria/filas transacionais locais em PostgreSQL e mecanismo de verificação de identidade autenticada do Owner.
* **Dependências de outros itens:** `IT-002`.
* **Contratos lógicos observados:**
  1. O worker deve rodar em loop contínuo assíncrono desacoplado do ciclo de requisições HTTP;
  2. A porta de identidade deve rejeitar qualquer decisão material emitida sem identidade comprovada do Owner;
  3. A porta de integração com M-002 deve emitir solicitação lógica idempotente vinculada à referência estável da Necessidade (invariante: `1 Necessidade aprovada → 1 Projeto`).
* **Decisões locais autorizadas:** Formato do canal de filas assíncronas (ex: tabela relacional de jobs no PostgreSQL com `SKIP LOCKED` ou EventEmitter tipado) e simulação controlada da porta de autenticação para testes locais.

## Critérios Técnicos de Aceitação

1. **Execução Contínua do Worker:** Processo de worker inicia, executa ciclo de polling/jobs assíncronos e finaliza graciosamente sem bloquear recursos.
2. **Autenticação Obrigatória:** Tentativas de registrar decisão humana sem credenciais válidas do Owner são bloqueadas com erro explícito de segurança.
3. **Idempotência da Integração:** Emissão múltipla da solicitação de bootstrap para M-002 não gera duplicações de solicitação ou inconsistências de dados.
4. **Testes de Integração:** Suíte de testes automatizados valida o ciclo de trabalho do worker e o funcionamento das portas lógicas.

## Execução e Evidências

* **Executor:** Ator Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `migrations/002_tabela_tarefas_trabalho.sql`: Esquema relacional para fila de jobs/tarefas de segundo plano no PostgreSQL;
  - `src/domain/erros.ts`: Erros tipados `AutenticacaoRequeridaErro` e ajuste de `AutoridadeInvalidaErro`;
  - `src/infrastructure/adapters/autenticacao-owner.ts`: Porta `PortaAutenticacaoOwner` e adaptador `AdaptadorAutenticacaoOwner` com checagem estrita de credenciais e autoridade do Owner;
  - `src/infrastructure/adapters/integracao-modulos.ts`: Portas e adaptadores `PortaIntegracaoProjeto` (com M-002 para bootstrap idempotente 1:1) e `PortaIntegracaoContexto` (com M-004 para rastreabilidade auditável);
  - `src/infrastructure/adapters/fila-tarefas.ts`: Abstração de fila assíncrona com implementações para PostgreSQL (`FilaTarefasPostgres`) e em memória (`FilaTarefasMemoria`);
  - `src/infrastructure/database/repositorio-postgres.ts`: Implementação completa de `RepositorioNecessidadePostgres` para persistência transacional da Necessidade, histórico, resultados, decisões e compromisso;
  - `src/worker/worker-segundo-plano.ts`: Implementação do `WorkerSegundoPlano` para polling contínuo desacoplado com parada graciosa e processamento de jobs de bootstrap e reconciliação;
  - `src/index.ts`: Exportação central dos novos componentes;
  - `tests/it003-worker-autenticacao-integracao.test.ts`: Suíte de testes cobrindo ciclo de vida do worker, autenticação/autorização estrita do Owner e idempotência de integração com M-002/M-004.
* **Resultado de testes locais:**
  - 24 de 24 testes executados com 100% de sucesso (`vitest run`);
  - Checagem estrita de tipos aprovada sem nenhum erro (`tsc --noEmit`);
  - Compilação de produção executada com sucesso (`tsc`).
* **Conclusão técnica:** Todos os 4 critérios de aceitação foram plenamente atendidos.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-03 (Registro pelo Ator Engenheiro de Software)

