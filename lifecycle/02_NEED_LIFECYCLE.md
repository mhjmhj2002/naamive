# NAAMIVE — Need Lifecycle

**Status:** RATIFIED  
**Versão:** 0.4  
**Autoridade:** lifecycle específico da entidade Need  
**Deriva de:** `01_LIFECYCLE_MODEL.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** entidade Need e seu handoff governado para Project

---

# 1. Objetivo

Este documento define o lifecycle detalhado da entidade **Need**.

Need representa uma necessidade governada de negócio.

Este lifecycle existe para garantir que uma demanda não seja transformada
diretamente em solução ou implementação sem antes passar por entendimento,
qualificação, descoberta, maturidade e decisão de compromisso.

Este documento não define:

- tecnologia;
- banco de dados;
- APIs;
- agentes concretos;
- prompts;
- tabelas;
- migrations;
- UI;
- payloads físicos.

Esses detalhes serão derivados depois.

---

# 2. Papel da Need

Toda jornada governada do NAAMIVE começa por uma Need.

Uma Need pode representar:

- problema;
- oportunidade;
- correção;
- melhoria;
- evolução;
- adequação;
- mudança relevante.

A Need responde primeiro:

```text
o que precisa mudar e por quê?
```

e não:

```text
qual tecnologia vamos usar?
```

## 2.1 Need de evolução

Quando a Need representa mudança em produto já entregue, ela deve ser
classificada explicitamente como **Need de evolução** e possuir vínculo
obrigatório com a Delivery ou baseline predecessora que está sendo alterada.

Esse vínculo não é informação opcional. Ele é parte da origem da Need e deve
permanecer rastreável durante qualificação, discovery, compromisso e criação do
Project sucessor.

Se a Delivery/baseline predecessora ainda não puder ser identificada, a Need não
pode ser aceita; deve permanecer em qualificação/discovery ou espera governada
até a causalidade ser resolvida.

---

# 3. Princípios do lifecycle de Need

O lifecycle de Need deve preservar:

- origem de negócio;
- rastreabilidade;
- não-invenção silenciosa;
- maturidade proporcional;
- decisão explícita;
- continuidade acionável;
- histórico imutável;
- autoridade verificável.

Uma Need não pode originar Project enquanto não atingir maturidade suficiente e
não receber compromisso governado.

---

# 4. Estados normativos

O lifecycle de Need possui os estados:

```text
CAPTURED
    ↓
QUALIFYING
    ↓
IN_DISCOVERY
    ↓
READY_FOR_COMMITMENT
    ↓
ACCEPTED
```

Estados alternativos:

```text
WAITING
REJECTED
CANCELLED
```

Estados terminais:

```text
ACCEPTED
REJECTED
CANCELLED
```

`WAITING` não é terminal.

---

# 5. Visão geral das transições

Fluxo principal:

```text
CAPTURED
    ↓
QUALIFYING
    ↓
IN_DISCOVERY
    ↓
READY_FOR_COMMITMENT
    ↓
ACCEPTED
```

Retornos possíveis:

```text
READY_FOR_COMMITMENT
    ↓
IN_DISCOVERY
```

```text
IN_DISCOVERY
    ↓
