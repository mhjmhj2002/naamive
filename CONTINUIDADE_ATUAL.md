# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

O NAAMIVE está sendo reconstruído a partir de uma base limpa. A vertical Necessidade possui ciclo de vida, status e Resultados do Processo formalizados. A vertical Projeto possui definição conceitual, modelo mínimo, formação e ciclo de vida reorganizado. Ainda não há catálogo de status do Projeto, Resultados do Processo do Projeto, instância de Projeto ou Módulo materializado.

## Necessidade ativa

`N-001 — NAAMIVE`

* Localização: `dados/necessidades/N-001/necessidade.md`
* Tipo: `NOVO_PRODUTO`
* Formação: concluída
* Resultado da auditoria: `QUALIFICAVEL`
* Qualificação: concluída
* Recomendação: `ASSUMIR_COMPROMISSO`
* Decisão humana de compromisso: `APROVADO`, registrada por `mhj`, usuário responsável e criador identificado no contexto atual
* Projeto: ainda não criado
* Transição obrigatória atual: criação futura do Projeto 1:1 e, após sua existência, registro em `EM_PROJETO`

`QUALIFICAVEL`, `ASSUMIR_COMPROMISSO` e `APROVADO` são Resultados do Processo, não status. A `N-001` não pode receber `EM_PROJETO` enquanto não existir o Projeto correspondente. A transição obrigatória não foi materializada por ausência da instância de Projeto correspondente; não existe status intermediário para representar essa lacuna.

## Documentação definida

* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/necessidade/03_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/02_MODELO_DE_PROJETO.md`
* `documentacao/projeto/03_FORMACAO_DO_PROJETO.md`
* `documentacao/projeto/CICLO_DE_VIDA_DO_PROJETO.md`

## Decisões estruturais atuais

* `documentacao/` contém definições e modelos; `dados/` contém instâncias reais administradas pelo NAAMIVE.
* Entidades operacionais devem possuir coleções próprias, e relações futuras devem ocorrer por identificadores, evitando aninhamento físico indevido.
* Todo vocabulário controlado pelo NAAMIVE usa Português do Brasil.
* Produto, Necessidade e Projeto são conceitos distintos.
* Uma Necessidade com compromisso aprovado origina obrigatoriamente um único Projeto. Não há estado permanente entre `APROVADO` e `EM_PROJETO`.
* O Projeto nasce obrigatoriamente da Necessidade com compromisso humano `APROVADO`, em relação 1:1, e não de formulário vazio. A Necessidade permanece como fonte de verdade do compromisso de mudança.
* O Projeto transforma o compromisso recebido em direção realizável, organiza sua realização e conduz a decomposição até o nível de Módulo. Ele não define Entregas de Valor, Itens de Trabalho, tarefas ou o detalhamento interno de implementação de cada Módulo.
* A formação do Projeto conduz a compreensão e a decomposição até a materialização dos Módulos. Suas etapas e controles transversais estão concentrados em `documentacao/projeto/03_FORMACAO_DO_PROJETO.md`; o ciclo de vida não os duplica.
* O fluxo principal do Projeto é: criação → `EM_FORMACAO` → Módulos necessários materializados → `EM_MODULOS` → conclusão do trabalho necessário dos Módulos → verificação agregada → `CONCLUIDO`.
* `EM_MODULOS` substitui a proposta anterior `EM_MODULO`, pois um Projeto pode originar N Módulos e sua realização passa a ser conduzida por eles.
* Em `EM_MODULOS`, o Projeto permanece como entidade pai, agregadora e referência do compromisso. Ele não replica os status internos dos Módulos.
* A conclusão dos Módulos não conclui automaticamente o Projeto: a verificação agregada deve confirmar que o resultado atende ao compromisso da Necessidade. Se insuficiente, o Projeto permanece na condução pelos Módulos.
* `CONCLUIDO` é terminal de sucesso e permite que a Necessidade de origem transicione de `EM_PROJETO` para `ATENDIDA`.
* `CANCELADO` é terminal excepcional, dependente de decisão humana válida; o agente não pode cancelar unilateralmente.
* Não existem `STATUS_DO_PROJETO.md` nem `RESULTADOS_DO_PROCESSO_DO_PROJETO.md`. Seus catálogos serão formalizados separadamente, seguindo a separação já estabelecida na Necessidade.
* Ainda não existe instância de Projeto, inclusive `P-001`, nem Módulo materializado. Não há decisão conceitual sobre responsável pelo Projeto.

## Última atividade concluída

O ciclo de vida do Projeto foi reorganizado. O documento passou a descrever somente fluxo, eventos e transições, e referencia `03_FORMACAO_DO_PROJETO.md` para as etapas de formação e seus controles. Foram definidos conceitualmente `EM_FORMACAO`, `EM_MODULOS`, `CONCLUIDO` e `CANCELADO`, sem criar catálogos formais de status ou Resultados do Processo. Nenhuma instância de Projeto ou Módulo foi criada e a `N-001` não foi alterada.

## Próxima ação

Voltar ao brainstorm para definir `documentacao/projeto/STATUS_DO_PROJETO.md`, mantendo a separação entre status e Resultados do Processo.

## Bloqueios ou decisões pendentes

Não há decisão sobre responsável pelo Projeto. Permanecem pendentes os catálogos de status e de Resultados do Processo do Projeto, bem como a criação futura do Projeto 1:1 para a `N-001`.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/02_MODELO_DE_PROJETO.md`
* `documentacao/projeto/03_FORMACAO_DO_PROJETO.md`
* `documentacao/projeto/CICLO_DE_VIDA_DO_PROJETO.md`
* `dados/necessidades/N-001/necessidade.md`
