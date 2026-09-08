# NAAMIVE — Work Item Lifecycle

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.3  
**Autoridade:** lifecycle específico da entidade Work Item  
**Deriva de:** `01_LIFECYCLE_MODEL.md`, `03_PROJECT_LIFECYCLE.md` e `04_MODULE_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** entidade Work Item, readiness, aceite e relação com Executions

---

# 1. Objetivo

Este documento define o lifecycle detalhado de **Work Item**.

Work Item é uma unidade planejada de mudança necessária para produzir parte do
resultado de um Project ou Module.

Seu lifecycle separa:

```text
trabalho de negócio planejado
```

de:

```text
tentativas operacionais de execução
```

Uma Work Item pode possuir várias Executions ao longo da vida.

---

# 2. Ownership

Toda Work Item possui exatamente um escopo governante:

```text
Project
ou
Module
```

Nunca ambos como owners.

Work Item de Project pode afetar vários Modules, mas continua governada pelo
Project.

---

# 3. Estados normativos

Lifecycle principal:

```text
PROPOSED
    ↓
READY
    ↓
IN_PROGRESS
    ↓
IN_REVIEW
    ↓
DONE
```

Estado terminal alternativo:

```text
CANCELLED
```

Condição transversal:

```text
BLOCKED
```

---

# 4. Estado PROPOSED

## 4.1 Significado

O trabalho foi identificado, mas ainda não possui prontidão suficiente para
execução.

---

## 4.2 Origem

Pode nascer de:

- planejamento de Project;
- planejamento de Module;
- finding;
- rework;
- necessidade de integração;
- validação;
- recovery de processo de negócio;
- mudança governada de plano.

---

## 4.3 Conteúdo mínimo

- owner;
- objetivo;
- motivo;
- intenção de negócio;
- escopo inicial;
- relação com plano;
- classificação preliminar de impacto.

---

## 4.4 Proibições

Work Item `PROPOSED` não pode gerar Execution autorizada.

---

# 5. Readiness

Para tornar-se `READY`, a Work Item precisa estar suficientemente definida.

Critérios mínimos, conforme aplicável:

- objetivo;
- owner;
- escopo;
- fora de escopo;
- critérios de aceite;
- dependências;
- classificação de impacto;
- evidências esperadas;
- autoridade para executar;
- escopo/baseline corrente do owner identificado;
- decisões materiais resolvidas;
- findings bloqueadores tratados.

---

## 5.1 Auditoria de prontidão para Work Item material ou crítica

Antes de uma Work Item `MATERIAL` ou `CRÍTICA` tornar-se executável, deve existir
auditoria independente proporcional cobrindo a decisão de avançar para
implementação.

Uma auditoria upstream pode ser reaproveitada somente quando declarar
explicitamente cobertura sobre:

- esta Work Item ou seu escopo exato;
- o mesmo baseline corrente;
- a mesma decisão material;
- critérios e riscos ainda válidos.

Cobertura genérica de Project ou Module não é suficiente por presunção.

Se qualquer desses elementos mudar, a cobertura deve ser revalidada.

---

# 6. Estado READY

## 6.1 Significado

A Work Item está apta a iniciar execução quando suas condições de elegibilidade
estiverem satisfeitas.

`READY` não significa que uma Execution já existe.

---

## 6.2 Materialidade

Work Item `MATERIAL` ou `CRÍTICA` deve provar que as decisões relevantes vieram
de concepção, arquitetura e planejamento apropriados.

A Work Item não pode ser usada para esconder uma decisão ainda não tomada.

---

## 6.3 Dependências

Dependências podem impedir Execution mesmo com Work Item `READY`.

Nesse caso a continuidade deve estar explícita.

---

# 7. Criação de Execution

Uma Execution somente pode ser criada quando:

- Work Item está `READY` ou `IN_PROGRESS` conforme retry/recovery permitido;
- intenção está válida;
- dependências estão satisfeitas;
- autoridade existe;
- não há cancelamento;
- não existe blocker incompatível;
- política permite nova tentativa;
- escopo/baseline do owner continua sendo o mesmo coberto pela readiness;
- Work Item não está `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE` pendente por mudança do owner.

---

# 8. Transição READY → IN_PROGRESS

Acontece quando a primeira Execution válida inicia a tentativa de materializar o
resultado.

A transição deve preservar a intenção lógica da Work Item.

---

# 9. Estado IN_PROGRESS

## 9.1 Significado

Existe trabalho autorizado em andamento ou continuidade operacional válida para
produzir o resultado.

---

## 9.2 Relação com Executions

Pode existir:

- uma Execution ativa;
- sequência de Executions;
- recovery após falha;
- reconciliation;
- espera técnica governada.

Mas apenas Executions autorizadas podem produzir efeito autoritativo.

---

## 9.3 Falha de Execution

`Execution FAILED` não promove Work Item automaticamente para `CANCELLED`.

A Work Item deve decidir:

```text
retry
recovery
rework
reconciliation
block
cancel
```

---

## 9.4 Nenhuma Execution ativa

`IN_PROGRESS` sem Execution ativa ainda pode ser válido se existir:

- recovery;
- reconciliation;
- ação humana;
- blocker;
- nova tentativa elegível.

Sem isso, há inconsistência.

---

# 10. Resultado técnico produzido

Quando Execution produz resultado técnico, a Work Item não vira `DONE`
automaticamente.

O resultado precisa entrar em review/validação.

Fluxo normal:

```text
IN_PROGRESS → IN_REVIEW
```

---

# 11. Estado IN_REVIEW

## 11.1 Significado

O resultado produzido está sendo avaliado contra os critérios da Work Item.

---

## 11.2 Review

Pode verificar:

- correção;
- qualidade;
- escopo;
- critérios de aceite;
- arquitetura;
- experiência;
- segurança;
- evidências;
- efeitos colaterais.

---

## 11.3 Auditoria

Work Item `MATERIAL` ou `CRÍTICA` exige auditoria independente proporcional para
a decisão material de aceite antes de `DONE`.

Auditoria realizada em nível superior só pode satisfazer esse requisito quando
cobrir explicitamente o mesmo resultado, escopo, baseline e decisão de aceite
atual.

Auditoria de prontidão anterior à implementação não substitui automaticamente a
auditoria do resultado produzido.

---

## 11.4 Resultados

```text
aceitar
rework
retornar para execução
bloquear
cancelar
```

---

# 12. Transição IN_REVIEW → DONE

Requer:

- critérios de aceite satisfeitos;
- evidências suficientes;
- review concluído;
- auditoria independente válida para `MATERIAL`/`CRÍTICA`, ou cobertura superior explicitamente equivalente;
- findings bloqueadores tratados;
- resultado autoritativo identificado;
- decisão de aceite válida.

---

# 13. Estado DONE

## 13.1 Significado

O resultado da Work Item foi aceito dentro de seu escopo.

É terminal para o lifecycle normal da instância.

---

## 13.2 DONE não significa

```text
Module INTEGRATED
Project DELIVERED
```

A Work Item apenas cumpriu seu compromisso local.

---

## 13.3 Correção futura

Work Item `DONE` não é reaberta por edição silenciosa.

Nova necessidade gera:

- rework como nova Work Item;
- nova Work Item;
- evolução governada;

conforme contexto.

---

# 14. Retorno IN_REVIEW → IN_PROGRESS

É permitido quando o resultado precisa de correção dentro do mesmo compromisso.

Uma nova Execution pode ser criada.

A Execution anterior permanece histórica.

---

# 15. Rework

Rework significa novo trabalho porque resultado anterior não foi aceito.

O sistema deve decidir se o rework:

- continua na mesma Work Item, quando ainda representa o mesmo compromisso;
- ou cria nova Work Item, quando muda escopo/decisão.

Essa regra será refinada em política, mas nunca pode apagar histórico.

---

# 16. Retorno READY → PROPOSED

Permitido quando surge nova informação que remove readiness.

Exemplos:

- dependência conceitual não resolvida;
- critério de aceite ausente;
- decisão material em aberto;
- classificação de impacto alterada.

---

# 17. Retorno IN_PROGRESS → PROPOSED

Somente quando nova evidência prova que a própria definição do trabalho está
incorreta.

Normalmente deve ocorrer via replanejamento governado.

---

# 18. Condição BLOCKED

BLOCKED preserva estado principal e intenção.

Exemplos:

```text
READY + BLOCKED
IN_PROGRESS + BLOCKED
IN_REVIEW + BLOCKED
```

---

# 19. Requisitos de blocker

- causa;
- responsável;
- condição de saída;
- impacto;
- fallback;
- prazo/cadência;
- escalada.

Blocker sem saída é inconsistência.

---

# 20. Estado CANCELLED

Cancelamento encerra a intenção da Work Item.

É terminal.

---

# 21. Cancelamento com Execution em voo

Ao cancelar:

- novas Executions são proibidas;
- Executions em voo perdem autoridade quando aplicável;
- resultado tardio não pode ser aceito automaticamente;
- efeitos externos precisam ser classificados;
- incerteza exige reconciliation;
- efeito indesejado pode exigir compensation.

---

# 22. Critérios de aceite

Toda Work Item deve possuir critérios proporcionais ao impacto.

Critério deve ser:

- verificável;
- relevante;
- rastreável ao objetivo;
- conhecido antes do aceite.

Work Item sem critério de aceite não pode chegar a `READY`, salvo caso trivial
cuja regra derivada defina evidência mínima equivalente.

---

# 23. Evidências

Evidência pode incluir:

- testes;
- artefatos;
- análise;
- logs;
- screenshots;
- resultados de validação;
- review;
- auditoria;
- prova de integração.

A existência de evidência não implica suficiência.

---

# 24. Classificação de impacto

A Work Item herda contexto do owner, mas possui classificação própria.

Uma Work Item pode elevar o impacto do contexto.

Ela também deve herdar qualquer piso de criticidade do owner que seja
materialmente aplicável ao seu escopo. Redução abaixo desse piso exige
justificativa rastreável e autoridade adequada.

Exemplo:

```text
Project MATERIAL
Work Item de autorização = CRÍTICA
```

---

# 25. Validade após mudança do owner

Quando Project ou Module governante alterar materialmente escopo, arquitetura,
plano, baseline ou intenção, a Work Item deve receber uma classificação de
cobertura:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

Enquanto potencialmente afetada e ainda não classificada, não pode gerar nova
Execution.

`READY` não é autorização eterna. A elegibilidade precisa confirmar o contexto
atual do owner a cada nova tentativa.

Work Item `DONE` permanece histórica; se seu resultado deixou de servir ao
baseline corrente, novo trabalho ou sucessão deve ser criado em vez de reabri-la
silenciosamente.

---

# 26. Não invenção silenciosa

Se durante execução surgir pergunta material:

```text
não escolher sozinho
```

A Work Item deve:

- registrar questão;
- interromper parte afetada;
- escalar ao owner;
- retornar ao planejamento/concepção apropriados;
- preservar continuidade.

---

# 27. Findings

Findings podem nascer em review ou auditoria.

Finding bloqueador impede `DONE`.

Exceção, quando permitida, deve ser explícita e rastreável.

---

# 28. Dependências

Toda dependência relevante deve possuir condição verificável.

Work Item não pode ser marcada `READY` se depende de decisão ainda inexistente,
salvo quando a própria condição de elegibilidade estiver explicitamente
representada e impedir Execution até satisfação.

---

# 29. Dependência impossível

Pode produzir:

- BLOCKED;
- retorno para planejamento;
- substituição;
- cancelamento;
- exceção governada.

Nunca satisfação fictícia.

---

# 30. Continuidade por estado

```text
PROPOSED
→ completar definição

