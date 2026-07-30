---
document_type: workflow-contract
status: APPROVED_FOR_PHASE_1
created_at: 2026-07-30
scope: project creation, intake submission and REGISTER_PROJECT gate
workflow_definition: PROJECT_INTAKE
workflow_version: 1
---

# Contrato da Máquina de Estados — Fase 1

## Decisão

Estados de negócio não são enums fixas no runtime Node. O motor Node interpreta
definições de workflow versionadas no PostgreSQL. Definições publicadas são
imutáveis; mudanças criam uma nova versão. Cada projeto fica vinculado à versão
com que foi criado, preservando significado histórico e auditoria.

O documento descreve a definição `PROJECT_INTAKE` versão 1 e é a referência de
aceite para sua migration/configuração controlada. Não existe tela de edição de
workflow no MVP.

Os contratos complementares são `04_PHASE_1_INTAKE_AND_VALIDATION_CONTRACT.md`
(schema de intake, vínculo Git, resultados e retry) e
`05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` (segurança local, exclusividade,
status e backup).

## Limites e máquinas relacionadas

| Máquina | Responsabilidade | Estados iniciais |
| --- | --- | --- |
| Projeto | Ciclo de negócio e gates. | `DRAFT`, `WAITING_FOR_REGISTRATION`, `REGISTERED` |
| Operação | Solicitação assíncrona do operador. | `ACCEPTED`, `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` |
| Job | Execução recuperável pelo worker. | `PENDING`, `LEASED`, `COMPLETED`, `RETRYABLE`, `FAILED` |

O catálogo de Projeto é uma definição de workflow no banco. Operação e Job são
estados técnicos persistidos do motor; não são expostos como jornada de produto.

## Modelo persistido de workflow

| Tabela | Conteúdo mínimo |
| --- | --- |
| `workflow_definitions` | `id`, `code`, `version`, `scope`, `status`, `published_at` |
| `workflow_states` | definição, `code`, nome, terminalidade, ordem e metadados |
| `workflow_transitions` | origem, trigger, destino, autoridade, guard e efeito |
| `workflow_guards` | código da regra validada pelo runtime Node |
| `workflow_effects` | abrir gate, criar operação/job, atualizar projeção ou nenhum |
| `state_status_mappings` | único mapeamento: definição/versão, estado/evento, tipo/público e status de jornada do catálogo |

Não existe tabela `workflow_status_mappings`. Guards e efeitos usam códigos interpretados pelo runtime; a base não executa
scripts arbitrários. Migrations inserem e publicam a versão 1 após validação do
motor: todos os destinos existem, não há transição ambígua e todo guard/efeito é
suportado. Uma definição publicada não pode ser editada in-place.

## Estados de projeto

| Código | Significado | Status de jornada padrão |
| --- | --- | --- |
| `DRAFT` | Projeto editável; pode aguardar ou receber validação de intake. | `RASCUNHO` ou `AJUSTES_NECESSARIOS` |
| `WAITING_FOR_REGISTRATION` | Intake validado; gate `REGISTER_PROJECT` pendente. | `AGUARDANDO_SUA_DECISAO` |
| `REGISTERED` | Registro aprovado; pronto para extensão da Fase 2. | `EM_PREPARACAO` |

## Comandos, eventos e transições

| Origem | Trigger | Guard | Destino | Efeito |
| --- | --- | --- | --- | --- |
| inexistente | `CREATE_PROJECT` | identificador e vínculo Git válidos | `DRAFT` | grava projeto e `PROJECT_CREATED` |
| `DRAFT` | `BIND_REPOSITORY` | substituição de vínculo existente; caminho permitido, Git, origin, base e árvore válida | `DRAFT` | atualiza vínculo e `REPOSITORY_BOUND` |
| `DRAFT` | `SAVE_INTAKE` | sem operação ativa | `DRAFT` | grava revisão e `INTAKE_SAVED` |
| `DRAFT` | `SUBMIT_INTAKE` | intake e vínculo válidos; sem operação/gate ativo | `DRAFT` | cria operação e job `VALIDATE_INTAKE`; emite `INTAKE_SUBMITTED` |
| `DRAFT` | `INTAKE_VALIDATED` | worker com lease válido e idempotência inédita | `WAITING_FOR_REGISTRATION` | abre gate e emite `GATE_OPENED` |
| `DRAFT` | `INTAKE_REQUIRES_ADJUSTMENT` | erros estruturados de validação | `DRAFT` | encerra operação e projeta `AJUSTES_NECESSARIOS` |
| `DRAFT` | `INTAKE_EXECUTION_FAILED` | falha sanitizada | `DRAFT` | encerra operação e projeta `ATENCAO_NECESSARIA` |
| `WAITING_FOR_REGISTRATION` | `REGISTER_PROJECT_APPROVED` | gate atual e versão válidos | `REGISTERED` | grava decisão e `PROJECT_REGISTERED` |
| `WAITING_FOR_REGISTRATION` | `REGISTER_PROJECT_REJECTED` | feedback válido e versão atual | `DRAFT` | grava decisão/feedback e emite `GATE_REJECTED` |

`SUBMIT_INTAKE` retorna `ACCEPTED` e `operation_id`; não aguarda o worker.

## Invariantes

- Um projeto possui uma versão publicada de workflow vinculada e imutável.
- Somente um job de execução ocupa o worker global por vez durante o MVP.
  `VALIDATE_INTAKE` ocupa esse slot na Fase 1; leitura, SSE e edição de
  rascunhos não o ocupam. Nova submissão do mesmo projeto é bloqueada por
  operação ou gate ativo; outra submissão durante o slot ocupado retorna
  conflito explícito `WORKER_BUSY`.
- Gate pendente bloqueia nova submissão e decisão exige a versão atual do gate.
- Todo evento possui `project_id`, correlação, timestamp, ator e versão de workflow.
- Estado, evento, operação e job são persistidos na mesma transação quando aplicável.
- A UI lê status/marco/próxima ação da projeção; não infere transição técnica.
- Repetir comando com a mesma chave de idempotência retorna o resultado original.

## Recuperação

- Lease vencido torna job recuperável por worker posterior.
- O worker verifica evento e chave de idempotência antes de repetir qualquer efeito.
- Se a conclusão do agente/job for incerta, não presume sucesso: registra falha
  sanitizada ou solicita recuperação conforme o tipo de trabalho.
- Eventos persistidos alimentam SSE e permitem reconexão sem depender da memória
  do processo.

## Aceite da Fase 1

1. Criar o projeto com repositório válido, salvar e submeter intake pela web;
   permitir substituir o vínculo somente enquanto estiver em `DRAFT`.
2. Receber `ACCEPTED` e observar `VALIDATE_INTAKE` por eventos persistidos.
3. Ver gate `REGISTER_PROJECT`, aprovar e alcançar `REGISTERED`.
4. Rejeitar intake/gate e retornar a `DRAFT` com feedback ou erros estruturados.
5. Repetir submissão/decisão sem duplicar estado, evento ou job.
6. Reiniciar worker com job leased/vencido e concluir sem perda ou duplicação.
7. Validar que uma definição publicada não pode ser modificada sem nova versão.
