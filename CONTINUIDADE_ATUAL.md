# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A delimitação inicial e a formação técnica dos cinco Módulos do P-001 foram concluídas com Especificações Técnicas aprovadas por auditoria independente. A sequência normativa principal `01–07` da vertical Entrega de Valor e suas quatro Skills principais estão materializadas.

Ocorreu intervenção material obrigatória de arquitetura pelo **Owner**: o produto NAAMIVE deve ser desenvolvido em **Node.js (TypeScript)** com **PostgreSQL**, dotado de interface web responsiva e worker em background para execução contínua, revogando expressamente a presunção indevida anterior de Java 21 / Spring Boot.

Em cumprimento legítimo a essa decisão soberana:
1. Os artefatos da camada de realização atrelados à baseline anterior foram expurgados (`dados/entregas-de-valor/EV-001/plano-de-realizacao.md` e o diretório `dados/itens-de-trabalho/`);
2. A instância `EV-001` retornou ao estado de formação e teve sua Especificação de Arquitetura e Decisões Técnicas formalmente readequada para a stack Node.js/TypeScript/PostgreSQL com worker desacoplado;
3. O Ator independente **Auditor da Entrega de Valor** realizou novo rito de avaliação e emitiu o Resultado do Processo **`FORMACAO_SUFICIENTE`**;
4. O status de `EV-001` foi transicionado para **`FORMADA`** no registro principal e no Mapa de Entregas de Valor de M-001.

## Governança transversal

* Localização normativa: `documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md`
* Descoberta tardia de lacuna não faz a condução retornar automaticamente a vertical ou Status anterior; marcos validamente alcançados e o histórico permanecem preservados.
* Intervenções do Owner constituem Decisões Humanas Materiais de autoridade máxima, com poder vinculante e imediato sobre a direção técnica.
* Ator agêntico pode identificar e propor Débito, mas sua validade depende de revisão e decisão humana competente.
* As naturezas conceituais iniciais são `Débito de Governança` e `Débito da Demanda`; Débito reconhecido pode ser bloqueante ou não bloqueante.

## Entidades ativas

### Necessidade N-001

* Localização: `dados/necessidades/N-001/necessidade.md`
* Compromisso: aprovado pelo Owner (`APROVADO`, usuário autenticado `mhj`)
* Status: `EM_PROJETO`
* Projeto de origem: `P-001`, em vínculo exclusivo 1:1
* Artefato de saída: `Compromisso da Necessidade` disponível para consumo pelo Projeto

### Projeto P-001

* Localização: `dados/projetos/P-001/projeto.md`
* Identificador técnico: `5575efa1-c68e-464f-8393-07be8c9bc93a`
* Nome inicial: Jornada Autônoma do NAAMIVE
* Necessidade de origem: `N-001`
* Status: `FORMADO`
* Formação: aprovada pela auditoria independente, cobrindo `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO`
* Resultado de auditoria: `FORMACAO_SUFICIENTE`
* Artefato de saída: `Direção do Projeto` aprovada e disponível para a vertical Módulo

### Módulo

* Mapa canônico do P-001: `dados/projetos/P-001/mapa-de-modulos.md`
* Entrada: `Direção do Projeto` aprovada por `FORMACAO_SUFICIENTE`
* M-001 — Condução da Necessidade: `FORMADO`
  - Mapa de Entregas de Valor: `dados/modulos/M-001/mapa-de-entregas-de-valor.md` (registra EV-001 em `FORMADA`)
* M-002 — Formação do Projeto: `FORMADO`
* M-003 — Coordenação do Trabalho: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-004 — Contexto e Rastreabilidade: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-005 — Verificação do Resultado de Software: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* Saída de cada instância aprovada: `Especificação Técnica do Módulo` aprovada; status `FORMADO`

### Entrega de Valor EV-001

* Localização normativa: `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md` a `07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md`
* Módulo proprietário: `M-001`
* Mapa canônico: `dados/modulos/M-001/mapa-de-entregas-de-valor.md`
* Registro principal: `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
* Status atual: `FORMADA`
* Decisão Material do Owner de Arquitetura: Node.js (TypeScript), PostgreSQL, interface web responsiva e worker contínuo em background.
* Resultado do Processo vigente: `FORMACAO_SUFICIENTE` emitido pelo Auditor da Entrega de Valor.

## Estado do bloqueio

**DESBLOQUEADO.** A especificação da EV-001 foi readequada e aprovada com sucesso. A Entrega de Valor está apta para um novo ciclo legítimo de Planejamento da Realização sob a stack determinada pelo Owner.

## Próxima ação legítima

Acionar o Ator agêntico **Especialista em Planejamento da Realização** (carregando a Skill `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`) sobre a instância `EV-001` (`dados/entregas-de-valor/EV-001/entrega-de-valor.md`), para:
1. Elaborar novo **Plano de Realização da Entrega de Valor** (`dados/entregas-de-valor/EV-001/plano-de-realizacao.md`) concebido para Node.js/TypeScript e PostgreSQL com interface web responsiva e worker em background;
2. Decompor e materializar os novos Itens de Trabalho em `dados/itens-de-trabalho/` com grafo DAG de dependências explícito;
3. Transicionar `EV-001` de `FORMADA` para `EM_REALIZACAO` e disponibilizar o primeiro item de trabalho técnico em `PRONTO_PARA_EXECUCAO`.

## Lacunas e limites vigentes

* Nenhuma linha de código de software foi implementada (respeito estrito aos papéis e à proibição de implementação direta).
* O consumo final de evidências pelo Verificador Agregado do Projeto e os efeitos em `CONCLUIDO` do P-001 e `ATENDIDA` da N-001 continuam sem caminho operacional formalizado.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md` a `07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md`
* `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`
* `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
* `dados/modulos/M-001/mapa-de-entregas-de-valor.md`
