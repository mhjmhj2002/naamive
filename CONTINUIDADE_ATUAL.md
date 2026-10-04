# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

O ciclo de vida da vertical Entrega de Valor avançou com a delimitação canônica e formação técnica da **`EV-002 — Direção do Projeto`** vinculada ao módulo proprietário **`M-002 — Formação do Projeto`**.

A `EV-001 — Compromisso da Necessidade` permanece como referência de sucesso concluída (`CONCLUIDA`), com sua realização integrada, suíte de testes 100% verde e homologação formal realizada pelo Owner (`mhj`).

A instância **`EV-002 — Direção do Projeto` foi materializada e formalmente especificada**:
- Delimitação canônica registrada no Mapa de Entregas de Valor de M-002 (`dados/modulos/M-002/mapa-de-entregas-de-valor.md`);
- Registro principal e Especificação Técnica consolidada em `dados/entregas-de-valor/EV-002/entrega-de-valor.md` com status **`EM_FORMACAO`**;
- Plano de realização preliminar e grafo de dependências decomposto em `IT-005` a `IT-008` registrado em `dados/entregas-de-valor/EV-002/plano-de-realizacao.md`;
- Aderência estrita à Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL, Web responsiva e Worker desacoplado em background) e garantia do invariante estrito de unicidade 1:1 entre Necessidade e Projeto.

## Governança transversal e Débitos

* Localização normativa: `documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md`
* Descoberta tardia de lacuna não faz a condução retornar automaticamente a vertical ou Status anterior; marcos validamente alcançados e o histórico permanecem preservados.
* Intervenções do Owner constituem Decisões Humanas Materiais de autoridade máxima, com poder vinculante e imediato sobre a direção técnica.
* Ator agêntico pode identificar e propor Débito, mas sua validade depende de revisão e decisão humana competente.

### Débitos Ativos
* Nenhum débito ativo no momento.

### Débitos Resolvidos
* **[DEB-GOV-001](documentacao/governanca/debitos/DEB-GOV-001.md) — Ausência de Etapa de Homologação e Decisão Material do Owner no Encerramento da Entrega de Valor:**
  - **Status:** `RESOLVIDO`. Homologação obrigatória do Owner antes da transição para `CONCLUIDA` incorporada às normas e skills.

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
* Artefato de saída: `Direção do Projeto` aprovada e disponível para a vertical Módulo

### Módulos

* Mapa canônico do P-001: `dados/projetos/P-001/mapa-de-modulos.md`
* M-001 — Condução da Necessidade: `FORMADO` (Mapa canônico possui `EV-001` em `CONCLUIDA`)
* M-002 — Formação do Projeto: `FORMADO`
  - Mapa de Entregas de Valor: `dados/modulos/M-002/mapa-de-entregas-de-valor.md` (registra `EV-002` em `EM_FORMACAO`)
* M-003 — Coordenação do Trabalho: `FORMADO`
* M-004 — Contexto e Rastreabilidade: `FORMADO`
* M-005 — Verificação do Resultado de Software: `FORMADO`

### Entregas de Valor

* **EV-001 — Compromisso da Necessidade:**
  - Módulo proprietário: `M-001`
  - Status atual: **`CONCLUIDA`**
  - Registro principal: `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
  - Homologação do Owner: Realizada pelo usuário autenticado `mhj` (`HOMOLOGADO_PELO_OWNER`)
  - Resultado da Verificação: `EVOLUCAO_MATERIALIZADA`

* **EV-002 — Direção do Projeto:**
  - Identificador técnico: `096a280f-c8aa-4de1-932b-159e5a609b21`
  - Módulo proprietário: `M-002 — Formação do Projeto`
  - Status atual: **`EM_FORMACAO`**
  - Registro principal: `dados/entregas-de-valor/EV-002/entrega-de-valor.md`
  - Plano de Realização: `dados/entregas-de-valor/EV-002/plano-de-realizacao.md`
  - Situação: Especificação da Entrega de Valor consolidada e submetida ao **Auditor da Entrega de Valor**.

## Estado do bloqueio

**DESBLOQUEADO:**
* Não há débitos ou impedimentos bloqueantes ativos.
* A especificação da `EV-002` está materializada e preparada para a auditoria independente.

## Próxima ação legítima

1. Atuar no papel de **Auditor da Entrega de Valor** (`.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md`) para realizar a avaliação independente da Especificação da `EV-002`.
2. Em caso de emissão de parecer favorável (`FORMACAO_SUFICIENTE`), transicionar a `EV-002` de `EM_FORMACAO` para **`FORMADA`**, liberando-a para planejamento da realização e execução dos Itens de Trabalho (`IT-005` a `IT-008`).

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md` a `07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md`
* `dados/modulos/M-002/mapa-de-entregas-de-valor.md`
* `dados/entregas-de-valor/EV-002/entrega-de-valor.md`
* `dados/entregas-de-valor/EV-002/plano-de-realizacao.md`
* `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md`
