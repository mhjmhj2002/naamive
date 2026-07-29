# Política de Contribuição Git por Agentes

Esta política é obrigatória para todos os agentes do NAAMIVE. Um agente produz uma iteração rastreável e atômica; ele não mistura mudanças de outros escopos nem altera diretamente a branch `main`.

## Branch de trabalho obrigatória

A [convenção de branches](BRANCH_NAMING_CONVENTION.md) determina o único nome válido para cada item de trabalho e escopo. Antes de qualquer escrita, o agente resolve esse nome pelo contexto e o procura tanto localmente quanto nas referências remotas configuradas.

Se a branch local existir, o agente a utiliza. Se existir somente no remoto, o agente cria ou utiliza uma referência local de acompanhamento, sem criar uma segunda branch. Somente se ela não existir em nenhum lugar o agente pode criar exatamente o nome canônico e apenas a partir da base autorizada pelo contexto. Uma branch de nome divergente para o mesmo escopo é impedimento e exige revisão humana.

Um agente nunca faz commit em `main`, não altera sua proteção e não faz merge, rebase, force-push ou push sem autorização explícita.

## Protocolo da iteração

1. Validar contexto, despacho e `allowed_write_paths`.
2. Resolver a branch canônica, verificar referências locais e remotas, e confirmar que a branch atual é a correta e não é `main`.
3. Inspecionar `git status --short`. Mudança fora do escopo autorizado é impedimento: o agente não a adiciona, altera ou remove.
4. Executar o trabalho somente nos caminhos autorizados.
5. Verificar o diff, executar as validações requeridas e executar `git diff --check`.
6. Adicionar ao índice somente os arquivos produzidos ou ajustados pelo próprio agente e permitidos pelo despacho.
7. Criar um commit atômico ao final da iteração, contendo um único objetivo rastreável.
8. Registrar no resultado da execução a branch, o hash do commit, os caminhos incluídos e as evidências de validação.

## Mensagem mínima de commit

```text
agent(<agent-id>): <ação objetiva>

Execution: <execution-id>
Work-item: <authorized-work-item>
Scope: <project-id>[/<module-id>]
```

O commit não pode incluir segredos, arquivos de ambiente local, dependências não autorizadas, formatação incidental ampla ou mudanças sem relação com o item de trabalho.

## Proibições

- Não fazer commit em `main`.
- Não usar `git add .`, `git add -A` ou staging abrangente quando houver arquivos fora do escopo.
- Não incluir mudanças de outro agente, humano, projeto ou módulo.
- Não sobrescrever, descartar ou reverter trabalho alheio para limpar a árvore.
- Não criar, atualizar ou mesclar pull request sem autorização humana explícita.
- Não afirmar que uma iteração foi concluída se não houver commit ou se o commit falhar.

Em caso de conflito, alteração não pertencente ao agente, branch incorreta, validação falha ou autorização ausente, o agente deve parar, preservar o estado e registrar o impedimento para revisão humana.
