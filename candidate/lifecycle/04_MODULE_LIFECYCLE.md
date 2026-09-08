# NAAMIVE — Module Lifecycle

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.3  
**Autoridade:** lifecycle específico da entidade Module  
**Deriva de:** `01_LIFECYCLE_MODEL.md` e `03_PROJECT_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** entidade Module, suas dependências, integração e sucessão

---

# 1. Objetivo

Este documento define o lifecycle detalhado da entidade **Module**.

Module representa uma capacidade de negócio coerente pertencente a um Project.

Seu lifecycle existe para garantir que capacidades de negócio sejam:

- identificadas;
- definidas;
- planejadas;
- implementadas;
- validadas;
- integradas;

sem transformar Module em camada técnica ou mini-Project independente.

---

# 2. Regra de ownership

Todo Module pertence a exatamente um Project.

É inválido:

```text
Module sem Project proprietário
```

O vínculo é permanente para a instância.

Mover Module de um Project para outro não é alteração de ownership silenciosa;
deve ocorrer por nova modelagem governada.

---

# 3. Natureza de negócio

Module deve representar responsabilidade de negócio compreensível.

Exemplos conceituais válidos:

```text
Cadastro de Cliente
Controle de Orçamento Familiar
Gestão de Leilão
Registro de Solicitações
```

Exemplos conceituais inválidos como Module:

```text
Frontend
Backend
Database
Controllers
Repositories
AWS
React
Java
```

Componentes técnicos podem existir na implementação, mas não definem Module.

---

# 4. Estados normativos

Lifecycle principal:

```text
IDENTIFIED
    ↓
DEFINED
    ↓
PLANNED
    ↓
IMPLEMENTING
    ↓
VALIDATING
    ↓
READY_FOR_INTEGRATION
    ↓
INTEGRATED
```

Estado terminal alternativo:

```text
CANCELLED
```

Condições transversais:

```text
BLOCKED
PAUSED
```

---

# 5. Estado IDENTIFIED

## 5.1 Significado

Uma capacidade candidata foi identificada dentro do Project.

Ainda não há definição suficiente para planejamento.

---

## 5.2 Origem

Module normalmente nasce durante `Project ARCHITECTURE`.

Pode surgir depois se nova evidência exigir decomposição adicional.

Nesse caso, o Project deve revalidar arquitetura e planejamento.

---

## 5.3 Evidência mínima

- Project proprietário;
- nome ou identificação;
- responsabilidade de negócio preliminar;
- motivo de existência;
- relação com escopo do Project;
- classificação inicial: obrigatório ou opcional para a Delivery alvo;
- classificação inicial de impacto.

## 5.4 Classificação de impacto do Module

Todo Module possui classificação própria:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

A classificação considera o impacto específico do Module **e** as restrições
herdadas do Project que realmente se aplicam à sua capacidade.

Se a criticidade do Project decorrer de segurança, dados, irreversibilidade,
autoridade ou outra condição que também atinja o Module, o Module não pode ser
classificado abaixo desse piso aplicável.

Se uma condição crítica do Project não afetar o Module, classificação menor só é
permitida com justificativa rastreável.

A classificação pode ser elevada quando nova evidência surgir. Redução exige
evidência suficiente, autoridade adequada e não pode ser realizada
unilateralmente pelo implementador para escapar de controles.

Na dúvida, aplica-se a classe de maior impacto.

---

## 5.5 Proibições

Não é permitido:

- criar Work Items executáveis;
- iniciar implementação;
- inventar contratos técnicos;
- tratar Module como definido apenas por nome.

---

## 5.6 Saída

```text
IDENTIFIED → DEFINED
```

Requer responsabilidade suficientemente compreendida.

---

# 6. Estado DEFINED

## 6.1 Significado

O Module possui responsabilidade, limites e relações conceituais suficientemente
definidos.

---

## 6.2 Definição mínima

Conforme aplicável:

- responsabilidade de negócio;
- entradas;
- resultados;
- atores;
- regras relevantes;
- limites;
- interfaces conceituais;
- dependências;
- critérios de sucesso;
- riscos;
- integrações com outros Modules;
- impactos;
- questões abertas.

---

## 6.3 Limites

A definição deve permitir responder:

```text
o que pertence a este Module?
o que não pertence?
```

Se isso não puder ser respondido, o Module não está `DEFINED`.

---

## 6.4 Dependências

Toda dependência material deve possuir:

- predecessor;
- resultado necessário;
- condição de satisfação;
- impacto;
- responsável;
- fallback.

---

## 6.5 Review e auditoria

Module `MATERIAL` ou `CRÍTICO` deve receber review especializado.

Auditoria de prontidão é exigida quando sua definição autoriza decisão material
ou handoff relevante para planejamento.

---

## 6.6 Saída

```text
DEFINED → PLANNED
```

somente após planejamento suficiente.

A transição pode ser materializada após produção e aprovação do plano do Module.

---

# 7. Estado PLANNED

## 7.1 Significado

O Module possui trabalho executável suficiente para iniciar implementação.

---

## 7.2 Conteúdo esperado

- Work Items;
- dependências;
- ordem;
- critérios de aceite;
- estratégia de validação;
- integração;
- riscos;
- pontos de review;
- necessidades de auditoria;
- relação com Work Items transversais do Project.

---

## 7.3 Readiness

Nem todos os Work Items precisam estar detalhados até o último nível se o modelo
permitir planejamento progressivo.

Porém deve existir informação suficiente para que o próximo trabalho elegível
não dependa de invenção material do implementador.

---

## 7.4 Saída

```text
PLANNED → IMPLEMENTING
```

Requer:

- pelo menos um Work Item `READY` ou continuidade válida para torná-lo `READY`;
- dependências iniciais tratadas;
- autoridade para começar;
- findings bloqueadores tratados.

---

# 8. Estado IMPLEMENTING

## 8.1 Significado

Work Items do Module estão sendo materializados.

---

## 8.2 Relação com Work Item

Module não executa diretamente.

Fluxo:

```text
Module
    ↓
