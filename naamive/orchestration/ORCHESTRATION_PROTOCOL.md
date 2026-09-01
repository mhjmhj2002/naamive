# Protocolo de Orquestração

Este protocolo é a implementação canônica, independente de tecnologia, de como o NAAMIVE conduz trabalho autorizado. Ele aplica as máquinas de estado e os contratos globais; não substitui a autoridade humana, nem permite que um agente altere o próprio estado. Solicitações sem projeto usam primeiro a máquina pré-projeto e o contrato de entrada.

## Fluxo obrigatório

```text
Solicitação de trabalho
        ↓
Validação de contexto e escopo
        ↓
Leitura do STATUS.md e máquina aplicável
        ↓
Validação de transição e pré-condições
        ↓
Despacho para agente elegível
        ↓
Produção e validação de evidências
        ↓
Decisão de gate
        ↓
Registro imutável do resultado
        ↓
Atualização autorizada do STATUS.md ou retorno para retrabalho
```

## Resolução inicial de comando

- Com `--project <project-id>`, validar o projeto existente e iniciar o fluxo obrigatório.
- Com `--request <request-id>`, validar a solicitação em `naamive/registries/project-intake/` pela [entrada de projeto](../contracts/PROJECT_INTAKE.md) e aplicar a [máquina pré-projeto](PRE_PROJECT_LIFECYCLE.md).
- Sem ambos os parâmetros, não criar projeto ou documento; informar o comando `naamive init-project-request --request-id <request-id>`.

Somente um gate `REGISTER_PROJECT` aprovado materializa o projeto. O detalhe da interface está no [guia de execução](USER_ORCHESTRATION_GUIDE.md).

## Procedimento

1. Receber um [contexto de execução](../contracts/EXECUTION_CONTEXT.md), um [despacho de trabalho](../contracts/WORK_DISPATCH.md) e, quando houver avanço, uma [solicitação de transição](../contracts/TRANSITION_REQUEST.md).
2. Validar identificadores, `scope_type`, `module_id`, `target_path`, item autorizado, artefatos de entrada, contexto de autoridade e capacidades concedidas (`allowed_tools`, rede, credenciais e classe de ação). Uma inconsistência encerra a execução como `REJECTED` sem alteração de estado.
3. Ler o `STATUS.md` do alvo e confirmar que seu `current_state` coincide com o contexto recebido. Para módulo, confirmar também a elegibilidade diante do estado do projeto.
4. Localizar a máquina de projeto ou módulo e verificar que a transição, as evidências mínimas e o gate aplicável existem. Nenhuma transição implícita é permitida.
5. Selecionar somente um agente elegível para a atividade solicitada. O despacho define o papel, os limites de escrita e os resultados esperados; o agente não amplia esse escopo.
6. Receber as saídas do agente e verificar sua vinculação ao `execution_id`, ao item autorizado e às evidências exigidas. Evidência ausente, incompatível ou fora do escopo impede o avanço. A presença de evidência não prova, por si só, completude do trabalho.
7. Criar um resultado de gate. Quando houver `HUMAN_DECISION` exigida, a orquestração permanece em `WAITING_FOR_GATE`; para controles automatizados e revisões independentes, ela aplica os critérios definidos sem presumir aceite humano.
8. Após decisão favorável, atualizar `STATUS.md`, registrar a transição e encerrar a execução como `COMPLETED`. Uma decisão desfavorável resulta em `REWORK_REQUIRED`, `PAUSED` ou `CANCELLED`, conforme a decisão registrada.

## Estados da execução de orquestração

| Estado | Significado | Próximos estados permitidos |
| --- | --- | --- |
| `RECEIVED` | Solicitação recebida, ainda não validada. | `VALIDATING`, `REJECTED` |
| `VALIDATING` | Contexto, escopo e transição estão sendo verificados. | `DISPATCHED`, `REJECTED` |
| `DISPATCHED` | Agente elegível recebeu trabalho limitado ao contexto. | `EVIDENCE_REVIEW`, `FAILED` |
| `EVIDENCE_REVIEW` | Saídas e evidências estão sendo verificadas. | `WAITING_FOR_GATE`, `REWORK_REQUIRED`, `FAILED` |
| `WAITING_FOR_GATE` | Aguardando decisão humana ou de gate autorizado. | `COMPLETED`, `REWORK_REQUIRED`, `PAUSED`, `CANCELLED` |
| `REWORK_REQUIRED` | Há trabalho adicional antes de novo despacho. | `DISPATCHED`, `PAUSED`, `CANCELLED` |
| `COMPLETED` | Trabalho e, se aplicável, transição foram registrados. | nenhum |
| `REJECTED` | Contexto ou solicitação inválidos; nenhum trabalho foi iniciado. | nenhum |
| `FAILED` | Execução falhou sem evidência suficiente para avançar. | `REWORK_REQUIRED`, `PAUSED`, `CANCELLED` |
| `PAUSED` | Execução interrompida por decisão registrada. | `VALIDATING`, `CANCELLED` |
| `CANCELLED` | Execução encerrada por decisão registrada. | nenhum |

