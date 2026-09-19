# Formação do Projeto

## Finalidade e escopo

Este documento define o motor operacional que conduz um Projeto recém-criado até haver compreensão, direção e coerência suficientes para auditoria de sua formação.

Ele não define ciclo de vida formal, catálogo de status ou catálogo de Resultados do Processo do Projeto. O [Ciclo de Vida do Projeto](05_CICLO_DE_VIDA_DO_PROJETO.md) é a fonte adequada para o ciclo; este documento é a fonte adequada para o processo de formação. Os Atores e suas responsabilidades estão definidos em [Atores do Projeto](03_ATORES_DO_PROJETO.md).

## Ponto de entrada

A formação é acionada pelo `APROVADO` de uma Necessidade. O Especialista em Formação do Projeto é o primeiro Ator agêntico nessa passagem e atua em um de dois cenários:

* **Bootstrap:** a Necessidade possui `APROVADO` e ainda não existe o Projeto 1:1. O Especialista confirma essas condições, materializa o Projeto, atribui código conforme a convenção aplicável, propõe ou gera o nome inicial, preserva o vínculo com a Necessidade de origem e faz o Projeto nascer em `EM_FORMACAO`. Somente após essa materialização bem-sucedida a Necessidade assume `EM_PROJETO`.
* **Formação existente:** o Projeto já existe em `EM_FORMACAO`. O Especialista segue diretamente com a formação ordinária.

O bootstrap é parte inicial da responsabilidade de formação, não uma etapa formal, status, Resultado do Processo ou responsabilidade de outro Ator. Se a materialização falhar, não se registra antecipadamente `EM_PROJETO` na Necessidade.

Depois do bootstrap, ou na entrada de uma formação já existente, o Projeto possui no mínimo:

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
→ handoff para Auditor do Projeto
```

Os três primeiros nomes representam etapas de formação. O handoff é a entrega do material formado para avaliação independente. Nenhum desses elementos é status formal nesta definição.

## ENQUADRAMENTO

Pergunta central: **“O que este Projeto precisa realizar para cumprir a Necessidade de origem?”**

Nesta etapa, o Especialista em Formação do Projeto deve:

* interpretar o compromisso recebido;
* compreender o objetivo e os limites do Projeto;
* identificar o que já é conhecido;
* identificar o que ainda precisa ser compreendido; e
* estabelecer a fronteira inicial do Projeto.

O enquadramento não deve fechar arquitetura, detalhar toda a solução, criar trabalho descendente prematuramente nem criar itens de execução.

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

O Especialista em Formação do Projeto deve investigar autonomamente sempre que a informação puder ser obtida por evidência disponível. O Owner não deve ser usado como substituto para investigação que o Especialista pode realizar.

## Regra contra invenção

> A ausência de informação não pode ser substituída por invenção.

O conteúdo produzido durante a formação deve distinguir, quando aplicável, o que é:

* conhecido;
* inferido;
* proposto; ou
* desconhecido.

Conclusões materiais tratadas como fatos devem ter suporte identificável. Quando houver uma lacuna, o Especialista em Formação do Projeto deve, nesta ordem:

1. investigar quando ela puder ser resolvida por evidência disponível;
2. registrar como proposta, e não como fato, uma alternativa possível; e
3. recorrer ao Owner quando depender de informação essencial indisponível ou de decisão humana material.

## DIREÇÃO DA SOLUÇÃO

Pergunta central: **“Qual direção de solução permite atender o compromisso da Necessidade?”**

Esta etapa estabelece direção suficiente para orientar a realização do Projeto, sem pretender uma definição completa da solução. Ela pode:

* estabelecer a abordagem geral;
* registrar decisões estruturais necessárias;
* identificar fronteiras relevantes;
* tratar restrições e dependências relevantes; e
* registrar riscos, propostas e incógnitas que permaneçam.

Ela não deve detalhar toda a implementação, criar trabalho descendente, definir estruturas de entidades futuras nem antecipar itens de execução.

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

A formação não depende de coordenação manual contínua do Owner. O Especialista em Formação do Projeto conduz autonomamente o fluxo sempre que houver informação e autoridade suficientes.

### Tratamento de lacunas

Quando a verificação encontrar um problema, o motor deve distinguir se há:

* lacuna resolvível por nova investigação;
* conclusão que precisa ser reformulada;
* hipótese que deve ser reclassificada como proposta;
* ausência de informação que pode permanecer explicitamente desconhecida;
* ausência de informação essencial que exige interação humana; ou
* decisão material que exige o Owner.

Após o tratamento, deve ocorrer nova verificação antes de qualquer avanço.

### Interação humana

A participação humana ocorre por necessidade, não por ritual. Não há confirmação humana obrigatória ao final de cada etapa.

O Owner deve ser acionado quando:

* possuir informação essencial que não possa ser descoberta;
* for necessário esclarecer intenção ou compromisso material;
* houver decisão que o Especialista em Formação do Projeto não possa tomar legitimamente; ou
* existirem alternativas relevantes cuja escolha seja material.

### Auditoria e verificação

Auditoria e verificação são controles distintos. O Auditor do Projeto avalia a formação entregue e produz seus Resultados do Processo. O ponto de entrada futuro do Verificador Agregado do Projeto não é definido por esta formação nem pelo trecho atual do ciclo.

A auditoria de formação avalia se o material produzido é:

* coerente;
* suficientemente sustentado;
* compatível com a Necessidade de origem;
* suficiente para aprovar a formação;
* livre de invenções tratadas como fatos; e
* adequado às fronteiras do Projeto.

Esta definição não cria nomes formais para resultados de auditoria nem catálogo de Resultados do Processo.

## Condição de saída da formação

A formação pode ser entregue ao Auditor do Projeto quando houver informação suficiente e coerente para responder:

* qual compromisso da Necessidade este Projeto recebe;
* o que o Projeto precisa realizar;
* quais são suas fronteiras;
* qual contexto precisa ser compreendido;
* quais restrições e dependências existem;
* qual direção de solução é adequada; e
* quais decisões, propostas, incógnitas e riscos permanecem.

A formação não exige a definição, a identificação, a decomposição, a materialização, o status ou o ciclo de vida de qualquer entidade descendente. O Especialista encerra sua atuação com o handoff ao Auditor do Projeto.

Quando o Resultado do Processo `FORMACAO_SUFICIENTE` for produzido pelo Auditor, a formação aprovada deve estar identificável no registro como **Direção do Projeto**. Esse artefato consolida o compromisso recebido, objetivo, fronteiras, contexto, restrições, dependências, riscos, direção proposta e classificações entre conhecido, inferido, proposto e desconhecido. Ele é o contrato de passagem para o Especialista em Delimitação de Módulos, da vertical Módulo, não o próprio Resultado do Processo e não uma especificação detalhada de realização.

## Limites desta definição

Esta definição não estabelece:

* status do Projeto;
* Resultados do Processo formais;
* nomes formais de resultados de auditoria;
* Owner como campo da instância;
* encerramento final do Projeto;
* sucesso ou cancelamento;
* aceite final;
* modelo, ciclo ou status de entidade descendente;
* Entregas de Valor;
* Itens de Trabalho;
* tarefas; ou
* implementação técnica do motor.
