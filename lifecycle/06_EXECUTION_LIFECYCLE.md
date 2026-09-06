# NAAMIVE — Execution Lifecycle

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** lifecycle operacional específico da entidade Execution  
**Deriva de:** `01_LIFECYCLE_MODEL.md` e `05_WORK_ITEM_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** entidade Execution, autoridade operacional, concorrência, recovery e reconciliation

---

# 1. Objetivo

Este documento define o lifecycle operacional de **Execution**.

Execution é uma tentativa concreta, causal e auditável de realizar uma Work Item
autorizada.

O objetivo deste lifecycle é garantir:

- autoridade operacional verificável;
- idempotência;
- concorrência segura;
- fencing contra executor obsoleto;
- preservação de falhas;
- retry governado;
- recovery causal;
- reconciliation de efeitos incertos;
- cancelamento seguro;
- handoffs duráveis;
- ausência de zombie execution.

---

# 2. Regra fundamental

Toda Execution pertence a exatamente uma Work Item.

É inválido:

```text
Execution sem Work Item
```

A Execution também deve possuir vínculo com uma intenção lógica.

---

# 3. Estados normativos

Lifecycle principal:

```text
CREATED
    ↓
ELIGIBLE
    ↓
RUNNING
    ↓
SUCCEEDED
```

Estados terminais alternativos:

```text
FAILED
CANCELLED
```

Condições de controle que revogam autoridade:

```text
STALE
EXPIRED
```

`STALE` e `EXPIRED` não são sucesso nem falha de negócio.

São razões pelas quais uma Execution deixa de poder publicar resultado
autoritativo.

Quando aplicável, a Execution deve terminar em `CANCELLED` com a razão de
controle preservada.

---

# 4. Estado CREATED

## 4.1 Significado

A tentativa foi registrada, mas ainda não está autorizada a executar.

---

## 4.2 Conteúdo mínimo

- Execution ID;
- Work Item;
- intenção lógica;
- tentativa/causalidade;
- `normative_baseline_ref`;
- baseline ou versão da Work Item;
- escopo/baseline corrente do Project ou Module governante;
- principal esperado ou classe de executor;
- instante de criação;
- origem da criação;
- motivo: primeira tentativa, retry ou recovery.

---

## 4.3 Proibições

`CREATED` não pode:

- executar efeito externo;
- promover Work Item;
- publicar resultado autoritativo.

---

# 5. Elegibilidade

Antes de entrar em `ELIGIBLE`, devem ser verificadas:

- Work Item válida;
- estado compatível;
- intenção válida;
- dependências satisfeitas;
- ausência de cancelamento;
- ausência de blocker incompatível;
- política de retry/recovery satisfeita;
- autoridade disponível;
- versão/baseline corrente da Work Item e de seu owner;
- Work Item não pendente de `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE` por mudança governante;
- nenhum resultado autoritativo já consolidado que torne a tentativa inválida.

---

# 6. Estado ELIGIBLE

## 6.1 Significado

A Execution está autorizada a competir pela execução, mas ainda não possui claim
operacional ativo.

---

## 6.2 Claim

Para iniciar `RUNNING`, um executor deve adquirir autoridade operacional
exclusiva ou equivalentemente protegida para aquela tentativa.

A tecnologia pode usar:

- lease;
- token;
- generation;
- compare-and-set;
- fencing token;
- mecanismo equivalente.

A garantia é obrigatória; a tecnologia não.

---

# 7. Transição ELIGIBLE → RUNNING

Requer:

- claim válido;
- principal verificável;
- autorização revalidada;
- versão corrente;
- intenção ainda válida;
- Work Item não cancelada;
- ausência de resultado final concorrente.

---

# 8. Estado RUNNING

## 8.1 Significado

A tentativa possui autoridade operacional vigente para executar trabalho.

---

## 8.2 Autoridade não é permanente

A Execution deve provar que continua autorizada antes de publicar efeito
autoritativo.

Claim perdido, lease expirado, versão obsoleta, mudança incompatível do
escopo/baseline governante ou cancelamento revogam autoridade.

---

## 8.3 Heartbeat / renovação

A política física pode usar heartbeat ou mecanismo equivalente.

Este documento não define frequência.

Mas uma Execution não pode permanecer `RUNNING` indefinidamente sem mecanismo
que permita distinguir:

```text
executor ativo
vs
executor desaparecido
```

---

# 9. Resultado técnico

Ao concluir trabalho, o executor produz:

- resultado;
- evidências;
- status técnico;
- efeitos externos conhecidos;
- correlação;
- versão;
- principal;
- timestamps relevantes.

Antes de publicar `SUCCEEDED`, deve revalidar autoridade **e** provar que
Work Item, escopo e baseline do owner continuam sendo os mesmos para os quais a
Execution foi autorizada, ou que houve `KEEP`/`REVALIDATE` explícito cobrindo a
mudança.

---

# 10. Estado SUCCEEDED

## 10.1 Significado

A Execution produziu tecnicamente o resultado esperado e conseguiu registrá-lo
de forma autoritativa.

É terminal.

---

## 10.2 Limite semântico

`SUCCEEDED` significa:

```text
a tentativa conseguiu produzir seu resultado técnico
```

Não significa:

```text
Work Item DONE
Module INTEGRATED
Project DELIVERED
```

---

# 11. Estado FAILED

## 11.1 Significado

A Execution terminou sem produzir o resultado técnico esperado ou sem conseguir
concluir de forma válida.

É terminal.

---

## 11.2 História imutável

`FAILED` não pode ser ressuscitada.

É proibido:

```text
FAILED → RUNNING
FAILED → ELIGIBLE
```

Recovery cria nova Execution.

---

# 12. Estado CANCELLED

## 12.1 Significado

A Execution não possui mais intenção ou autoridade de continuar.

É terminal.

Motivos podem incluir:

- Work Item cancelada;
- Project/Module cancelado;
- supersessão;
- claim perdido;
- STALE;
- EXPIRED;
- decisão explícita;
- conflito resolvido por outra Execution.

---

# 13. Condição STALE

## 13.1 Significado

A Execution foi criada sob contexto que não é mais atual.

Exemplos:

- versão do Work Item mudou;
- nova geração substituiu a tentativa;
- outro resultado tornou a tentativa obsoleta;
- escopo foi alterado;
- autorização foi revogada;
- Project/Module governante mudou escopo, arquitetura, plano ou baseline de modo incompatível.

---

## 13.2 Efeito

Execution STALE não pode publicar estado autoritativo.

Se ainda estiver ativa, deve terminar em `CANCELLED` com razão `STALE`.

---

# 14. Condição EXPIRED

## 14.1 Significado

A autoridade temporal ou lease da Execution expirou.

---

## 14.2 Efeito

A Execution não pode continuar promovendo estado.

Se o executor reaparecer, deve ser tratado como obsoleto.

Não basta renovar retroativamente autorização perdida.

---

# 15. Fencing

Fencing impede zombie executor.

Regra:

```text
quem não possui a geração/autorização atual não publica resultado
```

Mesmo que o processo físico continue rodando.

---

# 16. Verificação antes de efeito externo

Quando possível, autoridade deve ser validada antes de produzir efeito externo.

Quando o sistema externo permitir idempotency key ou mecanismo equivalente, a
intenção lógica deve ser propagada.

---

# 17. Efeito externo irreversível

Se a ação puder produzir efeito externo não transacional:

- intenção deve ser identificável;
- idempotência deve ser planejada;
- estado do efeito deve ser observável quando possível;
- reconciliation deve existir;
- compensation deve existir quando aplicável.

---

# 18. Timeout não significa falha conhecida

Timeout pode significar:

```text
não houve efeito
ou
houve efeito e não vimos resposta
```

Portanto, timeout com efeito incerto não autoriza retry cego.

Primeiro:

```text
RECONCILIATION
```

quando duplicação puder ser prejudicial.

---

# 19. Retry

Retry é nova tentativa técnica da mesma intenção.

Pode reutilizar ou criar nova Execution conforme modelo físico, mas fatos
históricos devem permanecer distintos.

Neste modelo normativo, cada tentativa auditável é uma nova Execution.

---

# 20. Pré-condições de retry

Retry somente é permitido quando:

- intenção continua válida;
- Work Item continua apta;
- política permite;
- efeito anterior é conhecido como não produzido ou repetição é idempotente;
- autoridade está válida;
- limite/política de tentativas permite.

---

# 21. Recovery

Recovery é usado após falha terminal quando a causa foi corrigida ou existe nova
estratégia segura.

Recovery:

```text
FAILED Execution
    ↓
