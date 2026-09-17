# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

O NAAMIVE está sendo reconstruído a partir de uma base limpa. As verticais Necessidade e Projeto possuem documentação numerada, ciclo de vida, status, Resultados do Processo, Atores e Skills agênticas materializadas. A vertical Projeto foi desacoplada de qualquer vertical futura de trabalho descendente: sua formação é autocontida e termina no handoff ao Auditor do Projeto. Ainda não há instância de Projeto materializada.

## Necessidade ativa

`N-001 — NAAMIVE`

* Localização: `dados/necessidades/N-001/necessidade.md`
* Tipo: `NOVO_PRODUTO`
* Formação: concluída
* Resultado da auditoria: `QUALIFICAVEL`
* Qualificação: concluída
* Recomendação: `ASSUMIR_COMPROMISSO`
* Decisão humana de compromisso: `APROVADO`, registrada por `mhj`, identificador histórico do usuário autenticado que exerceu o Ator Owner no contexto atual
* Projeto: ainda não criado
* Transição obrigatória atual: `APROVADO` aciona o Especialista em Formação do Projeto; ele deverá executar o bootstrap do Projeto 1:1 e, somente após sua criação bem-sucedida em `EM_FORMACAO`, registrar a Necessidade em `EM_PROJETO`

`QUALIFICAVEL`, `ASSUMIR_COMPROMISSO` e `APROVADO` são Resultados do Processo, não status. A `N-001` não pode receber `EM_PROJETO` enquanto não existir o Projeto correspondente. A transição obrigatória ainda não foi materializada; não existe status intermediário para representar essa lacuna.

## Documentação definida

