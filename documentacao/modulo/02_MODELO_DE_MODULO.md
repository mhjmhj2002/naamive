# Modelo de Módulo

## Finalidade

Este documento define a forma mínima de uma instância de Módulo identificável, rastreável e vinculada ao seu Projeto de origem. O registro principal esperado é `dados/modulos/<codigo>/modulo.md`.

## Estrutura conceitual

```text
Módulo
├── identificador técnico
├── código
├── nome
├── Projeto de origem
├── capacidade ou responsabilidade
├── fronteira inicial
├── relações e dependências relevantes
└── status
```

## Elementos mínimos

### Identificador técnico

Todo Módulo possui identidade técnica única. O modelo não define tecnologia, formato, persistência ou mecanismo físico de unicidade.

### Código legível e estável

Todo Módulo possui código legível e estável para referência operacional, no formato `M-<número sequencial com ao menos três algarismos>`, como `M-001`.

Antes de materializar um Módulo, o Especialista em Delimitação de Módulos consulta todos os códigos já registrados em `dados/modulos/`. Ele atribui o próximo número inteiro positivo acima do maior sufixo numérico já usado; na ausência de Módulos, atribui `M-001`. O código atribuído não pode ser reutilizado. Se uma verificação imediatamente anterior à materialização identificar colisão, o Especialista repete a consulta e atribui o próximo código disponível antes de registrar a instância.

### Nome

Todo Módulo possui nome compreensível que expresse sua capacidade ou responsabilidade. Alterar o nome não modifica sua identidade técnica, código nem Projeto de origem.

### Projeto de origem

Todo Módulo referencia exatamente um Projeto. A relação preserva a origem na Direção do Projeto, que é referência de entrada e não substitui o Projeto completo.

### Capacidade, responsabilidade e fronteira inicial

O registro declara a capacidade habilitada, a responsabilidade assumida e o que está dentro e fora de sua fronteira inicial. A delimitação não se justifica por camada tecnológica isolada; um mesmo Módulo pode abranger interface, API, domínio, persistência e integrações necessárias à sua capacidade.

### Relações e dependências relevantes

O registro identifica relações, dependências, possíveis sobreposições e lacunas relevantes com outros Módulos do mesmo Projeto. Enquanto preservada a identidade de cada Módulo, a revisão de delimitação pode corrigir capacidades, responsabilidades, fronteiras, nomes e relações, bem como materializar Módulo adicional. Caso a correção exija encerrar, fundir, eliminar conceitualmente ou substituir uma identidade, esse tratamento permanece lacuna normativa e exige decisão estrutural específica antes de prosseguir.

## Mapa de Módulos do Projeto

Antes da primeira materialização — e em toda revisão de delimitação posterior — o Especialista em Delimitação de Módulos cria ou atualiza o artefato próprio **Mapa de Módulos do Projeto**, localizado em `dados/projetos/<codigo-projeto>/mapa-de-modulos.md`. Esse arquivo é a fonte canônica da delimitação daquele Projeto e deve conter:

* referência à Direção do Projeto e às evidências consultadas;
* capacidades candidatas consideradas e a decisão de incluir, agrupar ou separar cada uma;
* o conjunto de Módulos delimitados, com a capacidade, fronteira inicial e justificativa de cada um;
* dependências, sobreposições e lacunas entre os Módulos;
* aplicação da heurística 10 / 15 / 20 e eventual justificativa fora da curva; e
* lacunas, decisões materiais e retornos estruturais, com seu tratamento ou encaminhamento.

O `projeto.md` referencia o arquivo canônico e pode registrar estado factual resumido, mas não duplica integralmente o Mapa. Cada `modulo.md` referencia o item que o justifica nesse arquivo. Um resumo em Módulo não substitui o Mapa canônico do Projeto.

## Formação e artefatos de apoio

Após materializado em `EM_FORMACAO`, o Módulo mantém a formação técnica e, quando aprovada, sua **Especificação Técnica do Módulo** em seção consolidada do `modulo.md`. A seção deve conter o núcleo invariável definido em [Definição do Módulo](01_DEFINICAO_DO_MODULO.md#artefato-de-saída).

Artefatos auxiliares — como diagramas, contratos, modelos de dados, decisões técnicas e especificações complementares — podem existir próximos ao registro quando necessários. Não há árvore rígida nem arquivos vazios obrigatórios; cada artefato deve ser referenciado pelo registro do Módulo e justificar sua utilidade.

## Limites deste modelo

Este modelo não define Entrega de Valor, Item de Trabalho, tarefa, tecnologias, banco de dados, APIs, diagramas ou persistência como elementos universais. Status e Resultados do Processo têm catálogos próprios.
