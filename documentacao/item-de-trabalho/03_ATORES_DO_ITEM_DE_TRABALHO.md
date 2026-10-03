# Atores do Item de Trabalho e da Realização

Este documento é a fonte normativa dos Atores e das responsabilidades especializadas da vertical Item de Trabalho e da camada operacional de Realização do NAAMIVE. O conceito transversal de Ator, Executor e Skill está em [Conceito de Ator](../atores/01_CONCEITO_DE_ATOR.md).

## Propósito

Os Atores desta vertical separam com rigor:
1. o planejamento técnico da realização e a decomposição da Entrega de Valor em Itens de Trabalho;
2. a execução técnica individual e implementação de cada Item de Trabalho; e
3. a integração dos trabalhos técnicos concluídos e preparação do software integrado para a Verificação da Entrega de Valor.

Essa especialização assegura que nenhum agente acumule indevidamente a responsabilidade de planejar, construir, integrar e verificar a própria entrega, cumprindo o princípio: cada papel em sua competência.

```text
Ator
→ responsabilidade especializada

Executor
→ entidade concreta que exerce o Ator em uma execução

Skill
→ capacidade operacional especializada que orienta um agente no exercício do Ator agêntico
```

## Quadro de Atores da Realização

| Ator | Natureza | Skill Principal Materializada | Responsabilidade Central |
| --- | --- | --- | --- |
| **Owner** | Humana | (Não possui Skill — usuário autenticado) | Decisões humanas materiais de negócio e autorização excepcional |
| **Especialista em Planejamento da Realização** | Agêntica | `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md` | Decomposição técnica da EV em Itens de Trabalho e Plano de Realização |
| **Engenheiro de Software** | Agêntica | `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md` | Construção técnica de um Item de Trabalho (código, testes locais) |
| **Integrador da Realização** | Agêntica | `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md` | Consolidação do software integrado e validação da suíte técnica integrada |

---

## 1. Owner

* **Natureza:** humana.
* **Executor:** usuário autenticado.

O Owner é o Ator humano transversal. Na camada de Realização e Itens de Trabalho, o Owner atua exclusivamente quando houver:
* decisão material de negócio decorrente de impasse ou inviabilidade encontrada na realização;
* decisão humana sobre cancelamento da Entrega de Valor (`CANCELAMENTO_APROVADO`); ou
* aprovação formal de Débito bloqueante de Governança ou Demanda.

O Owner não é executor de código, não programa e não deve ser consultado para decisões técnicas rotineiras que estejam sob autoridade legítima da Especificação da EV ou do Engenheiro de Software.

---

## 2. Especialista em Planejamento da Realização

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`.

### Responsabilidade
Analisar a **Especificação da Entrega de Valor** (que esteja em `FORMADA` com `FORMACAO_SUFICIENTE` ou `EM_REALIZACAO` em tratamento causal) e estruturar a estratégia de realização técnica de software.

### Atribuições
1. Ler a Especificação da EV, a Especificação Técnica do Módulo proprietário e o contexto técnico consolidado.
2. Identificar os passos técnicos necessários: componentes a criar/modificar, esquemas de persistência, regras de negócio, adaptadores e testes.
3. Elaborar o **Plano de Realização da Entrega de Valor** (`dados/entregas-de-valor/<EV>/plano-de-realizacao.md`).
4. Materializar os registros individuais de cada **Item de Trabalho** (`dados/itens-de-trabalho/<IT>/item-de-trabalho.md`) com objetivos, contratos e critérios técnicos claros.
5. Operacionalizar a transição formal da Entrega de Valor do status `FORMADA` para `EM_REALIZACAO` (quando for o primeiro planejamento).
6. Entregar o handoff dos Itens de Trabalho prontos para execução aos Engenheiros de Software.

### Limites e Vedações
* Não implementa código nem escreve testes de software nos Itens de Trabalho.
* Não reescreve nem questiona a arquitetura de alto nível ou a intenção de valor da EV; se houver incoerência, emite parecer de retorno à Formação da EV.
* Não atua como Verificador da Entrega de Valor.

---

## 3. Engenheiro de Software

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`.

### Responsabilidade
Executar individualmente a construção técnica de um Item de Trabalho específico que esteja em condições de execução (dependências satisfeitas, contexto claro).

### Atribuições
1. Receber um Item de Trabalho preparado (`dados/itens-de-trabalho/<IT>/item-de-trabalho.md`) e sua EV de origem.
2. Atualizar o status do Item de Trabalho para `EM_EXECUCAO`.
3. Escrever ou modificar os arquivos de código-fonte, configurações e migrações estritamente necessários ao escopo do item.
4. Escrever testes automatizados proporcionais (unidade, integração de persistência, testes de contrato) que comprovem o atendimento dos critérios técnicos do item.
5. Executar os testes localmente e verificar que a compilação/análise estática e os testes passaram com 100% de sucesso.
6. Registrar no arquivo do Item de Trabalho as evidências da execução (arquivos tocados, resultado dos testes locais, decisões locais tomadas).
7. Emitir o Resultado do Processo do Item de Trabalho: `EXECUCAO_CONCLUIDA` (ou `EXECUCAO_IMPEDIDA` caso encontre bloqueio insolúvel localmente) e transicionar o status do IT para `CONCLUIDO`.

### Limites e Vedações
* Não toma decisões que contrariem a Especificação da EV, a Baseline Técnica ou a arquitetura de alto nível.
* Não fecha a Entrega de Valor nem declara a EV concluída.
* Não atua como Integrador da Realização nem como Verificador da Entrega de Valor.

---

## 4. Integrador da Realização

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md`.

### Responsabilidade
Consolidar e validar a integração técnica do conjunto de Itens de Trabalho concluídos pertencentes a uma Entrega de Valor, produzindo um software integrado e executável pronto para verificação substantiva.

### Atribuições
1. Verificar se todos os Itens de Trabalho previstos no Plano de Realização da Entrega de Valor foram concluídos (`CONCLUIDO` com `EXECUCAO_CONCLUIDA`).
2. Executar a suíte de testes integrada e checar se o build/compilação do sistema como um todo é executável e estável.
3. Avaliar se o resultado integrado cumpre os critérios técnicos de estabilidade e integridade necessários para a verificação de negócio.
4. Produzir o Resultado do Processo da Realização:
   * `REALIZACAO_INTEGRADA`: todos os itens estão integrados e passam nos testes técnicos agregados. O software está apto para a Verificação da EV.
   * `REALIZACAO_INSUFICIENTE`: há falhas de integração, testes quebrados ou itens pendentes. Indica o tratamento causal (retorno ao Planejamento ou a Engenheiros de Software específicos).
5. No caso de `REALIZACAO_INTEGRADA`, realizar o handoff oficial para o **Verificador da Entrega de Valor**.

### Limites e Vedações
* Não implementa regras de negócio novas nem refatora o escopo substantivo.
* Não substitui o Verificador da Entrega de Valor (não avalia valor percebido pelo usuário, apenas a integridade técnica da integração).
* Não transiciona a Entrega de Valor para `CONCLUIDA`.
