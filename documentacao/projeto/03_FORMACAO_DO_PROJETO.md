# Formação do Projeto

## Finalidade e escopo

Este documento define o motor operacional que conduz um Projeto recém-criado até haver compreensão, estrutura e coerência suficientes para identificar, delimitar e materializar seus Módulos.

Ele não define ciclo de vida formal, catálogo de status ou catálogo de Resultados do Processo do Projeto. O [Ciclo de Vida do Projeto](CICLO_DE_VIDA_DO_PROJETO.md) permanece preservado e poderá ser reorganizado em trabalho posterior; esta é a fonte adequada para o processo de formação.

## Ponto de entrada

A formação começa com um Projeto já existente, criado obrigatoriamente a partir de uma Necessidade com compromisso aprovado. A formação não cria o Projeto: ela amadurece uma instância já criada.

Na entrada, o Projeto possui no mínimo:

* identificador técnico;
* código;
* nome; e
* Necessidade de origem.

A Necessidade de origem é a fonte de verdade do compromisso recebido. A formação deve preservá-lo e não pode redefinir silenciosamente seu problema ou oportunidade, resultado pretendido, escopo, fora de escopo, critério de atendimento, valor, contexto ou restrições conhecidos. Qualquer alteração material no compromisso exige tratamento explícito na relação com a Necessidade.

## Fluxo principal de formação

```text
ENQUADRAMENTO
→ DESCOBERTA
→ DIREÇÃO DA SOLUÇÃO
→ DECOMPOSIÇÃO EM MÓDULOS
```

Esses nomes representam etapas de formação. Eles não são status formais nesta definição.

## ENQUADRAMENTO

Pergunta central: **“O que este Projeto precisa realizar para cumprir a Necessidade de origem?”**

Nesta etapa, o agente deve:

* interpretar o compromisso recebido;
* compreender o objetivo e os limites do Projeto;
* identificar o que já é conhecido;
* identificar o que ainda precisa ser compreendido; e
* estabelecer a fronteira inicial do Projeto.

O enquadramento não deve fechar arquitetura, detalhar solução, criar Módulos prematuramente, criar Entregas de Valor ou criar Itens de Trabalho.

## DESCOBERTA

Pergunta central: **“O que precisamos compreender antes de decidir como realizar?”**

Conforme a necessidade, esta etapa pode:

* investigar o produto ou sistema existente;
* examinar documentação e evidências disponíveis;
* identificar integrações;
* identificar restrições;
* identificar dependências;
* compreender o contexto operacional;
* identificar riscos relevantes; e
* identificar incógnitas materiais.

O agente deve investigar autonomamente sempre que a informação puder ser obtida por evidência disponível. A pessoa usuária não deve ser usada como substituta para investigação que o agente pode realizar.

## Regra contra invenção

> A ausência de informação não pode ser substituída por invenção.

O conteúdo produzido durante a formação deve distinguir, quando aplicável, o que é:

* conhecido;
* inferido;
* proposto; ou
* desconhecido.

Conclusões materiais tratadas como fatos devem ter suporte identificável. Quando houver uma lacuna, o agente deve, nesta ordem:

1. investigar quando ela puder ser resolvida por evidência disponível;
2. registrar como proposta, e não como fato, uma alternativa possível; e
3. interagir com a pessoa usuária quando depender de informação essencial indisponível ou de decisão humana material.

## DIREÇÃO DA SOLUÇÃO

Pergunta central: **“Qual direção de solução permite atender o compromisso da Necessidade?”**

Esta etapa estabelece direção suficiente para a decomposição, sem pretender uma definição completa da solução. Ela pode:

* estabelecer a abordagem geral;
* registrar decisões estruturais necessárias;
* identificar grandes fronteiras;
* tratar restrições e dependências relevantes; e
* estabelecer princípios suficientes para permitir a decomposição.

Ela não deve detalhar toda a implementação, criar Entregas de Valor, criar Itens de Trabalho nem realizar a decomposição interna dos futuros Módulos.

## DECOMPOSIÇÃO EM MÓDULOS

Pergunta central: **“Quais Módulos precisam existir para realizar esta direção?”**

Nesta etapa, o agente deve:

* identificar os Módulos necessários;
* definir a responsabilidade geral de cada Módulo;
* definir as fronteiras entre Módulos;
* identificar relações ou dependências relevantes entre eles;
* preparar sua materialização; e
* materializar os Módulos quando a formação estiver adequada.

O Projeto para na fronteira conceitual de Módulo. Ele não define Entregas de Valor internas, Itens de Trabalho, tarefas nem o detalhamento interno de implementação de um Módulo.

## Motor transversal de condução

A formação é conduzida pelo seguinte mecanismo transversal em cada etapa:

```text
executar etapa
→ verificar qualidade e suficiência
→ identificar lacunas
→ tratar lacunas
→ verificar novamente
→ avançar somente quando houver condição suficiente
```

A formação não depende de coordenação manual contínua da pessoa usuária. O agente conduz autonomamente o fluxo sempre que houver informação e autoridade suficientes.

### Tratamento de lacunas

Quando a verificação encontrar um problema, o motor deve distinguir se há:

* lacuna resolvível por nova investigação;
* conclusão que precisa ser reformulada;
* hipótese que deve ser reclassificada como proposta;
* ausência de informação que pode permanecer explicitamente desconhecida;
* ausência de informação essencial que exige interação humana; ou
* decisão material que exige pessoa responsável.

Após o tratamento, deve ocorrer nova verificação antes de qualquer avanço.

### Interação humana

A participação humana ocorre por necessidade, não por ritual. Não há confirmação humana obrigatória ao final de cada etapa.

A pessoa usuária deve ser acionada quando:

* possuir informação essencial que não possa ser descoberta;
* for necessário esclarecer intenção ou compromisso material;
* houver decisão que o agente não possa tomar legitimamente; ou
* existirem alternativas relevantes cuja escolha seja material.

### Auditoria e verificação

Auditoria e verificação são controles transversais da formação, não uma quinta etapa. Elas avaliam se o material produzido é:

* coerente;
* suficientemente sustentado;
* compatível com a Necessidade de origem;
* suficiente para avançar;
* livre de invenções tratadas como fatos; e
* adequado ao limite da etapa atual.

Esta definição não cria nomes formais para resultados de auditoria nem catálogo de Resultados do Processo.

## Condição de saída da formação

A formação pode ser considerada concluída quando houver informação suficiente e coerente para:

* compreender como o compromisso será realizado em nível adequado;
* sustentar a direção da solução;
* identificar os Módulos necessários;
* compreender a responsabilidade geral e as fronteiras desses Módulos; e
* materializar os Módulos sem antecipar seu trabalho interno.

Quando os Módulos são materializados, o Projeto encerra sua responsabilidade direta de formação e decomposição. Isso não encerra a existência do Projeto: ele permanece como entidade pai, agregadora e referência do compromisso recebido da Necessidade.

## Limites desta definição

Esta definição não estabelece:

* status do Projeto;
* Resultados do Processo formais;
* nomes formais de resultados de auditoria;
* responsável pelo Projeto;
* encerramento final do Projeto;
* sucesso ou cancelamento;
* aceite final;
* modelo de Módulo;
* ciclo interno do Módulo;
* Entregas de Valor;
* Itens de Trabalho;
* tarefas; ou
* implementação técnica do motor.
