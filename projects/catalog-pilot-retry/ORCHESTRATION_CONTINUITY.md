# Continuidade da Orquestração — catalog-pilot-retry

## Ideia do projeto

Este é um piloto descartável para validar o NAAMIVE de ponta a ponta a partir de uma necessidade de negócio: uma capacidade de catálogo genérica, reutilizável e adaptável a diversos contextos. A necessidade aprovada está em [BUSINESS_NEED.md](need/BUSINESS_NEED.md); a visão da plataforma está em [PROJECT_VISION.md](../../naamive/vision/PROJECT_VISION.md).

## Estado atual

- Projeto materializado: `catalog-pilot-retry`.
- Estado do projeto: `ANALYSIS`.
- Módulos: ainda não materializados.
- Work items: ainda não materializados.
- Status e histórico: [STATUS.md](STATUS.md) e [STATUS_HISTORY.md](STATUS_HISTORY.md).

## O que já funciona

- Intake de projeto, validação e gate `REGISTER_PROJECT`.
- Materialização do projeto e da necessidade de negócio.
- Registro de status legível e histórico de transições.
- Cancelamento controlado e exclusão definitiva somente após cancelamento.
- Adaptador de despacho para Codex CLI, com escopo de escrita verificado.

## Bloqueio atual

O comando `naamive orchestrate --project catalog-pilot-retry` ainda retorna `PROJECT_EXECUTION_PENDING`. O runtime ainda não conecta a saída de agentes ao motor de estados.

O perfil `terra` foi recusado pelo Codex CLI autenticado por conta ChatGPT. O adaptador foi ajustado para usar o modelo padrão suportado pela conta, com raciocínio `low`.

## Próxima implementação necessária

1. Motor auditável de transições de projeto e gates pendentes.
2. Execução de análise com `business-analysis` e evidência em `analysis/business/`.
3. Proposta de módulos e gate humano de compromisso de produto.
4. Materialização do módulo aprovado, começando pelo candidato `catalog`.
5. Criação de work items dentro do módulo.
6. Integração do resultado do Codex com evidências, transições, validação e entrega.

## Regras a preservar

- Projeto → módulo → work item; work item nunca existe fora de módulo.
- Módulos representam capacidades de negócio, não camadas técnicas.
- Nenhum agente altera `STATUS.md` diretamente.
- Nenhuma transição ou gate humano é inferido.
- O projeto piloto não deve receber implementação de produto antes da materialização e autorização formal do módulo e de seus work items.
