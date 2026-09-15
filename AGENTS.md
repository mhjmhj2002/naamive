# AGENTS.md — Regras para Agentes do NAAMIVE

## 1. Idioma obrigatório

Todo conteúdo produzido, mantido ou alterado por agentes no NAAMIVE deve utilizar **Português do Brasil (pt-BR)**.

Esta regra se aplica, entre outros, a:

* documentação;
* comunicação e relatórios dos agentes;
* nomes conceituais do domínio;
* estados;
* etapas;
* competências;
* papéis;
* decisões;
* descrições;
* mensagens destinadas a pessoas;
* comentários de código;
* textos de interface;
* novos artefatos criados pelo NAAMIVE.

Não devem ser criados novos termos em inglês quando existir forma adequada em Português do Brasil.

Termos impostos externamente por linguagens de programação, bibliotecas, protocolos, padrões, APIs, ferramentas ou nomes próprios podem ser preservados quando sua tradução alterar ou invalidar seu significado técnico.

Exemplos:

* `POST`, por ser método HTTP, permanece `POST`;
* `GitHub` permanece `GitHub`;
* palavras reservadas de uma linguagem permanecem como exigido pela linguagem;
* nomes de funções ou campos pertencentes a APIs externas permanecem como definidos pelo fornecedor.

Essa exceção não autoriza o uso de inglês para nomear conceitos próprios do NAAMIVE.

**Regra prática:** se o NAAMIVE controla o nome, o nome deve estar em Português do Brasil.

## 2. Leitura inicial obrigatória

Antes de executar qualquer atividade, o agente deve ler, nesta ordem:

1. `AGENTS.md`;
2. `README.md`;
3. `CONTINUIDADE_ATUAL.md`.

Depois disso, deve abrir somente os documentos e dados diretamente relevantes para a atividade recebida. O objetivo é evitar varredura desnecessária do repositório e consumo excessivo de contexto.

## 3. Continuidade obrigatória

Toda atividade agêntica deve terminar com a revisão e atualização de `CONTINUIDADE_ATUAL.md`.

Esse arquivo representa apenas a situação corrente; não deve se tornar histórico acumulativo. Ao final de cada atividade, ele deve permitir que um novo agente descubra rapidamente:

* onde estamos;
* qual entidade ou trabalho está ativo;
* o que acabou de ser concluído;
* o que ainda está pendente;
* qual é a próxima ação esperada;
* se existem bloqueios ou decisões pendentes; e
* quais arquivos são necessários para continuar.

Uma atividade não é considerada concluída enquanto `CONTINUIDADE_ATUAL.md` estiver desatualizado.

## 4. Índice vivo

Toda atividade agêntica deve revisar `README.md`, o índice principal do NAAMIVE.

Se a atividade criar, remover, mover, renomear ou substituir qualquer arquivo ou diretório relevante para navegação, o `README.md` deve ser atualizado na mesma atividade. Não o altere apenas para produzir mudança artificial quando a estrutura navegável não tiver mudado.

Uma atividade não é considerada concluída se o índice estiver incompatível com a estrutura produzida.

## 5. Estado atual não é histórico

Não utilize `CONTINUIDADE_ATUAL.md` como diário permanente. Reescreva-o conforme o trabalho avança.

Histórico futuro, caso necessário, deverá possuir mecanismo próprio. O arquivo de continuidade responde **onde estamos agora**, e não tudo que aconteceu desde o início.
