Implemente integralmente a implementation task:

TASK: F5-XX

A task está localizada em:

phase-5-implementation-tasks/F5-XX-<nome-da-task>.md

O planning oficial da Fase 5 permanece como fonte de verdade e pode ser consultado sempre que necessário:

10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md

==================================================
PREPARAÇÃO
==================================================

Antes de qualquer alteração:

1. Certifique-se de que a branch atual está sincronizada com a main.

2. Atualize a main.

3. Crie uma nova branch a partir da main.

Nome da branch:

feature/f5-xx-<nome-da-task>

4. Trabalhe exclusivamente nesta branch.

==================================================
IMPLEMENTAÇÃO
==================================================

Implemente integralmente a task.

Utilize:

- implementation task;
- planning;
- código existente;
- contratos existentes;
- padrões utilizados na Fase 4.

Sempre preserve:

- arquitetura existente;
- compatibilidade;
- convenções do projeto;
- estilo do código.

Não implemente requisitos que não estejam presentes na implementation task ou no planning.

Caso encontre alguma ambiguidade que impeça uma implementação segura, interrompa a execução e explique exatamente o problema.

==================================================
VALIDAÇÃO CONTÍNUA
==================================================

Durante a implementação:

- execute builds sempre que necessário;
- execute os testes previstos pela própria task;
- corrija automaticamente erros de compilação;
- corrija automaticamente falhas de testes relacionadas à task.

Não ignore erros.

==================================================
AUTOAUDITORIA
==================================================

Antes de finalizar, faça uma autoauditoria completa.

Compare:

- implementation task;
- planning;
- código produzido.

Verifique:

- aderência ao planning;
- aderência à implementation task;
- critérios de aceite;
- regressões;
- compatibilidade;
- código morto;
- duplicações;
- TODOs esquecidos;
- tratamento de erros;
- nomenclatura;
- arquitetura;
- consistência com a Fase 4;
- consistência com implementações existentes.

Caso encontre problemas:

corrija-os antes de finalizar.

Repita esse ciclo até que não existam findings relevantes.

==================================================
VALIDAÇÃO FINAL
==================================================

Ao concluir:

1. Execute build completo.

2. Execute todos os testes previstos pela task.

3. Confirme que:

- build está verde;
- testes estão verdes;
- critérios de aceite foram atendidos;
- não existem erros de lint;
- não existem TODOs introduzidos;
- não existem arquivos temporários.

==================================================
GIT
==================================================

Após todas as validações:

1. Revise o git diff.

2. Organize alterações desnecessárias caso existam.

3. Gere commits pequenos e objetivos.

Mensagem de commit:

feat(phase-5): implement F5-XX <título>

==================================================
PULL REQUEST
==================================================

Ao finalizar:

Crie um Pull Request para a branch:

main

Título:

F5-XX - <Título>

Descrição:

## Objetivo

Implementação da implementation task F5-XX.

## Planning

- Phase 5 Technology Baseline Planning

## Task

- F5-XX

## Checklist

- [x] Build
- [x] Testes
- [x] Critérios de aceite
- [x] Autoauditoria concluída

Inclua também:

- resumo técnico das alterações;
- principais arquivos modificados;
- possíveis impactos;
- observações relevantes para o reviewer.

==================================================
RESTRIÇÕES
==================================================

- Não altere outras implementation tasks.
- Não altere o planning.
- Não implemente funcionalidades fora do escopo.
- Não faça refactors não relacionados.
- Não altere comportamento de fases anteriores sem necessidade.
- Não faça merge do Pull Request.
- Pare após criar o PR.

==================================================
RESULTADO
==================================================

Ao finalizar, informe:

- branch criada;
- commits realizados;
- arquivos modificados;
- testes executados;
- resultado da autoauditoria;
- link/identificador do Pull Request;
- pendências encontradas (caso existam).