## Supervision & assurance: fundação F6 e expansão Fase 6.5

No rollout histórico e opt-in da Fase 6, `EVIDENCE_REVIEW` valida vinculação e
suficiência de evidências; ele não deve ser lido como aceite automático de
completude. A fundação F6 distingue `OUTPUT_SUBMITTED`, review independente de
completude, review especializado, `WORK_ACCEPTANCE` e gate decision. O
invariante é que uma execução bem-sucedida nunca implica automaticamente aceite
do trabalho.

Essa coexistência histórica não é uma proibição permanente de evolução. A Fase
6.5 publicou novos workflows e contratos e aplica supervision/assurance aos
jobs e handoffs reais selecionados. O rollout corretivo substitui o
comportamento operacional legado em novas versões, preservando a semântica,
consulta e rastreabilidade das execuções históricas já concluídas.

Cada dispatch coberto pela política passa por produção e review independente,
com findings rastreáveis, rework delimitado e re-review. Block não é somente
falha ou texto livre: possui diagnóstico, assistência, roteamento especializado,
limites configuráveis de tentativa/progresso e escalonamento. O orquestrador
controlará lifecycle e routing; governance verificará processo e autoridade;
especialistas avaliarão sua área; advisory recomendará alternativas; e gates
humanos continuarão soberanos. Ver o planejamento da Fase 6 no roadmap.

Para instâncias F6.5, as versões operacionais são
`PROJECT_DISCOVERY:v4`, `MODULE_DELIVERY:v2`, `WORK_ITEM_DELIVERY:v2` e
`ORCHESTRATION_EXECUTION:v1`. `WORK_ITEM_DELIVERY:v2` agenda automaticamente
um item elegível e não abre autorização humana individual. `ACCEPT`, sob o
pipeline selecionado (`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2` para novas
coortes), encadeia os handoffs técnicos e a reavaliação de dependentes. A
projeção pública é exclusivamente `STATE_ACTION_PROJECTION:v1`; o cliente não
infere uma ação e todo comando revalida estado, catálogo, versão e autoridade.

## Elegibilidade de papéis

| Atividade | Agente elegível primário |
| --- | --- |
| Qualificar necessidade | `business-intake` |
| Analisar valor, atores e fluxos | `business-analysis` |
| Delimitar capacidade e domínio | `domain-modeling` |
| Especificar requisitos e aceitação | `requirements-engineering` |
| Definir arquitetura e integrações | `solution-architecture` |
| Planejar trabalho e entrega | `delivery-planning` |
| Produzir implementação autorizada | `implementation` |
| Verificar contratos e fluxos integrados | `integration-engineering` |
| Verificar qualidade e aceitação | `quality-assurance` |
| Verificar riscos e evidências de segurança | `security-assurance` |
| Preparar release, operação e handover | `release-operations` |
| Verificar gates, rastreabilidade e autoridade | `governance-assurance` |

O agente de `governance-assurance` pode acompanhar qualquer execução, mas não aprova a decisão humana que verifica. A orquestração pode despachar mais de uma execução coordenada, porém cada uma possui um `execution_id`, um escopo e um agente responsável próprios.

## Invariantes de segurança operacional

- Um agente nunca atualiza diretamente `STATUS.md`.
- Uma execução nunca atua fora de `target_path` e `input_artifacts` autorizados.
- Nenhuma execução de módulo modifica artefatos de outro módulo; trabalho transversal usa escopo de projeto.
- Falha, rejeição ou falta de gate não altera o estado do projeto ou módulo.
- Todo resultado deve poder ser rastreado a uma solicitação, entradas, agente, evidências, decisão e transição.