causa compreendida/corrigida
    ↓
nova Execution
```

A nova Execution referencia causalmente a anterior.

---

# 22. Revalidação para recovery

Antes de criar recovery:

- intenção;
- Work Item;
- estado;
- norma;
- autoridade;
- dependências;
- causa;
- efeitos anteriores;
- segurança de repetir;
- findings.

Tudo deve ser revalidado.

---

# 23. Reconciliation

Reconciliation resolve dúvida entre:

```text
estado canônico
e
efeito observado
```

Exemplos:

- API externa talvez processou;
- arquivo talvez foi publicado;
- handoff talvez foi aceito;
- executor perdeu conexão após efeito.

---

# 24. Resultados de reconciliation

Pode concluir:

```text
efeito não ocorreu
→ retry/recovery possível

efeito ocorreu corretamente
→ consolidar fato de forma governada

efeito ocorreu parcialmente
→ recovery ou compensation

efeito ocorreu incorretamente
→ compensation / escalada

efeito continua desconhecido
→ blocker/escalada
```

---

# 25. Compensation

Compensation não apaga fato anterior.

Ela produz novo fato destinado a neutralizar ou mitigar efeito.

---

# 26. Concorrência

Duas Executions da mesma intenção não devem produzir dois resultados
autoritativos.

Pode existir corrida física, mas a autoridade lógica precisa ser única.

---

# 27. Resultado autoritativo único

Antes de consolidar `SUCCEEDED`, deve ser verificado que:

- a Execution ainda possui autoridade;
- nenhuma execução concorrente já consolidou resultado incompatível;
- a versão esperada ainda é atual;
- o escopo/baseline governante ainda é compatível;
- a intenção não foi cancelada.

---

# 28. Duplo clique / request duplicada

Camadas superiores podem disparar a mesma intenção repetidamente.

Isso não deve produzir Executions logicamente duplicadas sem necessidade.

A criação de Execution deve ser idempotente em relação à chave de intenção e à
política de tentativa.

---

# 29. Handoff para executor

Um handoff de execução deve incluir:

- Execution;
- intenção;
- Work Item;
- versão;
- contexto;
- evidências/inputs;
- autoridade requerida;
- correlação.

A origem não considera o handoff concluído apenas porque publicou mensagem.

---

# 30. Aceite do handoff

Deve existir prova de que:

- o destino aceitou; ou
- a intenção permaneceu em mecanismo durável e recuperável.

Perda de mensagem não pode criar dead-end invisível.

---

# 31. Handoff de resultado

Ao terminar, Execution entrega resultado para Work Item.

Esse handoff deve ser idempotente.

Repetir entrega do mesmo resultado não pode duplicar aceite nem efeitos.

---

# 32. Continuidade por estado

```text
CREATED
→ avaliar elegibilidade