QUALIFYING
```

Transições alternativas possíveis, conforme regra:

```text
CAPTURED → CANCELLED
QUALIFYING → REJECTED
QUALIFYING → WAITING
QUALIFYING → CANCELLED
IN_DISCOVERY → WAITING
IN_DISCOVERY → REJECTED
IN_DISCOVERY → CANCELLED
READY_FOR_COMMITMENT → IN_DISCOVERY
READY_FOR_COMMITMENT → REJECTED
READY_FOR_COMMITMENT → CANCELLED
WAITING → estado anterior elegível
WAITING → CANCELLED
```

---

# 6. Estado CAPTURED

## 6.1 Significado

A Need foi registrada.

Existe uma intenção inicial de investigar um problema, oportunidade ou mudança.

Ainda não existe:

- compromisso de Project;
- solução aprovada;
- arquitetura;
- plano de execução.

---

## 6.2 Evidência mínima de entrada

A Need deve possuir, no mínimo:

- título ou identificação;
- descrição inicial;
- origem;
- principal responsável pela submissão;
- instante de criação;
- problema ou oportunidade percebida.

Quando possível, deve incluir:

- quem é afetado;
- contexto;
- resultado desejado;
- urgência percebida;
- evidências existentes.

---

## 6.3 O que não é permitido em CAPTURED

Não é permitido:

- criar Project automaticamente;
- iniciar implementação;
- assumir arquitetura;
- assumir solução técnica;
- tratar descrição vaga como requisito fechado.

---

## 6.4 Continuidade obrigatória

Uma Need em `CAPTURED` deve possuir continuidade para:

```text
iniciar qualificação
ou
cancelar
```

Se não existir responsável ou ação capaz de avançar, há inconsistência de
continuidade.

---

## 6.5 Saída normal

```text
CAPTURED → QUALIFYING
```

Pré-condições mínimas:

- Need registrada;
- ownership conhecido;
- intenção ainda válida;
- autoridade para iniciar qualificação.

---

# 7. Estado QUALIFYING

## 7.1 Significado

A Need está sendo avaliada para determinar se merece continuar.

Qualificação não busca desenhar a solução completa.

Busca responder:

```text
vale a pena investir em discovery?
```

---

## 7.2 Perguntas mínimas

A qualificação deve buscar resposta proporcional para:

- existe problema ou oportunidade real?
- quem é afetado?
- existe valor potencial?
- a Need já é atendida por algo existente?
- há duplicidade?
- há contradição com objetivo maior?
- existem restrições óbvias?
- existe informação mínima para continuar?
- existe motivo para rejeitar imediatamente?
- qual impacto inicial parece provável?

---

## 7.3 Classificação inicial de impacto

Durante `QUALIFYING`, a Need deve receber uma classificação inicial:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

Essa classificação é preliminar e pode mudar durante discovery.

Na dúvida, aplica-se a classificação de maior impacto.

---

## 7.4 Resultados válidos

A qualificação pode resultar em:

```text
seguir para discovery
rejeitar
aguardar informação externa
cancelar
```

---

## 7.5 Transição normal

```text
QUALIFYING → IN_DISCOVERY
```

Pré-condições:

- Need demonstra valor suficiente para investigação;
- não existe impedimento conhecido que exija rejeição;
- existe continuidade para discovery.

---

## 7.6 Rejeição

```text
QUALIFYING → REJECTED
```

Exige:

- justificativa;
- autoridade;
- evidência suficiente;
- registro histórico.

Motivos possíveis:

- duplicidade;
- ausência de valor;
- incompatibilidade com objetivo;
- inviabilidade manifesta;
- problema já resolvido;
- demanda fora do escopo;
- risco inaceitável sem benefício proporcional.

---

## 7.7 Espera

```text
QUALIFYING → WAITING
```

Somente é válida quando existe dependência externa real e conhecida.

Exemplo:

```text
aguardando informação obrigatória do solicitante
aguardando decisão externa
aguardando evidência necessária
```

A espera deve possuir:

- responsável;
- causa;
- condição de saída;
- prazo ou cadência;
- escalada.

## 7.8 Cancelamento durante qualificação

```text
QUALIFYING → CANCELLED
```

É válido quando a intenção de continuar é encerrada antes do discovery.

Exige autoridade, motivo, instante e preservação do histórico já produzido.

---

# 8. Estado IN_DISCOVERY

## 8.1 Significado

A Need está sendo amadurecida.

Aqui o foco é compreender profundamente:

```text
o que realmente precisa ser resolvido?
```

e ainda não:

```text
como vamos codificar?
```

---

## 8.2 Atividades possíveis

Conforme materialidade:

- entrevistas;
- perguntas;
- brainstorm;
- análise de negócio;
- análise de domínio;
- análise de usuário;
- levantamento de jornada;
- alternativas;
- restrições;
- dependências;
- riscos;
- critérios de sucesso;
- impacto;
- escopo;
- hipóteses;
- validação de premissas.

---

## 8.3 Brainstorm obrigatório

Para Need `MATERIAL` ou `CRÍTICA`, discovery deve incluir brainstorm estruturado
quando existirem decisões relevantes em aberto.

Brainstorm deve buscar:

- lacunas;
- alternativas;
- premissas;
- contradições;
- riscos;
- impactos;
- perguntas não respondidas.

---

## 8.4 Participação de agentes

Agentes podem:

- fazer perguntas;
- propor alternativas;
- desafiar premissas;
- apontar riscos;
- identificar requisitos faltantes;
- sugerir especialistas;
- indicar necessidade de revisão adicional.

Agente não pode:

- assumir decisão material silenciosamente;
- declarar Need pronta sem critérios;
- aprovar compromisso humano;
- classificar seu próprio trabalho para escapar de controles.

---

# 9. Artefato de maturidade da Need

Antes de sair de `IN_DISCOVERY`, a Need deve possuir um registro de maturidade.

Esse registro deve responder, conforme aplicável:

```text
Problema:
Usuários / afetados:
Resultado desejado:
Valor esperado:
Escopo inicial:
Fora de escopo:
Restrições:
Riscos:
Dependências:
Alternativas consideradas:
Premissas:
Questões abertas:
Critérios de sucesso:
Impacto:
Classificação:
Delivery/baseline predecessora (obrigatória para evolução):
```

Não é necessário que todos os campos tenham o mesmo nível de detalhe em toda
Need.

Mas lacuna material não pode ser escondida.

---

# 10. Questões abertas

Questões abertas devem ser classificadas.

Exemplos:

```text
NÃO BLOQUEADORA
BLOQUEADORA
DEPENDÊNCIA EXTERNA
RISCO ACEITÁVEL
PRECISA DE DECISÃO
```

Uma Need não pode entrar em `READY_FOR_COMMITMENT` se possuir questão bloqueadora
sem tratamento governado.

---

# 11. Revisão de discovery

Antes de uma Need material sair de discovery, deve haver revisão.

A revisão pergunta:

```text
o entendimento produzido faz sentido?
```

Ela pode avaliar:

- coerência;
- completude;
- domínio;
- experiência;
- risco;
- valor;
- escopo;
- contradições.

---

# 12. Auditoria de prontidão

Antes de:

```text
IN_DISCOVERY → READY_FOR_COMMITMENT
```

uma Need `MATERIAL` ou `CRÍTICA` deve passar por auditoria de prontidão.

A auditoria verifica:

- problema compreendido;
- usuários ou afetados conhecidos;
- valor explícito;
- alternativas relevantes consideradas;
- riscos conhecidos;
- dependências identificadas;
- critérios de sucesso definidos;
- questões abertas classificadas;
- findings bloqueadores tratados;
- classificação de impacto válida;
- Delivery/baseline predecessora identificada quando for Need de evolução;
- continuidade futura possível.

---

# 13. Estado READY_FOR_COMMITMENT

## 13.1 Significado

A Need está suficientemente madura para decisão de compromisso.

Isso não significa que ela será aprovada.

Significa apenas:

```text
temos informação suficiente para decidir
```

---

## 13.2 Condições mínimas

Para entrar em `READY_FOR_COMMITMENT`, devem existir:

- discovery suficiente;
- revisão adequada;
- auditoria satisfatória quando exigida;
- ausência de finding bloqueador não tratado;
- impacto conhecido;
- escopo inicial compreendido;
- vínculo predecessor válido quando for evolução;
- decisão possível.

---

## 13.3 Ações possíveis

A autoridade pode:

```text
ACEITAR
DEVOLVER PARA DISCOVERY
REJEITAR
CANCELAR
```

---

# 14. Compromisso

O compromisso responde:

```text
vamos transformar esta Need em Project governado?
```

É uma decisão material.

Para Needs `MATERIAL` ou `CRÍTICA`, o compromisso exige autoridade humana.

---

# 15. Estado ACCEPTED

## 15.1 Significado

A Need foi aprovada para originar Project.

`ACCEPTED` é terminal para esta instância de Need.

A Need não continua se transformando em Project por mutação.

Em vez disso:

```text
Need ACCEPTED
    ↓
