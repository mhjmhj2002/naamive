---
document_type: phase-renumbering-impact-analysis
status: DRAFT_FOR_HUMAN_VALIDATION
created_at: 2026-08-06
scope: documentation, roadmap, contracts, backlog, and planning only; no runtime implementation authorization
---

# Análise de Impacto — Reorganização para Sete Fases

## Decisão proposta

O roadmap vivo passa a ter sete fases:

| Release | Fase | Resultado |
| --- | --- | --- |
| 1 | Fase 1 | Projeto iniciado e registrado. |
| 2 | Fase 2 | Descoberta e compromisso de produto. |
| 3 | Fase 3 | Ciclo de módulo, desenvolvimento, QA e rework. |
| 4 | Fase 4 | Runtime multi-provider de agentes e observabilidade de IA. |
| 5 | Fase 5 | Baseline tecnológica aprovada antes da primeira materialização de módulo. |
| 6 — MVP completo | Fase 6 | Projeto entregue, aceito e PR draft auditável. |
| 7 | Fase 7 | Operação sustentável e expansão segura. |

O MVP completo termina na Fase 6. A Fase 4 entrega uma capacidade de plataforma
e a Fase 5 fixa a baseline tecnológica; ambas são pré-requisitos do fechamento
funcional, não o fechamento em si.

## Divergência encontrada e tratamento

O pedido de reorganização introduziu a Fase 4 de runtime multi-provider e
renumerou a baseline tecnológica para Fase 5. Como a baseline é uma entrega
própria antes da primeira materialização de módulo, a entrega final e a operação
foram deslocadas respectivamente para as Fases 6 e 7.

A proposta preserva o escopo não implementado da baseline como a própria Fase 5,
antes da materialização de novos módulos. A entrega é Fase 6 e a operação é
Fase 7. Não há migração de dados nem reescrita de eventos, pois não existem
execuções da baseline.

Esta decisão precisa de aprovação humana antes de alterar o status aprovado do
roadmap, renomear IDs publicados ou iniciar implementação.

## Inventário de referências afetadas

| Local | Natureza | Ação proposta |
| --- | --- | --- |
| `00_PRODUCT_NORTH_STAR.md` | Documento vivo; refletia entrega como Fase 5 e operação como Fase 6. | Atualizar releases e limite do MVP para Fases 5–7. |
| `01_DELIVERY_ROADMAP.md` | Documento vivo; associava Fase 5 à entrega. | Fazer da baseline a Fase 5; deslocar entrega para Fase 6 e operação para Fase 7. |
| `09_PHASE_3_PLANNING.md` | Planejamento vivo; encaminhava PR/release à Fase 5. | Corrigir para Fase 6 e declarar dependência do contrato neutro. |
| `10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md` | Planejamento não implementado. | Consolidar como plano normativo da Fase 5. |
| `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` | Referência de produção à Fase 5. | Corrigir a referência para a Fase 6. |
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
5. A baseline usa `F5-01` a `F5-06`; a entrega usa `F6-01` a `F6-08`; a
   operação usa `F7-01` a `F7-05`. Nenhum ID é reutilizado com outro significado.

## Impacto técnico futuro

Fases 5, 6 e 7 só podem chamar `AgentExecutionService`; não podem importar
launcher, SDK, endpoint, credencial, provider ou modelo. Provider/modelo são
metadados de tentativa de execução, não estados do domínio. A máquina de
estados continua autorizando trabalho, gates e efeitos; o router decide somente
como executar trabalho já autorizado.

## Riscos e pendências de aprovação

| Risco | Mitigação |
| --- | --- |
| Inconsistência entre documentos vivos e a nova sequência. | Manter a baseline como Fase 5 e deslocar entrega/operação para Fases 6/7 no mesmo conjunto documental. |
| Mudança de comportamento ao encapsular Codex. | Modo inicial Codex-only, adapter de paridade e testes de regressão. |
| Fallback duplicar efeitos Git. | Intenção persistida, idempotência, worktree/SHA, reconciliação e resultado estruturado. |
| Vazamento de contexto/credenciais. | Classificação, allowlist, sanitização antes do adapter e referências de segredo. |
| Custo ou cardinalidade sem controle. | Limites por política, preço versionado, métricas sem IDs únicos como labels. |
