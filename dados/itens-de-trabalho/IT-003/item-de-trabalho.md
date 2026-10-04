# IT-003 — Worker em Background Desacoplado, Autenticação e Portas de Integração

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `714fb25c-aa13-43f1-b9ff-29e6128005b6` |
| Código | `IT-003` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CRIADO` |

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

* **Executor:** (Aguardando conclusão de IT-002)
* **Artefatos produzidos / alterados:** N/A
* **Resultado de testes locais:** N/A
* **Conclusão técnica:** N/A

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