* `documentacao/atores/01_CONCEITO_DE_ATOR.md`
* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/necessidade/03_ATORES_DA_NECESSIDADE.md`
* `documentacao/necessidade/04_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/05_CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/06_STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/02_MODELO_DE_PROJETO.md`
* `documentacao/projeto/03_ATORES_DO_PROJETO.md`
* `documentacao/projeto/04_FORMACAO_DO_PROJETO.md`
* `documentacao/projeto/05_CICLO_DE_VIDA_DO_PROJETO.md`
* `documentacao/projeto/06_STATUS_DO_PROJETO.md`
* `documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md`

## Skills agênticas materializadas

Skills são manuais operacionais dos Atores agênticos, não fontes normativas do domínio. O agente deve carregar a Skill correspondente à responsabilidade que exerce, sem acumular o papel de outro Ator. Permanece válido o princípio “pastelero a tus pasteles”.

Existem seis Skills nesta versão:

* Necessidade:
  * `formacao-da-necessidade` em `.agents/skills/necessidade/formacao-da-necessidade/SKILL.md`;
  * `auditoria-da-necessidade` em `.agents/skills/necessidade/auditoria-da-necessidade/SKILL.md`; e
  * `qualificacao-da-necessidade` em `.agents/skills/necessidade/qualificacao-da-necessidade/SKILL.md`.
* Projeto:
  * `formacao-do-projeto` em `.agents/skills/projeto/formacao-do-projeto/SKILL.md`;
  * `auditoria-do-projeto` em `.agents/skills/projeto/auditoria-do-projeto/SKILL.md`; e
  * `verificacao-agregada-do-projeto` em `.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md`.

`Owner` não possui Skill por ser Ator humano. Nenhuma Skill genérica foi criada.

## Decisões estruturais atuais

* As verticais Necessidade e Projeto usam a sequência documental `01_DEFINICAO`, `02_MODELO`, `03_ATORES`, `04_FORMACAO`, `05_CICLO_DE_VIDA`, `06_STATUS` e `07_RESULTADOS_DO_PROCESSO`. A seção de organização documental em `AGENTS.md` formaliza que esses prefixos numéricos fazem parte obrigatória do nome dos arquivos das verticais estruturadas nesse padrão.
* `documentacao/atores/01_CONCEITO_DE_ATOR.md` define transversalmente Ator, Executor e Skill. Ator é o papel especializado responsável; Executor é quem o exerce concretamente; Skill é a capacidade especializada necessária para exercer um Ator agêntico.
* Skills agênticas podem ser materializadas como `SKILL.md` no repositório. Elas orientam a operação do Ator e não substituem a documentação normativa.
* Agentes exercem responsabilidades especializadas. Não existe agente genérico responsável por toda a cadeia do NAAMIVE: cada Ator agêntico possui fronteira clara, Skill principal correspondente, entrega seu resultado e encerra sua atuação naquele trabalho.
* O princípio é “pastelero a tus pasteles”: cada agente sabe qual responsabilidade exerce e não acumula papéis especializados sem necessidade. A aproximação atual é Ator agêntico especializado ≈ agente especializado ≈ Skill principal correspondente, sem impedir capacidades auxiliares futuras.
* `Owner` é Ator humano transversal, executado nesta versão pelo usuário autenticado. Não é papel configurável, grupo, perfil RBAC, ownership por entidade, permissão delegável, hierarquia, matriz de autoridade, aprovação por maioria nem modelo multiusuário.
* RBAC, ACL, delegação, grupos, papéis configuráveis, ownership por entidade, matriz de autoridade e multiusuário estão fora do escopo atual. Sua introdução exige revisão explícita do modelo de Owner.
* Os Atores da Necessidade são: Owner; Especialista em Formação da Necessidade; Auditor da Necessidade; e Especialista em Qualificação da Necessidade.
* Os Atores do Projeto são: Owner; Especialista em Formação do Projeto; Auditor do Projeto; e Verificador Agregado do Projeto.
* Não há conceito separado de responsável pelo Projeto nesta versão; a pendência anterior foi resolvida pelo modelo `Owner → usuário autenticado`.
* `documentacao/` contém definições e modelos; `dados/` contém instâncias reais administradas pelo NAAMIVE. Entidades operacionais devem possuir coleções próprias, e relações futuras devem ocorrer por identificadores, evitando aninhamento físico indevido.
* Produto, Necessidade e Projeto são conceitos distintos. Uma Necessidade com compromisso aprovado origina obrigatoriamente um único Projeto. Não há estado permanente entre `APROVADO` e `EM_PROJETO`.
* O Projeto nasce obrigatoriamente da Necessidade com compromisso humano `APROVADO`, em relação 1:1, e não de formulário vazio. `APROVADO` aciona o Especialista em Formação do Projeto, que é o primeiro Ator agêntico da vertical e realiza o bootstrap quando ainda não houver Projeto correspondente. Não existe Ator específico para criação, materialização ou transição de Projeto.
* O bootstrap é parte inicial da formação do Projeto. Ele materializa a instância em `EM_FORMACAO`; somente após a criação bem-sucedida a Necessidade assume `EM_PROJETO`. Se a materialização falhar, não há registro antecipado de `EM_PROJETO` nem status intermediário.
* No bootstrap, o Especialista em Formação do Projeto atribui o código conforme a convenção aplicável e propõe ou gera o nome inicial. O nome é editável pelo Owner e sua alteração não modifica o identificador técnico, o código nem o vínculo 1:1 com a Necessidade de origem.
* A formação do Projeto é autocontida: conduz `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO`, distinguindo fatos, inferências, propostas e incógnitas. Sua saída é o handoff ao Auditor do Projeto, sem exigir entidade, ciclo, status, decomposição ou materialização de trabalho descendente.
* `EM_MODULOS` foi removido. `EM_REALIZACAO` não existe e nenhum status substituto foi criado.
* O catálogo normativo de status do Projeto é composto exclusivamente por `EM_FORMACAO`, `CONCLUIDO` e `CANCELADO`. `CONCLUIDO` permanece como terminal conceitual futuro; `CANCELADO` é o terminal excepcional.
* O trecho atualmente definido do ciclo é: criação → `EM_FORMACAO` → formação → Auditor do Projeto → `FORMACAO_SUFICIENTE` → formação do Projeto aprovada → continuação operacional ainda não definida.
* `FORMACAO_SUFICIENTE` apenas aprova a formação do Projeto. Não cria status nem transição operacional; o próximo estado operacional do Projeto ainda será definido. `FORMACAO_INSUFICIENTE` mantém o Projeto em formação. Nenhum dos dois depende de entidade descendente.
* A verificação agregada não é status. `COMPROMISSO_ATENDIDO` e `COMPROMISSO_NAO_ATENDIDO` permanecem Resultados do Processo, mas seus efeitos operacionais ainda não foram definidos.
* Uma vertical futura poderá definir trabalho descendente que um Projeto possa originar. Ela não é pressuposta nem controlada pela vertical Projeto atual.
* Ainda não existe instância de Projeto, inclusive `P-001`. A `N-001` ainda não está em `EM_PROJETO`.

## Última atividade concluída

Foi corrigida a fronteira estrutural da vertical Projeto para remover seu acoplamento com trabalho descendente ainda não definido. A formação termina após `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO`, com handoff ao Auditor do Projeto. `EM_MODULOS` foi removido; `EM_REALIZACAO` não existe e nenhum status substituto foi criado. `FORMACAO_SUFICIENTE` apenas aprova a formação, e a continuação operacional permanece deliberadamente indefinida. Não foram criados `P-001` nem novos artefatos operacionais.

## Próxima ação

Executar o teste de fogo real da vertical Projeto com a `N-001`, usando a Skill `formacao-do-projeto`. Nesse teste, o Especialista em Formação do Projeto deverá executar o bootstrap real de `P-001`, registrar a Necessidade em `EM_PROJETO` somente após a criação bem-sucedida e conduzir `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO` até o handoff ao Auditor do Projeto.

## Bloqueios ou decisões pendentes

Não há bloqueio atual sobre responsável pelo Projeto, pois não existe esse conceito separado nesta versão. Permanecem pendentes o teste de fogo real que materializará o Projeto 1:1 da `N-001` e a definição independente de uma vertical para trabalho descendente, se ela vier a ser necessária.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/atores/01_CONCEITO_DE_ATOR.md`
* `.agents/skills/projeto/formacao-do-projeto/SKILL.md`
* `.agents/skills/projeto/auditoria-do-projeto/SKILL.md`
* `documentacao/necessidade/03_ATORES_DA_NECESSIDADE.md`
* `documentacao/necessidade/04_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/05_CICLO_DE_VIDA_DA_NECESSIDADE.md`
* `documentacao/necessidade/06_STATUS_DA_NECESSIDADE.md`
* `documentacao/necessidade/07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/03_ATORES_DO_PROJETO.md`
* `documentacao/projeto/04_FORMACAO_DO_PROJETO.md`
* `documentacao/projeto/05_CICLO_DE_VIDA_DO_PROJETO.md`
* `documentacao/projeto/06_STATUS_DO_PROJETO.md`
* `documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md`
* `dados/necessidades/N-001/necessidade.md`
