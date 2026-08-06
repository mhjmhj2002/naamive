---
document_type: phase-renumbering-impact-analysis
status: DRAFT_FOR_HUMAN_VALIDATION
created_at: 2026-08-06
scope: documentation, roadmap, contracts, backlog, and planning only; no runtime implementation authorization
---

# Análise de Impacto — Reorganização para Seis Fases

## Decisão proposta

O roadmap vivo passa a ter seis fases:

| Release | Fase | Resultado |
| --- | --- | --- |
| 1 | Fase 1 | Projeto iniciado e registrado. |
| 2 | Fase 2 | Descoberta e compromisso de produto. |
| 3 | Fase 3 | Ciclo de módulo, desenvolvimento, QA e rework. |
| 4 | Fase 4 | Runtime multi-provider de agentes e observabilidade de IA. |
| 5 — MVP completo | Fase 5 | Projeto entregue, aceito e PR draft auditável. |
| 6 | Fase 6 | Operação sustentável e expansão segura. |

O MVP completo termina na Fase 5. A Fase 4 entrega uma capacidade de plataforma
que é pré-requisito do fechamento funcional, não o fechamento em si.

## Divergência encontrada e tratamento

O pedido de reorganização pressupõe um roadmap anterior de cinco fases, no qual
entrega era Fase 4 e operação era Fase 5. O roadmap vivo em
`01_DELIVERY_ROADMAP.md` já contém, ainda sem implementação, uma Fase 4 de
baseline tecnológica, uma Fase 5 de entrega e uma Fase 6 operacional. Logo, a
renumeração literal `F4 -> F5`, `F5 -> F6` criaria três escopos distintos em
apenas Fases 5 e 6 e não pode ser aplicada sem perda ou colisão de IDs.

A proposta preserva o alvo de seis fases e o escopo não implementado da baseline:
ela torna-se pré-requisito explícito e backlog de planejamento da Fase 5, antes
da materialização de novos módulos. A entrega continua Fase 5 e a operação
continua Fase 6. Não há migração de dados nem reescrita de eventos, pois não
existem execuções da baseline; `10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md`
permanece documento histórico de planejamento e recebe referência de
correspondência quando a proposta for aprovada.

Esta decisão precisa de aprovação humana antes de alterar o status aprovado do
roadmap, renomear IDs publicados ou iniciar implementação.

## Inventário de referências afetadas

| Local | Natureza | Ação proposta |
| --- | --- | --- |
| `00_PRODUCT_NORTH_STAR.md` | Documento vivo; ainda diz Release 4/Fase 4 como MVP completo e operação/Fase 5. | Atualizar releases, limite do MVP e desenho para contrato neutro. |
| `01_DELIVERY_ROADMAP.md` | Documento vivo; contém baseline F4, entrega F5 e operação F6. | Inserir F4 multi-provider; consolidar baseline como pré-requisito F5; manter F5 entrega e F6 operação. |
| `09_PHASE_3_PLANNING.md` | Planejamento vivo; encaminha PR/release à Fase 4. | Corrigir para Fase 5 e declarar dependência do contrato neutro. |
| `10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md` | Planejamento não implementado. | Preservar como pré-requisito da Fase 5. |
| `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` | Referência de produção à Fase 5. | Confirmar se é entrega ou operação e ajustar somente após decisão aprovada. |
| `08_FUTURE_IMPROVEMENTS_BACKLOG.md` | M-001 cita Codex e M-003 sugere separar histórico por adaptador/modelo. | Promover/referenciar no backlog F4, sem apagar a origem. |
| `07_PHASE_2_AGENT_EXECUTION_GUIDE.md`, contratos, runtime Node, migrations e testes | Referências de execução Codex e contratos atuais. | Não renumerar dados históricos; migrar somente na F4 por contratos aditivos e testes de paridade. |
| `orchestration/history/**` | Histórico certificado. | Imutável; acrescentar nota de mapeamento apenas se um documento histórico voltar a ser publicado. |
| `runtime/python/**` e migrations de Fase 3 | Histórico/código já entregue. | Sem alteração nesta task. |

As buscas textuais também encontraram referências indiretas a “próxima fase”,
“MVP completo”, “evolução operacional” e “última fase”. Elas devem ser
revalidadas no pull request de documentação; nenhuma pode inferir que Fase 4 é
o fechamento do MVP.

## Regras de histórico e identificadores

1. Eventos, migrations aplicadas, testes certificados, branches e evidências
   nunca são reetiquetados retroativamente.
2. Documento histórico preserva a numeração vigente e inclui nota com data,
   decisão e correspondência se sua leitura puder gerar ambiguidade.
3. Documento vivo usa a nova sequência somente após aprovação.
4. IDs novos da plataforma multi-provider são `F4-01` a `F4-12`.
5. A conversão literal dos IDs antigos fica bloqueada pela colisão descrita
   acima; a tabela final de IDs da baseline e da entrega deve ser aprovada junto
   do roadmap, sem reutilizar ID com significado diferente.

## Impacto técnico futuro

Fases 5 e 6 só podem chamar `AgentExecutionService`; não podem importar
launcher, SDK, endpoint, credencial, provider ou modelo. Provider/modelo são
metadados de tentativa de execução, não estados do domínio. A máquina de
estados continua autorizando trabalho, gates e efeitos; o router decide somente
como executar trabalho já autorizado.

## Riscos e pendências de aprovação

| Risco | Mitigação |
| --- | --- |
| Colisão entre a baseline F4 já planejada e a nova F4. | Aprovar a consolidação da baseline como pré-requisito F5 antes de renomear. |
| Mudança de comportamento ao encapsular Codex. | Modo inicial Codex-only, adapter de paridade e testes de regressão. |
| Fallback duplicar efeitos Git. | Intenção persistida, idempotência, worktree/SHA, reconciliação e resultado estruturado. |
| Vazamento de contexto/credenciais. | Classificação, allowlist, sanitização antes do adapter e referências de segredo. |
| Custo ou cardinalidade sem controle. | Limites por política, preço versionado, métricas sem IDs únicos como labels. |
