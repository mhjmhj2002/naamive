# Inventário de paridade do runtime Python

Status: `DEPRECATED`; somente referência durante a migração Node/Web.

| Controle legado | Substituto Node/Web Fase 1 | Evidência |
| --- | --- | --- |
| Identificador kebab-case e campos obrigatórios | `validateIntake` e criação de projeto | `src/service.test.ts` |
| Conteúdo de negócio sem decisão tecnológica | Política `INTAKE_TECHNOLOGY_DECISION` | `src/service.test.ts` |
| Documento de necessidade legível | Revisão imutável + snapshot no ArtifactStore | `intake_revisions`, `artifacts` |
| Auditoria de execução | Eventos, operações e jobs PostgreSQL | timeline/SSE |
| Validação e recuperação | `VALIDATE_INTAKE`, lease e retries | `src/worker.ts` |

O runtime Python não recebe funcionalidades novas. Controles fora do fluxo de
intake permanecem referência para as fases posteriores e não são parte da Fase 1.