origina
    ↓
novo Project
```

A Need permanece como fato de origem.

---

## 15.2 O que deve existir

No momento do aceite:

- autoridade;
- decisão;
- instante;
- `normative_baseline_ref`;
- evidências;
- escopo inicial;
- classificação;
- findings residuais;
- riscos aceitos;
- Delivery/baseline predecessora quando for evolução;
- vínculo futuro com Project.

---

## 15.3 Criação de Project

A criação de Project deve preservar:

```text
Need ID
decisão de aceite
baseline de entendimento
`normative_baseline_ref`
classificação de impacto
Delivery/baseline predecessora quando for evolução
```

Project não pode perder a origem.

---

# 16. Estado REJECTED

## 16.1 Significado

A Need foi avaliada e explicitamente recusada.

É terminal.

---

## 16.2 Requisitos

Toda rejeição deve possuir:

- motivo;
- autoridade;
- evidência;
- instante;
- `normative_baseline_ref`.

---

## 16.3 Nova tentativa futura

Uma Need rejeitada não deve ser reaberta por mutação silenciosa.

Se contexto mudar materialmente:

```text
nova Need
```

deve ser criada, referenciando a anterior quando relevante.

---

# 17. Estado CANCELLED

## 17.1 Significado

A intenção de continuar foi encerrada.

Cancelamento pode ocorrer por:

- decisão do solicitante;
- perda de prioridade;
- mudança de contexto;
- substituição por outra iniciativa;
- inviabilidade superveniente.

---

## 17.2 Requisitos

Cancelamento deve registrar:

- autoridade;
- motivo;
- instante;
- escopo;
- impactos;
- trabalho em voo;
- dependências relacionadas.

---

## 17.3 Efeito

Após `CANCELLED`:

- não há avanço normal;
- nenhuma nova atividade deve ser iniciada;
- execuções em voo perdem autoridade conforme política;
- histórico permanece íntegro.

---

# 18. Estado WAITING

## 18.1 Significado

A Need depende de fato externo conhecido.

`WAITING` não significa:

```text
ninguém sabe o que fazer
```

---

## 18.2 Requisitos

Toda espera deve possuir:

- causa;
- responsável;
- evento ou condição de saída;
- prazo ou cadência;
- fallback;
- escalada;
- estado anterior;
- estado esperado de retorno.

---

## 18.3 Saída

Quando a condição é satisfeita, a Need volta ao estado apropriado:

```text
WAITING → QUALIFYING
ou
WAITING → IN_DISCOVERY
```

Nunca deve avançar diretamente para `ACCEPTED`.

---

# 19. Findings no lifecycle de Need

Findings podem surgir em:

- qualificação;
- discovery;
- revisão;
- auditoria.

Um finding deve possuir:

- severidade;
- evidência;
- responsável;
- status;
- consequência.

Finding bloqueador impede avanço normal.

---

# 20. Tratamento de finding

Um finding pode receber, conforme a policy canônica aplicável:

```text
REMEDIATION
INVALIDATION
RECLASSIFICATION
RISK_ACCEPTANCE
```

Esses tratamentos não são equivalentes.

`EXCEPTION` não é tratamento, estado ou resultado próprio do Finding.

Uma exception governada é uma relação separada que pode cobrir, dentro de
escopo, baseline e validade explícitos, a consequência bloqueadora daquele
finding para uma decisão específica.

A exception:

- não fecha o Finding;
- não apaga o Finding;
- não reclassifica o Finding;
- não o transforma em não bloqueador;
- não produz aprovação normal.

Quando uma decisão avança excepcionalmente, o resultado pertence ao gate ou à
decisão:

```text
APPROVED_BY_EXCEPTION
```

A validade dessa cobertura excepcional deve ser reavaliada em novo baseline ou
novo contexto normativo.

---

# 21. Retorno para discovery

Se em `READY_FOR_COMMITMENT` surgir:

- lacuna;
- contradição;
- novo risco;
- nova dependência;
- mudança de escopo;
- finding material;

o fluxo pode retornar:

```text
READY_FOR_COMMITMENT → IN_DISCOVERY
```

O retorno exige:

- causa;
- autoridade;
- evidência;
- continuidade.

---

# 22. Retorno para qualificação

Retorno:

```text
IN_DISCOVERY → QUALIFYING
```

é permitido quando discovery revela que a Need precisa ser reavaliada em nível
mais fundamental.

Exemplos:

- não existe mais valor;
- problema mudou completamente;
- Need duplicada foi descoberta;
- origem deixou de ser válida.

---

# 23. Continuidade

Toda Need ativa deve responder:

```text
o que a faz avançar daqui?
```

Para cada estado:

```text
CAPTURED
→ iniciar qualificação