Work Item
    ↓
Execution
```

---

## 8.3 Continuidade

Enquanto `IMPLEMENTING`, deve existir:

- Work Item elegível;
- Work Item em progresso;
- review pendente;
- blocker governado;
- wait governada;
- recovery;
- reconciliation;
- ação humana autorizada.

Ausência de todas é inconsistência.

---

## 8.4 Nova decisão material

Se implementação descobrir nova decisão de Module:

- registrar;
- interromper avanço afetado;
- voltar para `DEFINED` ou `PLANNED` conforme natureza;
- revalidar impactos no Project.

---

## 8.5 Saída

```text
IMPLEMENTING → VALIDATING
```

Requer:

- Work Items necessários para o escopo do Module concluídos;
- nenhuma Execution em voo com autoridade de alterar o baseline;
- baseline de validação identificável;
- continuidade para validação.

---

# 9. Estado VALIDATING

## 9.1 Significado

O resultado do Module está sendo verificado isoladamente e em suas relações
necessárias.

---

## 9.2 Validação

Pode incluir:

- critérios funcionais;
- regras de negócio;
- contratos;
- integração parcial;
- experiência;
- segurança;
- dados;
- operação;
- evidências.

---

## 9.3 Resultado

Pode resultar em:

```text
READY_FOR_INTEGRATION
rework
replan
redefine
block
cancel
```

---

## 9.4 Saída

```text
VALIDATING → READY_FOR_INTEGRATION
```

Requer:

- critérios satisfeitos;
- evidências suficientes;
- findings bloqueadores tratados;
- dependências necessárias para integração conhecidas;
- baseline do Module identificável;
- evidências, reviews e auditorias vinculados ao baseline atual.

---

# 10. Estado READY_FOR_INTEGRATION

## 10.1 Significado

O Module produziu resultado validado suficiente para integração no Project.

Isso não significa que a integração já ocorreu.

---

## 10.2 Continuidade

Deve existir handoff governado para integração.

Uma condição equivalente a:

```text
READY_FOR_INTEGRATION
sem destino
sem ação
sem responsável
```

é inconsistência.

---

## 10.3 Dependências

Se integração depender de outro Module, a condição deve ser explícita.

Pode existir espera governada, mas não espera nominal.

---

## 10.4 Saída

```text
READY_FOR_INTEGRATION → INTEGRATED
```

somente quando integração tiver sido materializada e verificada.

---

# 11. Estado INTEGRATED

## 11.1 Significado

O resultado do Module está incorporado ao baseline integrado do Project.

É terminal para o lifecycle normal desta instância de Module.

---

## 11.2 O que INTEGRATED não significa

```text
Project DELIVERED
Delivery aceita
produto finalizado
```

Project ainda pode precisar de:

- outros Modules;
- Work Items transversais;
- validação global;
- auditoria;
- aceite de Delivery.

## 11.3 Sucessão de Module integrado

`INTEGRATED` permanece terminal para a instância e baseline que foram integrados.

Se validação global, mudança de baseline, evolução ou nova evidência exigir
correção de uma capacidade já integrada, o Module anterior **não é reaberto**.

Deve ser criada uma nova instância sucessora, causalmente vinculada à anterior,
representando a nova geração/baseline daquela capacidade.

```text
Module v1 INTEGRATED
        ↓ nova necessidade de correção/substituição
