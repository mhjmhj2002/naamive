# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

O NAAMIVE está sendo reconstruído a partir de uma base limpa. A vertical Necessidade possui ciclo de vida, status e Resultados do Processo formalizados, inclusive os caminhos de não caracterização, recomendação negativa e cancelamento humano. A vertical Projeto possui sua definição conceitual e um ciclo de vida inicial que ainda precisa ser reorganizado posteriormente; não há modelo, status, Resultados do Processo ou instância materializados.

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

`QUALIFICAVEL`, `ASSUMIR_COMPROMISSO` e `APROVADO` são Resultados do Processo, não status. A `N-001` não pode receber `EM_PROJETO` enquanto não existir o Projeto correspondente. A transição obrigatória não foi materializada por ausência da entidade Projeto e de seu modelo; não existe status intermediário para representar essa lacuna.

## Documentação definida

* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/necessidade/03_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/CICLO_DE_VIDA_DO_PROJETO.md`

## Decisões estruturais atuais

* `documentacao/` contém definições e modelos.
* `dados/` contém instâncias reais administradas pelo NAAMIVE.
* Entidades operacionais devem possuir coleções próprias.
* Relações futuras entre entidades devem ocorrer por identificadores, evitando aninhamento físico indevido.
* Todo vocabulário controlado pelo NAAMIVE usa Português do Brasil.
* Produto, Necessidade e Projeto são conceitos distintos.
* Uma Necessidade com compromisso aprovado origina obrigatoriamente um único Projeto.
* Não há estado permanente entre a decisão `APROVADO` e `EM_PROJETO`.
* `NAO_CARACTERIZA_NECESSIDADE` não autoriza encerramento unilateral pelo agente; pode levar a tratamento na formação ou a `CANCELAMENTO_APROVADO` por decisão humana.
* `NAO_ASSUMIR_COMPROMISSO` é recomendação do agente e não cancela automaticamente a Necessidade.
* Nesta primeira versão, o usuário responsável é o criador da Necessidade; decisões humanas materiais registram a decisão e o usuário autenticado que as realizou, sem papéis ou matriz de permissões.
* O Projeto nasce obrigatoriamente da Necessidade com compromisso humano `APROVADO`, em relação 1:1, e não de formulário vazio.
* A Necessidade permanece como fonte de verdade do compromisso de mudança; o Projeto não redefine silenciosamente seu problema, resultado, escopo, fora de escopo, critério de atendimento, valor, contexto ou restrições conhecidos.
* O Projeto transforma o compromisso recebido em direção realizável, organiza sua realização e conduz a decomposição até o nível de Módulo.
* O Projeto identifica, delimita e materializa Módulos, mas não define Entregas de Valor, Itens de Trabalho, tarefas ou o detalhamento interno de implementação de cada Módulo.
* A materialização dos Módulos encerra a responsabilidade direta do Projeto de formação e decomposição, sem encerrar a existência do Projeto como entidade pai, agregadora e referência do compromisso.
* O ciclo inicial conceitual do Projeto é `ENQUADRAMENTO` → `DESCOBERTA` → `DIREÇÃO DA SOLUÇÃO` → `DECOMPOSIÇÃO EM MÓDULOS`; esses nomes ainda não são status formais.
* O ciclo de vida atual do Projeto foi registrado antes de sua definição conceitual e deverá ser reorganizado em atividade posterior. `EM_MODULO` foi proposto apenas como equivalente conceitual de `EM_PROJETO` na Necessidade; não há catálogo de status do Projeto.
* A ausência de informação não pode ser substituída por invenção: o agente deve distinguir conteúdo conhecido, inferido, proposto e desconhecido, e acionar a pessoa usuária para informação essencial indisponível ou decisão humana material.
* Auditoria e verificação são controles transversais, não uma quinta fase do ciclo do Projeto.
* Ainda não existe Projeto criado para `N-001`. Não há modelo ou instância de Projeto, o que impede materializar a transição obrigatória para `EM_PROJETO`.

## Última atividade concluída

A definição conceitual do Projeto foi criada. Ela formaliza sua origem obrigatória e 1:1 em Necessidade com compromisso aprovado, o compromisso que permanece sob fonte de verdade da Necessidade, a responsabilidade de direção e decomposição até Módulos, os limites diante das entidades descendentes, sua permanência como agregador e sua distinção de Produto. Não foram criados modelo, status, Resultados do Processo, instância de Projeto ou Módulo. O ciclo de vida já existente foi preservado e deverá ser reorganizado posteriormente.

## Próxima ação

Definir o Modelo de Projeto, seguindo a mesma ordem usada na vertical Necessidade. A reorganização posterior de `documentacao/projeto/CICLO_DE_VIDA_DO_PROJETO.md` deverá considerar a definição conceitual agora formalizada, sem antecipar status, Resultados do Processo, Módulos, Entregas de Valor ou Itens de Trabalho.

## Bloqueios ou decisões pendentes

Nenhum bloqueio conhecido para definir o Modelo de Projeto. A reorganização do ciclo de vida atual permanece como trabalho posterior.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/necessidade/03_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/CICLO_DE_VIDA_DO_PROJETO.md`
* `dados/necessidades/N-001/necessidade.md`
