---
task: F5-06
status: DONE
---

# F5-06 — Avaliador genérico de compatibilidades do Catálogo

## Referências

- [Planning: Compatibility Rules e comportamento genérico](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 6](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: padrão de serviços de validação em `src/agent-execution-service.ts`

## Implementar

1. Implementar o avaliador genérico de relações que aplica `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS` a um conjunto de referências de baseline/arquitetura, com direção, escopo, condição de versão e severidade, sem condicional para tecnologia concreta.
2. Aplicar a ordenação canônica e a simetria de `CONFLICTS_WITH` e a direcionalidade de `REQUIRES`/`RECOMMENDS`; `source_item_id <> target_item_id`, com expressão nula tratada como valor único.
3. Implementar as regras de severidade: `ERROR` bloqueia publicação de perfil e baseline incompatíveis; `WARNING`/`INFO` não bloqueiam, mas `RECOMMENDS` não adotada pode exigir justificativa auditável.
4. Expor a avaliação para uso em publicação de perfil, criação/complemento de baseline e validadores de cardinalidade; nenhum caso deve depender de condicional de tecnologia concreta.

## Aceite e comandos

Cobrir `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS` com direção, simetria canônica de conflito, escopo, restrição de versão, precedência e justificativa de recomendação não adotada; rejeição de combinações inválidas sem condicional tecnológica.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check
