---
task: F5-18
status: TODO
---

# F5-18 — Testes unitários, persistência, seeds e idempotência

## Referências

- [Planning: testes e validação (itens 1-3)](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 1-10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: suítes `src/phase1.e2e.test.ts`, `src/http-acceptance.e2e.test.ts`

## Implementar

1. Consolidar unitários de catálogo e baseline: schema/normalização, FKs lógicas de item/revisão, classificação, versões/ranges, decisão aberta explícita, expansão de perfil e rejeição de perfil inválido (sem itens, item inativo, revisão não publicada, item duplicado ou regra incompatível); nova revisão de catálogo é selecionável para novo contexto sem mudar a resolução de baseline antiga, e somente itens ativos no snapshot integram nova Baseline.
2. Consolidar unitários de compatibilidade: `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS` com direção, simetria canônica de conflito, escopo, restrição de versão, precedência, justificativa de recomendação não adotada e rejeição de combinações inválidas, sem condicional de tecnologia concreta.
3. Consolidar PostgreSQL, seeds e histórico: atomicidade de contexto/revisão/gate/evento/operação e da publicação de seeds; índices de unicidade, FKs compostas, ausência de cascata destrutiva e rejeição de referência fora do contexto; executar o pacote inicial duas vezes sem duplicar registros; falha de validação/persistência não deixa revisão `PUBLISHED` incompleta; conferir hash e conteúdo exato da revisão inicial com somente `TYPESCRIPT_MODULAR_MONOLITH` ativo e `MICROSERVICES` inativo. Cobrir ainda item inativo, múltiplas revisões de catálogo/perfil, baseline antiga e histórico: inativar ou revisar catálogo/perfil/regra impede novo uso, mas mantém legíveis e válidas revisões, módulos e evidências anteriores.

## Aceite e comandos

Cobrir os três grupos determinísticos isolados por cenário, sem credenciais/custo/chamadas reais, idempotência do pacote de seeds e auditabilidade no ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check