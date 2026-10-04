# Plano de Realização — EV-002: Direção do Projeto

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-002 — Direção do Projeto](entrega-de-valor.md)
* **Identificador técnico da EV:** `096a280f-c8aa-4de1-932b-159e5a609b21`
* **Módulo proprietário:** [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md)
* **Status da EV:** `FORMADA` (com parecer `FORMACAO_SUFICIENTE` do Auditor da Entrega de Valor)
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript) + PostgreSQL com interface web responsiva e worker desacoplado em background.

## Estratégia de Realização Técnica

A realização técnica da EV-002 expande a arquitetura estabelecida na EV-001 de forma desacoplada, incremental e coesa:
1. **Esquema Relacional e Migrações PostgreSQL:** Criação das tabelas de projetos, etapas de formação, pareceres de auditoria e direções de projeto com restrição estrita de unicidade 1:1 com a tabela `necessidades`.
2. **Núcleo de Domínio de Projeto (TypeScript):** Implementação das entidades puras `Projeto`, `DirecaoProjeto`, `EtapaFormacaoProjeto`, invariantes de integridade e regras de transição do catálogo de status do Projeto.
3. **Serviços de Aplicação, Persistência e Integração com M-001:** Repositório PostgreSQL transacional, orquestração de casos de uso de bootstrap, avanço de etapas de formação e confirmação para M-001 via `PortaIntegracaoProjeto`.
4. **Camada Web Responsiva e Suíte de Testes Integrada:** Visualização dos projetos na interface web (Bootstrap), telas de acompanhamento da formação técnica, exibição da Direção aprovada e testes de integração de ponta a ponta.

## Grafo de Dependências Técnicas (DAG)

```text
IT-005 (Esquema PostgreSQL de Projetos e Migrações de Formação/Auditoria)
  │
  ▼
IT-006 (Núcleo de Domínio do Projeto, Regras de Transição e Invariante 1:1)
  │
  ▼
IT-007 (Serviço de Aplicação, Repositório Postgres e Integração com M-001)
  │
  ▼
IT-008 (Camada Web Responsiva de Projeto, Direção e Suíte de Testes Locais)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Atual | Dependências |
| --- | --- | --- | --- |
| [`IT-005`](../../itens-de-trabalho/IT-005/item-de-trabalho.md) | Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1 | `CONCLUIDO` | Nenhuma (sucede baseline consolidada na EV-001) |
| [`IT-006`](../../itens-de-trabalho/IT-006/item-de-trabalho.md) | Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação | `CONCLUIDO` | `IT-005` (satisfeita) |
| [`IT-007`](../../itens-de-trabalho/IT-007/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002 | `CONCLUIDO` | `IT-006` (satisfeita) |
| [`IT-008`](../../itens-de-trabalho/IT-008/item-de-trabalho.md) | Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada | `CONCLUIDO` | `IT-007` (satisfeita) |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Projeto, etapas conceituais de formação e regras de transição.
* **Testes de Integração:** Validação das migrações PostgreSQL, garantia de unicidade `UNIQUE(necessidade_id)` sob concorrência e repositório transacional.
* **Testes de Integração de Módulos:** Validação de handoff e bootstrap bidirecional entre M-001 e M-002 com idempotência comprovada.
* **Testes End-to-End:** Execução integrada da jornada do Projeto na aplicação web responsiva com exibição da Direção aprovada.

## Resultado do Processo — Integração da Realização

| Campo | Registro |
| --- | --- |
| Ator competente | Integrador da Realização |
| Resultado do Processo | `REALIZACAO_INTEGRADA` |
| Status da EV após integração | `EM_REALIZACAO` (inalterado, aguardando Verificação) |
| Data da avaliação | 2026-10-04 |

### Parecer de Integração Técnica

O **Integrador da Realização** avaliou a integridade técnica global do software produzido pela realização da `EV-002 — Direção do Projeto`, abrangendo o conjunto de Itens de Trabalho concluídos (`IT-005`, `IT-006`, `IT-007` e `IT-008`):

1. **Checagem de Cobertura e Conclusão:**
   - Todos os quatro Itens de Trabalho planejados no grafo de dependências alcançaram formalmente o status `CONCLUIDO` com Resultado do Processo `EXECUCAO_CONCLUIDA`.
2. **Build e Verificação Estática de Tipos:**
   - A checagem estrita de tipos TypeScript (`npm run typecheck`) executou sem erros ou advertências.
   - A compilação e empacotamento do sistema (`npm run build`) concluíram com sucesso absoluto, gerando os artefatos funcionais em `dist/`.
3. **Execução da Suíte Integrada de Testes:**
   - Executada a suíte completa de testes (`npm test`), cobrindo unidades de domínio (`IT-002`, `IT-006`), persistência e migrações PostgreSQL (`IT-001`, `IT-005`), worker desacoplado e portas de integração (`IT-003`), serviço de aplicação e repositório transacional (`IT-007`), camada web responsiva e testes end-to-end (`IT-004`, `IT-008`).
   - Resultado: **8/8 arquivos de teste aprovados e 58/58 testes verdes (100% de sucesso)**.
4. **Declaração de Prontidão Técnica:**
   - O software opera de maneira coesa, desacoplada e sem regressões nas capacidades previamente consolidadas da EV-001. A integridade 1:1, a persistência relacional e a navegação web responsiva estão plenamente funcionais.

Emite-se formalmente o Resultado do Processo **`REALIZACAO_INTEGRADA`**.

### Handoff para Verificação da Entrega de Valor

O software integrado da `EV-002 — Direção do Projeto` encontra-se tecnicamente pronto e disponível. Realiza-se o handoff oficial para o Ator agêntico **Verificador da Entrega de Valor** (`.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md`), para que proceda à avaliação substantiva da realização frente aos critérios de valor e beneficiários da EV-002.