Module v2 sucessor
        ↓
DEFINED/PLANNED/.../INTEGRATED
        ↓
supersede baseline v1 para agregação corrente
```

O sucessor:

- pertence ao mesmo Project quando a correção ainda fizer parte do Project ativo;
- referencia o Module e baseline predecessores;
- recebe classificação de impacto atual;
- revalida dependências, Work Items, evidências e critérios afetados;
- não apaga nem altera a integração histórica anterior.

A agregação do Project deve distinguir a integração histórica da **integração
autoritativa corrente** para a Delivery alvo. Um Module supersedido não satisfaz
automaticamente a capacidade no baseline atual.

---

# 12. Retornos

São permitidos quando há evidência.

Exemplos:

```text
PLANNED → DEFINED
IMPLEMENTING → PLANNED
IMPLEMENTING → DEFINED
VALIDATING → IMPLEMENTING
VALIDATING → PLANNED
READY_FOR_INTEGRATION → VALIDATING
```

Retorno não apaga histórico.

Todo retorno material deve classificar Work Items, Executions, evidências,
reviews, auditorias, autorizações, handoffs e baselines afetados como `KEEP`,
`REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE` antes de novo avanço.

---

# 13. Retorno READY_FOR_INTEGRATION → VALIDATING

É permitido se integração revelar:

- incompatibilidade;
- contrato inadequado;
- evidência insuficiente;
- baseline inválido;
- dependência não satisfeita.

---

# 14. Module obrigatório

Um Module obrigatório é necessário para a Delivery alvo.

Enquanto obrigatório e não integrado, o Project não pode considerar satisfeita a
capacidade que ele representa.

---

# 15. Module opcional

Module opcional pode ficar fora de determinada Delivery quando isso não viola o
escopo aprovado.

A decisão deve ser explícita.

Alterar obrigatório → opcional é material quando reduz compromisso.

---

# 16. Dependências entre Modules

A dependência deve ser expressa por condição de resultado, não por simples
estado.

Evitar:

```text
Module B espera Module A INTEGRATED
```

quando o que B realmente precisa é:

```text
contrato X validado
baseline Y disponível
capacidade Z publicada
```

A condição precisa ser verificável.

---

# 17. Dependência impossível

Se uma dependência se tornar impossível:

- bloquear;
- replanejar;
- substituir;
- reduzir escopo;
- solicitar exceção;
- cancelar Module;
- escalar ao Project.

O Module não pode fingir que a dependência foi satisfeita.

---

# 18. Ciclos

Ciclo de dependência sem estratégia de convergência é inválido.

Quando dois Modules precisarem evoluir juntos, o planejamento deve explicitar:

- contrato inicial;
- ordem parcial;
- stub/protocolo temporário;
- integração progressiva;
- ou outra estratégia governada.

---

# 19. Condição BLOCKED

BLOCKED preserva intenção de continuar.

Requisitos:

- causa;
- responsável;
- impacto;
- saída;
- fallback;
- prazo/cadência;
- escalada.

Module bloqueado deve continuar visível ao Project.

---

# 20. Condição PAUSED

PAUSED suspende avanço por decisão governada.

Retomada revalida:

- Project;
- arquitetura;
- dependências;
- plano;
- findings;
- evidências;
- autoridade.

---

# 21. Estado CANCELLED

Cancelamento encerra intenção do Module.

É terminal.

---

# 22. Cancelamento e Project

Module cancelado nunca desaparece da agregação do Project.

O Project deve decidir consequência:

```text
substituir
reduzir escopo
replanejar
aceitar exceção
cancelar Delivery alvo
cancelar Project
```

conforme caso.

---

# 23. Cancelamento e Work Items

Work Items do Module devem receber tratamento governado.

Nenhum novo Work Item é autorizado.

Executions em voo perdem autoridade quando aplicável e efeitos tardios são
reconciliados.

---

# 24. Findings

Findings podem surgir em qualquer fase.

Finding bloqueador impede avanço normal.

O Module deve expor findings relevantes ao Project para agregação.

---

# 25. Handoff Project → Module

Criação de Module exige:

- Project válido;
- arquitetura ou decisão equivalente;
- responsabilidade;
- ownership;
- intenção;
- baseline de contexto.

Não basta criar registro com nome.

---

# 26. Handoff Module → Project

Ao entrar em `INTEGRATED`, o Module entrega ao Project:

- baseline;
- evidências;
- resultados;
- findings residuais;
- riscos;
- dependências satisfeitas;
- decisão de integração.

O handoff deve ser persistente e recuperável.

---

# 27. Work Items do Module

Todo Work Item com escopo governante `Module` deve:

- referenciar exatamente um Module;
- respeitar sua definição e plano;
- não ampliar escopo silenciosamente;
- preservar critérios de aceite.

---

# 28. Work Items transversais

Trabalho que afeta vários Modules pode ser governado pelo Project.

Um Module pode depender de resultado de Work Item transversal sem se tornar seu
proprietário.

---

# 29. Continuidade por estado

```text
IDENTIFIED
→ completar definição

