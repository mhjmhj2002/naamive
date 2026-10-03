# Planejamento e Decomposição da Realização

## Finalidade

Este documento define o processo de planejamento técnico e decomposição de uma Entrega de Valor em Itens de Trabalho. Ele estabelece as regras para transformar uma especificação de valor aprovada em um plano ordenado e acionável de engenharia de software, garantindo o início legítimo da Realização.

## Condição de Entrada

O planejamento técnico da realização somente pode ser iniciado quando:
1. a Entrega de Valor estiver no status `FORMADA` com Resultado do Processo `FORMACAO_SUFICIENTE` emitido pelo Auditor da Entrega de Valor (ou `EM_REALIZACAO` em caso de replanejamento causal); e
2. a Especificação da Entrega de Valor, a Especificação Técnica do Módulo proprietário e as Baselines Técnicas associadas estiverem acessíveis no repositório.

Não é permitido iniciar o planejamento sobre uma Entrega de Valor em `EM_FORMACAO` ou cujo resultado de auditoria seja `FORMACAO_INSUFICIENTE`.

## Princípios de Decomposição

A decomposição de uma Entrega de Valor em Itens de Trabalho deve obedecer aos seguintes princípios:

1. **Subordinação Estrita ao Escopo:** Não é permitido incluir trabalhos técnicos que não contribuam diretamente para a evolução prometida na Especificação da EV. O planejamento não é pretexto para refatorações alheias ou expansão furtiva de escopo.
2. **Respeito à Arquitetura Consolidada:** A arquitetura de alto nível, os limites do módulo e as escolhas de tecnologia já determinadas na Formação da EV e do Módulo devem ser respeitadas. O planejamento decompõe a solução, não a reinventa.
3. **Coesão e Atomicidade Técnica:** Cada Item de Trabalho deve ter um objetivo técnico claro e delimitado. Deve ser possível compilar, executar testes e avaliar a conclusão do item de forma independente ou sobre dependências explicitadas.
4. **Grafo Direcionado de Dependências (DAG):** As relações de precedência entre os Itens de Trabalho devem ser explícitas. Ciclos de dependência são estritamente proibidos.
5. **Critérios de Aceitação Verificáveis:** Cada item deve conter critérios técnicos objetivos de aceitação (ex: modelo X persistido com migração executada com sucesso; endpoint Y responde contrato Z; testes de unidade do serviço W com 100% de sucesso).

## Rito de Planejamento da Realização

O processo conduzido pelo **Especialista em Planejamento da Realização** segue as etapas:

```text
1. Leitura e Análise da Especificação da EV
   ├── Identificar contratos de dados, portas lógicas e integrações
   ├── Analisar requisitos de comportamento e regras invariantes
   └── Levantar componentes de código necessários (entidades, serviços, adaptadores, testes)

2. Estruturação do Grafo de Trabalho
   ├── Identificar itens fundamentais (esquemas de dados, modelos de domínio, migrações)
   ├── Identificar itens de lógica de negócio e regras de domínio
   ├── Identificar itens de exposição (controladores, endpoints, interfaces)
   ├── Identificar itens de integração e contratos externos
   └── Definir a ordem sequencial e dependências entre eles

3. Elaboração do Plano de Realização da Entrega de Valor
   └── Criar dados/entregas-de-valor/<EV>/plano-de-realizacao.md

4. Materialização dos Itens de Trabalho
   └── Criar dados/itens-de-trabalho/<IT>/item-de-trabalho.md para cada item planejado

5. Gatilho de Início da Realização da Entrega de Valor
   └── Atualizar o status da Entrega de Valor de FORMADA para EM_REALIZACAO no registro principal da EV e no Mapa do Módulo
```

## O Mecanismo de Início da Realização

A transição da Entrega de Valor de `FORMADA` para `EM_REALIZACAO` deixa de ser uma lacuna:
* **Gatilho Oficial:** A aprovação do `Plano de Realização da Entrega de Valor` pelo **Especialista em Planejamento da Realização** com a materialização dos seus Itens de Trabalho iniciais.
* **Ato de Transição:** O Especialista em Planejamento da Realização atualiza o registro principal `dados/entregas-de-valor/<EV>/entrega-de-valor.md` (e o Mapa do Módulo) para `EM_REALIZACAO`, registrando a referência ao Plano de Realização recém-criado.
* **Efeito:** A EV ingressa legitimamente em `EM_REALIZACAO`, autorizando a atribuição e execução dos Itens de Trabalho pelos Engenheiros de Software.

## Replanejamento Diante de Descoberta ou Bloqueio

Se durante a execução técnica um Engenheiro de Software encontrar impedimento (`EXECUCAO_IMPEDIDA`) que requeira alteração na estratégia de decomposição (por exemplo, necessidade de criar um item preliminar não previsto):
1. O Item de Trabalho impedido devolve a pendência ao Especialista em Planejamento da Realização.
2. O Especialista avalia se a questão é tratável no nível de decomposição local:
   * Se for meramente técnica/local: revisa o Plano de Realização, ajusta os itens e/ou cria um novo Item de Trabalho para sanar a pendência.
   * Se envolver quebra da Especificação da EV, de contratos do Módulo ou de regras de negócio: interrompe a realização e emite um retorno formal para o **Especialista em Formação da Entrega de Valor**. A Entrega de Valor permanece em `EM_REALIZACAO` (sem regressão de status), aguardando a atualização ou reauditoria da especificação conforme a governança de continuidade progressiva.