QUALIFYING
→ completar avaliação ou decidir espera/rejeição

IN_DISCOVERY
→ amadurecer decisões abertas

READY_FOR_COMMITMENT
→ decisão de compromisso

WAITING
→ observar condição externa e retornar
```

Se não existir próxima ação, responsável ou condição de saída, há
inconsistência.

---

# 24. Liveness

O lifecycle de Need não aceita estado ativo silencioso.

São inválidos:

```text
CAPTURED sem owner
QUALIFYING sem trabalho elegível
IN_DISCOVERY sem pergunta/atividade/decisão pendente
READY_FOR_COMMITMENT sem autoridade capaz de decidir
WAITING sem condição de saída
```

---

# 25. Idempotência

Repetir a mesma intenção técnica não deve duplicar efeitos.

Exemplos:

```text
duplo clique em "aceitar"
retry HTTP
mensagem duplicada
restart
concorrência
```

não podem criar múltiplos Projects para a mesma decisão de compromisso.

A criação de Project deve ser idempotente em relação à intenção de aceite da
Need.

---

# 26. Concorrência

Se duas decisões concorrentes forem tentadas para a mesma Need:

```text
ACEITAR
vs
CANCELAR
```

apenas uma pode se tornar autoritativa.

A outra deve detectar estado ou versão obsoleta e falhar de forma controlada.

---

# 27. Handoff Need → Project

O handoff para Project não é:

```text
"Need foi aceita"
```

apenas.

Ele exige:

```text
Need ACCEPTED
+
decisão persistida
+
baseline de entendimento
+
autoridade válida
+
intenção de criação do Project
+
criação idempotente
+
vínculo causal
```

A Need só deve ser considerada corretamente entregue ao próximo lifecycle quando
o vínculo com Project for persistente e recuperável.

---

# 28. Recovery

Need possui pouco comportamento operacional próprio, mas falhas podem ocorrer em
ações associadas ao lifecycle.

Exemplo:

```text
Need ACCEPTED
Project deveria ser criado
falha operacional ocorre
```

Nesse caso:

- não reverter silenciosamente o aceite;
- não duplicar Project;
- preservar intenção;
- entrar em recovery ou reconciliation;
- concluir o handoff de forma idempotente.

---

# 29. Reconciliation

Reconciliation é necessária quando existir dúvida entre:

```text
Need ACCEPTED
```

e

```text
Project inexistente ou estado incerto
```

O sistema deve descobrir o fato real antes de repetir efeito.

---

# 30. Auditoria e independência

Para decisões materiais:

- autor da análise não deve ser o mesmo principal que audita;
- auditor não pode aprovar gate humano em nome da autoridade;
- autoridade deve ser validada no ponto da decisão;
- exceções devem ser rastreáveis.

---

# 31. Projeção para UI

A UI de Need deve mostrar, conforme aplicável:

- estado atual;
- classificação;
- responsável;
- questões abertas;
- findings;
- blockers;
- espera;
- ações autorizadas;
- histórico relevante;
- decisão pendente.

A UI não deve inventar ações a partir do estado.

---

# 32. Ações humanas esperadas

Neste lifecycle, ações humanas podem incluir:

```text
submeter Need
complementar informação
responder pergunta
aceitar risco
aprovar exceção
rejeitar Need
cancelar Need
aprovar compromisso
```

A política derivada definirá exatamente quem pode executar cada ação.

---

# 33. Eventos conceituais

Este documento não fixa nomes técnicos de eventos.

Conceitualmente, devem existir eventos equivalentes a:

```text
NeedCaptured
QualificationStarted
DiscoveryStarted
NeedWaiting
NeedReadyForCommitment
NeedAccepted
NeedRejected
NeedCancelled
NeedReturnedToDiscovery
NeedReturnedToQualification
```

Os nomes técnicos serão definidos depois.

---

# 34. Invariantes do lifecycle de Need

Devem permanecer verdadeiros:

```text
Need ACCEPTED → pode originar Project
Need não ACCEPTED → não pode originar Project
Need REJECTED → não reabre por mutação
Need CANCELLED → não avança normalmente
WAITING → possui saída governada
READY_FOR_COMMITMENT → possui informação suficiente para decisão
ACCEPTED → preserva baseline de entendimento
Need de evolução ACCEPTED → possui Delivery/baseline predecessora
```

---

# 35. Proibições

Não é permitido:

- aceitar Need sem decisão explícita;
- aceitar Need com finding bloqueador não tratado;
- criar Project a partir de Need não aceita;
- pular discovery em mudança material por conveniência;
- tratar solução sugerida pelo usuário como requisito obrigatório sem validação;
- usar WAITING como estacionamento indefinido;
- apagar rejeição ou cancelamento;
- reabrir terminal por edição silenciosa;
- duplicar Project por retry;
- considerar aceite concluído se handoff para Project estiver perdido sem recovery;
- aceitar Need de evolução sem vínculo comprovado com Delivery/baseline predecessora.

---

# 36. Cenários mentais

## 36.1 Demanda vaga

Entrada:

```text
"quero uma tela para controlar clientes"
```

Resultado esperado:

```text
CAPTURED
→ QUALIFYING
→ IN_DISCOVERY
```

Não pode ir direto para Project ou implementação.

---

## 36.2 Need duplicada

Durante qualificação, descobre-se iniciativa equivalente.

Resultado:

```text
REJECTED
```

ou associação governada à iniciativa existente, conforme política futura.

---

## 36.3 Informação obrigatória ausente

Resultado:

```text
WAITING
```

com condição de saída explícita.

---

## 36.4 Auditor encontra lacuna

Resultado:

```text
permanece IN_DISCOVERY
```

ou retorna para discovery antes de compromisso.

---

## 36.5 Humano aprova Need

Resultado:

```text
READY_FOR_COMMITMENT
→ ACCEPTED
→ handoff idempotente para Project
```

---

## 36.6 Falha após aceite

Need já está `ACCEPTED`, mas criação de Project falha.

Resultado:

```text
ACCEPTED permanece como fato
+
recovery/reconciliation do handoff
```

Não se desfaz o aceite apenas porque houve falha operacional.

---

# 37. Questões deliberadamente deixadas para políticas derivadas

Este documento não define:

- papéis concretos;
- nomes de permissões;
- severidades finais;
- SLA;
- timeout;
- cadência de espera;
- UI;
- payloads;
- storage;
- event bus;
- workers;
- schemas;
- endpoints;
- agentes concretos.

---

# 38. Critério de aprovação

Este lifecycle está pronto quando podemos responder sem inventar nova lei:

- como Need nasce;
- como é qualificada;
- como discovery funciona;
- quando brainstorm é obrigatório;
- quando revisão acontece;
- quando auditoria acontece;
- quando fica pronta para decisão;
- como é aceita;
- como é rejeitada;
- como é cancelada;
- como espera;
- como retorna;
- como findings interferem;
- como continuidade é mantida;
- como aceite origina Project;
- como falha no handoff é recuperada.

---

# 39. Princípio final

Need não existe para formalizar uma solução previamente escolhida.

Ela existe para governar a transformação de:

```text
"temos um problema ou oportunidade"
```

em:

```text
"entendemos o suficiente para decidir se assumiremos um Project"
```

Somente depois dessa decisão o Project pode nascer.