DEFINED
→ planejar

PLANNED
→ iniciar Work Item elegível

IMPLEMENTING
→ executar/revisar trabalho

VALIDATING
→ produzir evidência

READY_FOR_INTEGRATION
→ realizar handoff e integração
```

Ausência de continuidade é inconsistência.

---

# 30. Idempotência

A mesma intenção não pode:

- criar Module duplicado;
- integrar duas vezes o mesmo baseline;
- cancelar repetidamente com efeitos duplicados;
- criar Work Items duplicados por retry.

---

# 31. Concorrência

Transições concorrentes devem detectar versão obsoleta.

Exemplo:

```text
READY_FOR_INTEGRATION → INTEGRATED
```

concorrendo com:

```text
READY_FOR_INTEGRATION → CANCELLED
```

apenas uma pode se tornar autoritativa.

---

# 32. Recovery

Falha operacional durante handoff ou integração não deve reescrever estados
anteriores.

Recovery retoma a intenção causal.

---

# 33. Reconciliation

Usada quando há dúvida:

- integração ocorreu?
- baseline foi publicado?
- Project recebeu handoff?
- efeito externo foi aplicado?

Antes de repetir, descobrir o fato.

---

# 34. Projeção para UI

A UI deve mostrar:

- Project proprietário;
- responsabilidade;
- estado;
- condição BLOCKED/PAUSED;
- obrigatoriedade;
- dependências;
- Work Items;
- baseline;
- findings;
- ações autorizadas;
- continuidade;
- histórico relevante.

---

# 35. Invariantes

```text
Module possui Project
Module possui classificação de impacto
Module representa capacidade de negócio
INTEGRATED possui baseline/evidência
CANCELLED não autoriza novo trabalho
BLOCKED possui saída
READY_FOR_INTEGRATION possui continuidade
Module não promove Project automaticamente
Module supersedido não satisfaz automaticamente baseline corrente
```

---

# 36. Proibições

Não é permitido:

- Module técnico disfarçado de capacidade;
- Module sem Project;
- integrar sem validar;
- considerar Module integrado porque todos Work Items “parecem prontos”;
- ignorar dependência impossível;
- cancelar Module sem impacto no Project;
- usar BLOCKED/PAUSED como limbo;
- reabrir INTEGRATED por mutação silenciosa.

---

# 37. Cenários mentais

## 37.1 Dependência entre Modules

B só avança quando a condição explícita fornecida por A estiver satisfeita.

## 37.2 Predecessor cancelado

B não avança automaticamente; Project precisa resolver dependência.

## 37.3 Module validado, integração falha

Permanece `READY_FOR_INTEGRATION` com recovery/reconciliation.

## 37.4 Work Item falha

Module não cancela automaticamente.

## 37.5 Nova lacuna de definição

`IMPLEMENTING → DEFINED` ou `PLANNED`, conforme causa.

---

# 38. Questões deixadas para documentos derivados

Não define:

- storage;
- eventos técnicos;
- contratos físicos;
- APIs;
- agents;
- TTL;
- locks;
- UI;
- matriz final de dependências;
- regras de deploy.

---

# 39. Critério de aprovação

Este lifecycle está pronto quando podemos responder:

- como Module nasce;
- como é definido;
- como é planejado;
- como recebe Work Items;
- como implementa;
- como valida;
- como integra;
- como depende de outro Module;
- como bloqueia;
- como pausa;
- como cancela;
- como retorna;
- como entrega resultado ao Project;
- como afeta agregação do Project.

---

# 40. Princípio final

Module existe para representar capacidade de negócio, não topologia técnica.

Ele somente avança quando sua responsabilidade atual foi cumprida e o próximo
passo possui continuidade comprovável.


---

# Decomposição do Module por Entregas de Valor

## Semântica preservada

Permanece válido:

```text
Module = capacidade de negócio coerente pertencente a exatamente um Project
```

Module continua não sendo camada técnica.

Seu lifecycle macro é:

```text
IDENTIFIED
→ DEFINED
→ PLANNED
→ IMPLEMENTING
→ VALIDATING
→ READY_FOR_INTEGRATION
→ INTEGRATED
```

A introdução de `ValueIncrement` altera a decomposição interna e os critérios de
agregação; não transforma Module em mini-Project.

---

## DEFINED → PLANNED

planejamento de Module deve incluir Entregas de Valor.

Modelo:

```text
Module DEFINED
      ↓
