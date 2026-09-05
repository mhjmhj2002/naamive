# Estudo futuro: integração do OmniRoute como infraestrutura de execução de IA

> **Status:** estudo arquitetural de alto nível, sem aprovação.
>
> Este documento não é roadmap, backlog, especificação aprovada ou autorização de implementação. Ele não altera a arquitetura vigente, os contratos, a governança, o runtime ou os agentes do NAAMIVE.

## 1. Motivação

O NAAMIVE possui atualmente plataforma global, runtime, governança, contratos, agentes e orquestração. Sua execução é baseada atualmente em Codex CLI. Há uma oportunidade futura de desacoplar o mecanismo de execução da IA utilizada, preservando as responsabilidades e os controles que já pertencem ao NAAMIVE.

Este estudo registra uma possível direção para avaliar esse desacoplamento sem pressupor mudança imediata.

## 2. Referência externa

O estudo foi motivado pela análise do projeto open source [OmniRoute](https://github.com/diegosouzapw/OmniRoute). O projeto se apresenta como um AI Gateway com endpoint compatível com OpenAI, múltiplos providers e modelos, roteamento, fallback orientado a quota, controle de custo, compressão de contexto e telemetria. Também declara suporte a ferramentas como Codex, Claude Code e outras interfaces de desenvolvimento assistido por IA.

Esta referência não implica adoção, dependência, homologação ou endosso do projeto. As capacidades citadas devem ser reavaliadas no momento de qualquer decisão futura.

## 3. Princípio arquitetural

O OmniRoute **não** deve substituir a governança, o runtime, os contratos, os agentes, a máquina de estados ou a autoridade humana do NAAMIVE. Nesta hipótese, ele é somente infraestrutura de execução de IA.

> O NAAMIVE continua sendo o sistema que decide o que pode ser executado. O OmniRoute apenas fornece capacidade de inferência e roteamento entre modelos.

## 4. Arquitetura proposta

```text
Business Need
        ↓
Governance
        ↓
Orchestration
        ↓
Execution Context
        ↓
Work Dispatch
        ↓
Governed Execution Envelope
        ↓
Executor Registry
        ├── Codex CLI
        ├── OmniRoute
        ├── Claude Code
        ├── Local Models
        └── Fake Executor
        ↓
Model Providers
```

- **Business Need:** origem da necessidade a ser tratada.
- **Governance:** aplica autoridade humana, gates e decisões permitidas.
- **Orchestration:** conduz o fluxo de trabalho conforme a máquina de estados vigente.
- **Execution Context:** reúne o contexto autorizado e necessário para a execução.
- **Work Dispatch:** entrega trabalho autorizado para execução.
- **Governed Execution Envelope:** delimita capacidades, contexto, evidências e limites de escrita da execução.
- **Executor Registry:** resolve uma implementação de executor compatível com o tipo de trabalho e as capacidades requeridas.
- **Model Providers:** fornecem, quando aplicável, a capacidade de inferência selecionada pelo executor ou gateway.

O diagrama é uma hipótese de separação de camadas; não descreve componentes já introduzidos no runtime.

## 5. Executor Registry

Uma possível evolução seria introduzir uma abstração de executores, evitando que o runtime conheça diretamente apenas Codex. Nessa hipótese, o executor atual passaria a ser uma implementação intercambiável de um registro de executores.

Exemplos conceituais:

- Codex CLI Executor;
- OmniRoute Executor;
- Claude Code Executor;
- Local Executor;
- Fake Executor.

O registro deveria considerar as capacidades exigidas antes de selecionar uma implementação; não seria um mecanismo para contornar controles de governança.

## 6. Separação de responsabilidades

### NAAMIVE

Permaneceria responsável por governança, gates, contratos, contexto, autoridade, auditoria, máquina de estados, work dispatch, evidências, controle Git e limites de escrita.

### Executor

Seria responsável por executar o agente dentro do envelope de execução que recebeu.

### OmniRoute

Quando utilizado, seria responsável apenas por escolher provider e modelo, aplicar fallback, administrar quota e custo, compressão e telemetria. Nunca deveria alterar estados, aprovar gates ou assumir autoridade.

## 7. Integração sugerida

A integração idealizada não fica dentro da governança. Ela se localiza entre **Work Dispatch** e **Executor**, após a definição de trabalho autorizado e antes da execução concreta. Portanto, o gateway não recebe autoridade para decidir se, quando ou com quais efeitos o trabalho será executado.

## 8. Perfis de execução

O runtime poderia selecionar perfis abstratos, como `coding-strong`, `architecture-deep`, `review`, `business-analysis`, `low-cost` e `deterministic-review`. O executor, e não a governança, resolveria qual modelo concreto atende ao perfil e às capacidades exigidas.

Essa separação permitiria mudar a escolha de modelo sem transformar uma decisão de roteamento em alteração de contrato de trabalho.

## 9. Dois tipos de executor

Um **executor cognitivo** produz texto estruturado para análise, arquitetura, documentação, revisão e requisitos. Um **executor operacional** possui acesso ao workspace para atividades como implementação, integração, testes e commits.

O OmniRoute poderia ser usado em ambos os tipos de maneiras diferentes: como infraestrutura de inferência para um executor cognitivo ou como roteador de modelos para um executor operacional que preserve, de forma explícita, suas capacidades e restrições de workspace.

## 10. Evolução sugerida do runtime

Como ideia futura, o executor Codex atual poderia ser desacoplado do restante do runtime. A governança continuaria exatamente igual; somente a camada de execução se tornaria intercambiável. Isso exigiria uma avaliação formal antes de qualquer mudança, inclusive dos contratos e das evidências produzidas.

## 11. Contexto e compressão

Uma hipótese é classificar o contexto em zonas:

- **Zona autoritativa:** Execution Context, Work Dispatch e Gates; nunca comprimidos.
- **Zona resumível:** histórico e análises anteriores.
- **Zona comprimível:** logs, documentação extensa e saídas antigas.

Essa classificação é somente uma hipótese de arquitetura futura. Em especial, compressão não pode modificar conteúdo que determine autoridade, escopo ou decisão de governança.

## 12. Auditoria

Uma integração futura deveria registrar, exclusivamente para rastreabilidade: executor utilizado, provider, modelo, fallback, tokens, request ID, hashes de contexto, hashes do prompt e hashes da resposta.

O desenho de retenção, proteção de dados e acesso a essas evidências dependeria de avaliação de governança e segurança.

## 13. Política de fallback

Fallback não pode alterar capacidades. Por exemplo, não é permitido substituir um executor com acesso autorizado ao workspace por uma API simples de chat. A equivalência das capacidades, dos limites e das evidências deve ser preservada antes de qualquer substituição.

## 14. Roadmap sugerido (não aprovado)

Somente como hipótese de sequência de investigação, e não como backlog oficial:

1. abstração de executores;
2. Fake Executor;
3. OmniRoute para tarefas cognitivas;
4. suporte operacional via OmniRoute.

Nenhuma dessas fases cria item de trabalho, compromisso de entrega ou autorização para iniciar implementação.

## 15. Benefícios esperados

Uma eventual evolução aprovada poderia trazer desacoplamento do runtime, múltiplos providers, redução de custo, maior resiliência, menor dependência de fornecedor, possibilidade de modelos locais, melhor observabilidade e maior escalabilidade.

## 16. Riscos

Riscos a avaliar incluem aumento de complexidade, acoplamento excessivo ao OmniRoute, duplicação de responsabilidades, perda de rastreabilidade e uso incorreto de fallback. Também devem ser avaliados segurança, privacidade, disponibilidade, compatibilidade de ferramentas e equivalência de capacidades entre executores.

## 17. Conclusão

Esta documentação registra apenas uma possibilidade de evolução arquitetural futura. Ela não altera a arquitetura vigente, não autoriza implementação, não cria backlog, não modifica contratos e não altera a governança. Serve exclusivamente para preservar conhecimento arquitetural para futuras avaliações.