READY
→ criar Execution quando elegível

IN_PROGRESS
→ executar/recover/reconcile

IN_REVIEW
→ revisar/auditar/decidir
```

Se não existir caminho acionável, há inconsistência.

---

# 31. Intenção lógica

A Work Item representa um compromisso lógico.

Executions são tentativas desse compromisso.

Retry técnico não cria nova Work Item.

Mudança material de objetivo pode exigir nova Work Item.

---

# 32. Idempotência

A mesma intenção não pode:

- duplicar Work Item;
- duplicar aceite;
- criar múltiplos resultados autoritativos;
- gerar efeitos repetidos por retry.

---

# 33. Concorrência

Pode haver concorrência técnica, mas somente resultado autorizado pode promover a
Work Item.

Se duas Executions competirem, mecanismo de fencing/versionamento deve impedir
dupla publicação autoritativa.

---

# 34. Handoff Work Item → Execution

Exige:

- Work Item;
- intenção;
- baseline/contexto;
- critérios;
- autoridade;
- dependências satisfeitas;
- versão;
- Execution criada de forma idempotente.

---

# 35. Handoff Execution → Work Item

Execution entrega:

- resultado;
- evidências;
- efeito observado;
- status técnico;
- versão;
- causalidade.

A Work Item decide se o resultado é suficiente para `IN_REVIEW` ou exige outro
tratamento.

---

# 36. Recovery

Após `Execution FAILED`, recovery cria nova Execution.

Antes disso, deve revalidar:

- intenção;
- autoridade;
- dependências;
- estado da Work Item;
- certeza do efeito anterior;
- segurança de repetir.

---

# 37. Reconciliation

É obrigatória quando não se sabe se a Execution anterior produziu efeito.

Não criar nova tentativa cega antes de resolver incerteza quando houver risco de
duplicação.

---

# 38. Projeção para UI

A UI deve mostrar:

- owner;
- estado;
- blocker;
- classificação;
- critérios;
- dependências;
- Executions;
- resultado atual;
- findings;
- ações autorizadas;
- continuidade.

---

# 39. Invariantes

```text
Work Item possui owner
Execution pertence a Work Item
PROPOSED não gera execução autorizada
READY possui critérios suficientes
Execution SUCCEEDED ≠ DONE
DONE possui aceite
CANCELLED não autoriza nova Execution
BLOCKED possui saída
Execution nova exige escopo/baseline atual do owner
```

---

# 40. Proibições

Não é permitido:

- Work Item sem owner;
- Work Item READY sem definição suficiente;
- usar Work Item como depósito de decisão material não tomada;
- promover DONE por sucesso técnico;
- reabrir DONE silenciosamente;
- duplicar efeito por retry;
- cancelar e aceitar resultado tardio automaticamente;
- esconder ausência de continuidade com BLOCKED.

---

# 41. Cenários mentais

## 41.1 Execution falha sem efeito

Recovery pode criar nova Execution.

## 41.2 Timeout com efeito incerto

Reconciliation antes de repetir.

## 41.3 Review rejeita resultado

`IN_REVIEW → IN_PROGRESS`.

## 41.4 Nova decisão arquitetural surge

Work Item deixa de avançar e escala ao owner.

## 41.5 Mesmo botão acionado duas vezes

Uma intenção; efeitos não duplicam.

---

# 42. Questões deixadas para documentos derivados

Não define:

- schema;
- API;
- filas;
- lease;
- timeout;
- retry count;
- agents;
- UI física;
- formato de evidência;
- severidade técnica.

---

# 43. Critério de aprovação

Este lifecycle está pronto quando podemos responder:

- como Work Item nasce;
- quando fica READY;
- quando gera Execution;
- como lida com falha;
- como entra em review;
- como chega a DONE;
- como rework funciona;
- como cancela;
- como bloqueia;
- como dependências funcionam;
- como resultado técnico vira ou não aceite;
- como concorrência e retry não duplicam efeito.

---

# 44. Princípio final

Work Item representa trabalho governado.

Execution representa tentativa.

**Tentativa bem-sucedida não é sinônimo de trabalho aceito.**


---

# Desenvolvimento interno e vínculo com ValueIncrement

## Ownership delta

Para Work Item governada por Module no fluxo normal de implementação:

```text
Module
→ ValueIncrement
→ Work Item
```

A Work Item deve referenciar sua `ValueIncrement`.

Project-scoped Work Item transversal permanece permitida.

---

## IN_PROGRESS

`IN_PROGRESS` continua sendo estado da Work Item.

Seu progresso funcional detalhado é representado por:

```text
Development Cycle Instance
Development Steps
Development Roadmap
```

sem alterar o macro lifecycle.

---

## IN_PROGRESS → IN_REVIEW

Requer conclusão aplicável do ciclo:

```text
PREPARE_WORK
IMPLEMENT_CHANGE
VERIFY_CHANGE
MATERIALIZE_CANDIDATE
VERIFY_CANDIDATE
PREPARE_REVIEW
```

Passos explicitamente `NOT_APPLICABLE` não bloqueiam.

---

## IN_REVIEW

Seu ciclo interno:

```text
REVIEW_RESULT
VERIFY_ACCEPTANCE
READY_FOR_DECISION
```

---

## IN_REVIEW → IN_PROGRESS

Cria nova Development Cycle Instance causal.

Não reseta a anterior.

---

## Impedimentos

Finding descoberto deve:

```text
persistir
ser classificado no escopo afetado
produzir continuity
ser inserido no Development Roadmap quando exigir tratamento
```

`NON_BLOCKING` não encerra trabalho ainda elegível.

`BLOCKING` bloqueia o affected scope.

---

## DONE

`DONE` continua terminal.

Development Roadmap não autoriza reabrir Work Item `DONE`.

Correção material futura cria novo trabalho/sucessão.

---
