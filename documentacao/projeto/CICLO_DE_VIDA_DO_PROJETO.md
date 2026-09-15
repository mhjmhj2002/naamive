# Ciclo de Vida do Projeto

## Finalidade e escopo

Este documento registra somente os conceitos já definidos para o trecho inicial do ciclo de vida do Projeto. Não define modelo de dados, catálogo de status, Resultados do Processo, instâncias de Projeto, Módulos, Entregas de Valor ou Itens de Trabalho.

O Projeto é o esforço finito criado para atender uma Necessidade aprovada. Ele permanece existente depois que seus Módulos começam a ser conduzidos.

## Origem do Projeto

Uma Necessidade com compromisso humano `APROVADO` origina obrigatoriamente exatamente um Projeto:

```text
1 Necessidade aprovada
→ 1 Projeto
```

O Projeto nasce da Necessidade aprovada; não começa por um novo formulário vazio preenchido pela pessoa usuária. A criação deverá ser implementada futuramente de forma atômica ou recuperável, preservando a relação 1:1. Este documento não define como essa implementação ocorrerá.

## Formação inicial do Projeto

Inicialmente, o Projeto percorre as quatro fases conceituais abaixo, nesta ordem:

```text
ENQUADRAMENTO
→ DESCOBERTA
→ DIREÇÃO DA SOLUÇÃO
→ DECOMPOSIÇÃO EM MÓDULOS
```

Esses nomes descrevem fases conceituais; não constituem, por si, status formais.

### ENQUADRAMENTO

Pergunta central: **“Que Projeto nasceu desta Necessidade?”**

Esta fase interpreta o compromisso recebido, o objetivo, o resultado esperado, os limites, o contexto conhecido e as lacunas. Ela não pode definir solução, arquitetura, Módulos ou trabalho executável.

### DESCOBERTA

Pergunta central: **“O que precisamos compreender antes de decidir como realizar?”**

Esta fase pode investigar o contexto, o produto existente, os sistemas, as restrições, as dependências, os riscos e os desconhecidos relevantes. Ela não pode fechar solução, arquitetura nem decompor o Projeto em Módulos.

### DIREÇÃO DA SOLUÇÃO

Pergunta central: **“Qual caminho de solução faz sentido para atender a Necessidade?”**

Esta fase pode propor e analisar abordagens de alto nível e as decisões estruturais necessárias. Ela deve chegar somente ao nível suficiente para permitir a decomposição do Projeto. Não deve detalhar toda a implementação nem criar Entregas de Valor ou Itens de Trabalho.

### DECOMPOSIÇÃO EM MÓDULOS

Pergunta central: **“Em quais grandes partes coerentes este Projeto precisa ser dividido?”**

Esta fase pode identificar os Módulos necessários e justificar suas fronteiras. Ela deve parar no nível de Módulo e não pode avançar para Entrega de Valor nem Item de Trabalho.

## Fronteira da formação do Projeto

O trecho inicial de formação do Projeto termina quando o primeiro Módulo é materializado. A partir desse ponto, conceitualmente, o Projeto passa a ser conduzido por seus Módulos.

Foi proposto `EM_MODULO` como equivalente conceitual de `EM_PROJETO` na Necessidade. Este é apenas um registro conceitual: não há, neste momento, catálogo formal de status do Projeto. A criação de Módulos não encerra o Projeto.

## Participação humana

Não há ritual de aprovação humana em toda fase. O agente deve investigar e trabalhar autonomamente tudo que estiver dentro de sua competência. A pessoa usuária é chamada quando houver informação essencial que não possa ser descoberta ou quando existir decisão humana material.

Decisões humanas não podem ser substituídas pelo agente.

## Princípio contra invenção

> A ausência de informação não pode ser substituída por invenção.

O agente deve distinguir explicitamente o que é:

* conhecido;
* inferido;
* proposto; ou
* desconhecido.

Afirmações materiais devem possuir origem identificável. Diante de uma lacuna, o agente deve:

1. tentar descobrir por evidência;
2. quando aplicável, registrar uma alternativa como proposta, e não como fato; e
3. solicitar interação humana quando depender de conhecimento ou decisão humana.

A auditoria ou revisão deve impedir o avanço quando uma conclusão material estiver sendo tratada como fato sem sustentação.

## Auditoria e verificação transversal

Auditoria ou verificação não é, por enquanto, uma quinta fase do ciclo. Ela atua como controle transversal:

```text
produção ou refinamento
→ verificação
→ se insuficiente, investigação, retrabalho ou interação humana conforme a causa
→ nova verificação
→ avanço quando suficiente
```

Este documento não define catálogo formal de resultados de auditoria.

## Hierarquia de referência

Para contextualizar a fronteira do Projeto, a hierarquia conceitual é:

```text
Necessidade (1)
→ Projeto (1)
→ Módulo (N)
→ Entrega de Valor (N)
→ Item de Trabalho (N)
```

O modelo interno das entidades abaixo de Projeto não é definido aqui.