identificar/decompor ValueIncrements
      ↓
challenge do agente
      ↓
decisão/brainstorm governado
      ↓
ordenar/dependências/critérios
      ↓
planejar primeira(s) ValueIncrement(s)
      ↓
Module PLANNED
```

A decomposição direta:

```text
Module → Work Items
```

deixa de ser o caminho normal.

---

## Conteúdo esperado em Module.PLANNED

Inclui, conforme aplicável:

```text
ValueIncrements
ordem
dependências entre ValueIncrements
required/optional disposition para baseline alvo
critérios de valor
estratégia de validação
Work Items derivadas
Work Items transversais do Project relevantes
riscos
review/audit requirements
```

Nem todos os Work Items distantes precisam estar detalhados até o último nível,
desde que o mapa de valor do Module esteja conhecido e a próxima Entrega de Valor
possa avançar sem invenção material.

---

## Module.IMPLEMENTING

Semântica:

```text
ValueIncrements do Module estão sendo materializadas
```

Fluxo:

```text
Module
  ↓
ValueIncrement
  ↓
Work Item
  ↓
Execution
```

No MVP:

```text
1 ValueIncrement ativa por vez
1 Work Item ativa por vez
```

Essa sequencialidade é política inicial, não cardinalidade estrutural.

---

## Continuidade em IMPLEMENTING

Deve existir pelo menos uma rota válida:

```text
ValueIncrement ativa
próxima ValueIncrement elegível
Work Item elegível/em progresso
review/rework
WAITING/BLOCKED governado
human decision
recovery/reconciliation
```

Ausência de todas é `Inconsistency`.

---

## IMPLEMENTING → VALIDATING

Critério:

```text
todas as ValueIncrements obrigatórias para o baseline alvo = ACCEPTED
nenhuma ValueIncrement ativa capaz de alterar baseline
nenhuma Execution em voo capaz de alterar baseline
baseline do Module identificável
continuidade para validação agregada
```

A simples conclusão de Work Items não é suficiente.

---

## Module.VALIDATING

Pergunta própria:

```text
as Entregas de Valor aceitas formam, juntas, a capacidade de negócio prometida?
```

Pode validar:

```text
coerência entre incrementos
regras de negócio agregadas
dependências
integrações internas
experiência da capacidade
segurança/dados/operação
evidência agregada
```

Isso não repete `ValueIncrement.VALIDATING`, que prova o valor local de cada
incremento.

---

## Finding sobre ValueIncrement ACCEPTED

Se Module.VALIDATING descobrir problema material em incremento já aceito:

```text
não reabrir ValueIncrement ACCEPTED
```

Criar successor/rework governado.

O Module pode retornar:

```text
VALIDATING → IMPLEMENTING
```

preservando história, baseline e causalidade.

---

## READY_FOR_INTEGRATION / INTEGRATED

Permanecem como estados de capacidade agregada.

`ValueIncrement.ACCEPTED` não significa:

```text
Module READY_FOR_INTEGRATION
Module INTEGRATED
```

Module ainda deve provar coerência agregada e realizar sua integração no Project.

---

## Impacto em agregação

Project e projections não podem usar apenas:

```text
count(WorkItems DONE)
```

nem:

```text
count(ValueIncrements ACCEPTED)
```

como regra automática.

Devem avaliar o conjunto obrigatório, baseline, dependências, validade e
condições do lifecycle do Module.

---

## Relação com Delivery Target

A agregação corrente do Module deve considerar a disposição das Entregas de
Valor no Delivery Target ativo.

Uma Entrega de Valor `OUT_OF_TARGET` não bloqueia o Module para aquela
candidatura.

Uma Entrega de Valor `OPTIONAL_FOR_TARGET` não bloqueia por ausência.

Uma Entrega de Valor `REQUIRED_FOR_TARGET` deve estar `ACCEPTED` para que o
Module possa satisfazer a capacidade exigida pelo target corrente.

A disposição é relativa ao Delivery Target e não altera a história intrínseca da
Entrega de Valor.