ELIGIBLE
→ adquirir claim

RUNNING
→ executar / concluir / falhar / cancelar
```

Estados terminais não exigem continuidade da mesma Execution.

A continuidade passa à Work Item quando necessário.

---

# 33. Dead-ends proibidos

São inválidos:

- CREATED sem processo de elegibilidade ou cancelamento;
- ELIGIBLE sem possibilidade de claim/escalada;
- RUNNING sem mecanismo de detectar executor desaparecido;
- efeito incerto sem reconciliation;
- FAILED aguardando “ressurreição”;
- STALE ainda promovendo estado.

---

# 34. Fail-closed

Se a Execution não consegue provar:

- identidade;
- autoridade;
- versão;
- intenção;
- claim;
- pré-condições;

ela não executa ou não publica efeito autoritativo.

---

# 35. Fail-closed e continuidade

Ao bloquear publicação, o sistema deve materializar condição tratável:

- CANCELLED;
- FAILED;
- reconciliation;
- blocker;
- nova elegibilidade;
- escalada;

conforme causa.

Nunca apenas parar silenciosamente.

---

# 36. Cancelamento durante RUNNING

Cancelamento pode chegar diretamente da Work Item ou por propagação de seu
Project/Module governante. Em ambos os casos, a Execution deve tratar a perda de
autoridade de forma equivalente.

Quando cancelamento é conhecido:

- revogar autoridade;
- impedir novos efeitos quando possível;
- não aceitar resultado tardio automaticamente;
- registrar estado;
- reconciliar efeito externo;
- compensar quando necessário.

---

# 37. Resultado tardio

Um executor pode concluir depois de perder autoridade.

Resultado tardio:

```text
não promove estado
```

Pode ser armazenado como evidência histórica.

Se houver efeito externo, reconciliation decide tratamento.

---

# 38. Falha depois de produzir efeito

Pode acontecer:

```text
efeito externo ocorreu
+
registro local falhou
```

Não classificar automaticamente como simples `FAILED` repetível.

O caso exige conhecimento do efeito.

Se incerto:

```text
reconciliation
```

---

# 39. Falha de persistência do resultado

Se efeito técnico foi produzido mas a publicação autoritativa falhou:

- não inventar sucesso;
- preservar evidência;
- reconciliar;
- consolidar apenas se autoridade e causalidade puderem ser provadas.

---

# 40. Autoridade por principal

Execution registra principal executor.

Um principal não recebe autoridade apenas porque informou role ou identidade na
requisição.

A fonte de autorização deve ser canônica.

---

# 41. Delegação e revogação

Delegação precisa possuir:

- origem;
- escopo;
- validade;
- revogabilidade;
- rastreabilidade.

Revogação deve impedir novas promoções.

---

# 42. Evidências

Execution deve produzir evidências proporcionais à ação.

Podem incluir:

- output;
- logs relevantes;
- artefatos;
- checks;
- testes;
- referências;
- efeitos externos;
- timestamps;
- identidade;
- versão.

---

# 43. Observabilidade

Deve ser possível observar:

- estado;
- principal;
- claim;
- idade;
- intenção;
- Work Item;
- tentativa causal;
- resultado;
- erro;
- efeito externo;
- condição STALE/EXPIRED;
- próxima ação.

---

# 44. Projeção

UI/API de Execution não inventa capacidade.

Ações como:

```text
retry
cancel
recover
reconcile
```

só aparecem quando autorizadas pela projeção canônica.

---

# 45. Segurança contra repetição infinita

Retry automático ilimitado é proibido.

A política deve possuir limite, condição, backoff ou outro controle proporcional.

Ao esgotar política, a Execution permanece terminal e a Work Item recebe
continuidade governada.

---

# 46. Erro determinístico

Erro conhecido como determinístico não deve sofrer retry automático cego.

Deve gerar:

- finding;
- blocker;
- rework;
- recovery após mudança;
- escalada;

conforme caso.

---

# 47. Erro transitório

Pode permitir retry quando:

- política autoriza;
- efeito é seguro;
- intenção continua válida.

---

# 48. Causalidade

Toda nova tentativa deve indicar por que existe.

Exemplos:

```text
initial
retry_of
recovery_of
replacement_of
```

Os nomes físicos serão definidos depois.

---

# 49. Histórico

É proibido apagar Executions antigas para “limpar” histórico.

Retenção física pode possuir política, mas a cadeia causal necessária à
auditoria deve permanecer preservada.

---

# 50. Invariantes

```text
Execution possui Work Item
Execution possui intenção
RUNNING possui autoridade vigente
Execution autoritativa possui escopo/baseline governante atual
SUCCEEDED é terminal
FAILED é terminal
CANCELLED é terminal
FAILED não ressuscita
STALE não promove estado
EXPIRED não promove estado
resultado tardio não promove estado
retry/recovery preservam causalidade
efeito incerto exige reconciliation quando repetição não é segura
```

---

# 51. Proibições

Não é permitido:

- RUNNING sem claim válido;
- renovar autoridade retroativamente depois de perdida;
- transformar FAILED em RUNNING;
- retry cego após timeout de efeito incerto;
- aceitar resultado de executor stale;
- esconder zombie em RUNNING eterno;
- publicar dois resultados autoritativos para mesma intenção;
- cancelar e ainda aceitar promoção tardia;
- apagar falha histórica.

---

# 52. Cenários mentais

## 52.1 Worker morre antes do efeito

Lease expira; Execution perde autoridade; nova tentativa pode ser criada após
tratamento.

## 52.2 Worker produz efeito e morre

Reconciliation antes de repetir.

## 52.3 Worker antigo reaparece

STALE; não promove estado.

## 52.4 Dois workers recebem mesma tarefa

Apenas claim/fence válido publica resultado.

## 52.5 Work Item cancelada durante execução

Execution perde autoridade; efeitos tardios são reconciliados.

## 52.6 Falha terminal corrigida depois

Nova Execution `recovery_of` anterior.

---

# 53. Questões deixadas para políticas e contratos

Não define:

- duração de lease;
- algoritmo de retry;
- backoff;
- fila;
- broker;
- banco;
- lock físico;
- idempotency key concreta;
- payload;
- worker;
- linguagem;
- agente;
- timeout exato;
- formato de heartbeat.

---

# 54. Critério de aprovação

Este lifecycle está pronto quando podemos responder:

- como Execution nasce;
- quando fica elegível;
- como adquire autoridade;
- como roda;
- como termina;
- como evita zombie;
- como retry funciona;
- como recovery funciona;
- quando reconciliation é obrigatória;
- como resultado tardio é tratado;
- como cancelamento revoga autoridade;
- como concorrência não duplica efeito;
- como a Work Item recebe resultado.

---

# 55. Princípio final

Execution é uma tentativa, não a verdade de negócio.

Ela só pode produzir efeito autoritativo enquanto conseguir provar:

```text
intenção válida
+
estado compatível
+
identidade
+
autoridade
+
claim atual
+
versão atual
```

Quando essa prova deixa de existir, a Execution perde o direito de avançar o
sistema — mesmo que o processo físico ainda esteja vivo.
