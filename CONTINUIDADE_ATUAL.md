# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

O NAAMIVE está sendo reconstruído a partir de uma base limpa. A vertical Necessidade possui agora ciclo de vida, status e Resultados do Processo formalizados. A próxima vertical necessária é Projeto.

## Necessidade ativa

`N-001 — NAAMIVE`

* Localização: `dados/necessidades/N-001/necessidade.md`
* Tipo: `NOVO_PRODUTO`
* Formação: concluída
* Resultado da auditoria: `QUALIFICAVEL`
* Qualificação: concluída
* Recomendação: `ASSUMIR_COMPROMISSO`
* Decisão humana de compromisso: `APROVADO`
* Projeto: ainda não criado
* Transição obrigatória atual: criação do Projeto 1:1 e, após sua existência, registro em `EM_PROJETO`

`QUALIFICAVEL`, `ASSUMIR_COMPROMISSO` e `APROVADO` são Resultados do Processo, não status. A `N-001` não pode receber `EM_PROJETO` enquanto não existir o Projeto correspondente. A transição obrigatória não foi materializada por ausência da entidade Projeto e de seu modelo; não existe status intermediário para representar essa lacuna.

## Documentação definida

* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/necessidade/03_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`

## Decisões estruturais atuais

* `documentacao/` contém definições e modelos.
* `dados/` contém instâncias reais administradas pelo NAAMIVE.
* Entidades operacionais devem possuir coleções próprias.
* Relações futuras entre entidades devem ocorrer por identificadores, evitando aninhamento físico indevido.
* Todo vocabulário controlado pelo NAAMIVE usa Português do Brasil.
* Produto, Necessidade e Projeto são conceitos distintos.
* Uma Necessidade com compromisso aprovado origina obrigatoriamente um único Projeto.
* Não há estado permanente entre a decisão `APROVADO` e `EM_PROJETO`.
* Ainda não existe Projeto criado para `N-001`, pois a entidade Projeto e seu modelo ainda não foram definidos; isso impede materializar a transição obrigatória.

## Última atividade concluída

Ciclo de vida, catálogo de status e catálogo de Resultados do Processo da Necessidade formalizados. A situação da `N-001` foi reavaliada: possui `APROVADO`, mas ainda aguarda a materialização obrigatória da criação de seu Projeto 1:1 por ausência da entidade Projeto.

## Próxima ação

Definir a entidade Projeto e seu modelo mínimo para permitir que a `N-001` origine seu Projeto 1:1 e complete a transição obrigatória para `EM_PROJETO`.

## Bloqueios ou decisões pendentes

Nenhum bloqueio conhecido para continuar a definição da vertical Necessidade.

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
* `dados/necessidades/N-001/necessidade.md`
