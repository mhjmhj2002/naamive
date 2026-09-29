# Débitos e Continuidade Progressiva

## Finalidade

Este documento estabelece uma regra normativa transversal para o tratamento de lacunas descobertas tardiamente no NAAMIVE. Ela se aplica à governança do próprio NAAMIVE e a toda a cadeia de condução da demanda, atual ou futura, sem substituir os ciclos de vida, os catálogos de Status, os Resultados do Processo ou as competências específicas de cada vertical.

## Princípio de continuidade progressiva

O NAAMIVE evolui progressivamente. Uma lacuna descoberta depois do ponto em que idealmente deveria ter sido tratada não faz a entidade, o processo ou a condução operacional retornar automaticamente a uma vertical ou a um Status anterior.

Uma descoberta posterior:

* não desfaz marcos validamente alcançados;
* não provoca regressão automática de Status;
* não reabre automaticamente vertical anterior;
* não altera retroativamente o histórico; e
* não transforma encaminhamento causal para tratamento em retorno do ciclo.

Por exemplo, se um Projeto identificar lacuna cuja origem ou competência pertença à Necessidade, o Projeto permanece a posição corrente da demanda:

```text
Projeto
→ descoberta da lacuna
→ proposta de Débito com origem ou competência na Necessidade
→ tratamento no ponto competente
→ continuidade do Projeto
```

Não há, por esse motivo, retorno operacional de `Projeto` para `Necessidade`. O mesmo princípio se aplica transversalmente a Módulo, Entrega de Valor e às verticais futuras que venham a ser definidas.

## Conceito de Débito

Débito é uma lacuna relevante reconhecida após o ponto em que idealmente deveria ter sido resolvida, ou uma lacuna identificada na própria governança do NAAMIVE. Ele permite registrar e tratar a pendência sem falsificar a posição atual do ciclo.

O lugar onde a lacuna foi descoberta não precisa ser o lugar de sua origem ou de sua competência de tratamento. Assim, uma Entrega de Valor pode identificar Débito cuja origem esteja no Módulo ou no Projeto e permanecer em seu Status validamente alcançado.

Neste momento, Débito é somente uma opção conceitual de tratamento. Este documento não cria entidade física, instância, identificador, arquivo operacional ou catálogo de Status para Débito.

## Naturezas conceituais iniciais

### Débito de Governança

É a lacuna, ambiguidade, inconsistência ou insuficiência encontrada nas regras, na documentação ou na governança do próprio NAAMIVE. Seu tratamento busca corrigir ou aperfeiçoar a governança normativa, inclusive para utilizações futuras.

### Débito da Demanda

É a lacuna pertencente à condução de uma demanda concreta, cuja origem ou competência de tratamento pertença a algum ponto de sua cadeia. Pode, por exemplo, pertencer à Necessidade, ao Projeto, ao Módulo, à Entrega de Valor ou a vertical futura quando ela existir.

Essas naturezas não criam subclasses, enumerações físicas por vertical nem mecanismos de armazenamento.

## Identificação, proposta e decisão humana

Um Ator agêntico pode identificar possível lacuna, fundamentá-la, indicar onde entende estar sua origem, indicar o impacto observado, propor a criação de Débito e sugerir se a pendência pode impedir avanço.

Essa percepção não transforma unilateralmente a lacuna em Débito válido. A proposta depende de revisão e decisão humana competente:

```text
Ator agêntico identifica
→ propõe Débito
→ revisão humana
→ proposta procede ou não procede
```

Se a proposta não proceder, ela é descartada e não produz efeitos no ciclo. Se proceder, o Débito é reconhecido para tratamento. As expressões usadas nesse fluxo são descritivas: não constituem Status de Débito.

## Impacto sobre a continuidade

### Débito bloqueante

Débito reconhecido é bloqueante quando sua resolução é necessária para ultrapassar o próximo marco que dele depende. O bloqueio impede esse avanço, mas não provoca regressão: a entidade ou vertical permanece na posição já validamente alcançada até o tratamento da pendência.

Por exemplo, um Projeto em `EM_FORMACAO` com Débito bloqueante cuja origem pertença à Necessidade não retorna à formação da Necessidade. O Projeto permanece em `EM_FORMACAO` e não ultrapassa o marco afetado enquanto o Débito for tratado no ponto competente.

### Débito não bloqueante

Débito reconhecido é não bloqueante quando deve ser tratado, mas não impede a continuidade da condução atual. O trabalho pode prosseguir enquanto a pendência permanece em tratamento.

Esta classificação não cria mecanismo físico de bloqueio, prioridade, severidade, prazo ou fluxo de resolução.

## Posição atual e competência de tratamento

A posição atual do ciclo e a origem ou competência de tratamento do Débito são informações distintas. O tratamento ocorre no ponto competente, inclusive quando ele pertence a vertical anterior, sem transportar o ciclo atual de volta a esse ponto.

O tratamento pode corrigir artefatos, decisões ou documentação pertinente. O mecanismo operacional específico de encaminhamento, alteração, bloqueio, conclusão ou registro permanece não definido e não pode ser presumido por esta regra.

## Relação com Status e Resultados do Processo

Os três conceitos permanecem distintos:

| Conceito | Finalidade |
| --- | --- |
| Status | Registra a posição validamente alcançada no ciclo. |
| Resultado do Processo | Registra conclusão, determinação ou decisão produzida por atividade competente. |
| Débito | Registra pendência reconhecida que precisa de tratamento. |

Débito não é Status e não é Resultado do Processo. Resultado negativo não cria Débito automaticamente: uma atividade pode identificar lacuna e originar proposta de Débito, que somente produzirá efeitos após decisão humana competente. A existência de Débito reconhecido também não provoca regressão automática de Status.

## Fronteiras desta regra

Esta regra não define entidade física completa de Débito, identificadores, instâncias, estrutura em `dados/`, persistência, banco de dados, API, Status formais, ciclo de vida, Skills, atribuição a pessoas ou Atores agênticos, prioridade, severidade, prazo, SLA, fluxo de resolução, mecanismo de fechamento, mecanismo físico de bloqueio ou automações.

Esses elementos permanecem para modelagem futura. A regra atual estabelece exclusivamente a continuidade progressiva e a possibilidade conceitual de tratar lacunas reconhecidas por meio de Débitos.
