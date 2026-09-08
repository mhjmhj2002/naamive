# NAAMIVE — Authority Policy

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** política normativa de autoridade do NAAMIVE  
**Deriva de:** `01_GOVERNANCE_MODEL.md`  
**Normas superiores:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** concessão, escopo, delegação, revogação, revalidação, independência e segregação de autoridade

---

# 1. Objetivo

Esta política define como autoridade é concedida, verificada, delegada, revogada
e aplicada no NAAMIVE.

Ela responde:

```text
quem pode fazer o quê
sobre qual objeto
em qual escopo
por quanto tempo
sob qual norma
com quais restrições
```

A política não define tecnologia de autenticação, RBAC, banco, tokens ou APIs.

---

# 2. Princípio central

Nenhuma ação governada é autorizada apenas porque:

- o usuário clicou;
- a UI mostrou botão;
- o agente deseja executar;
- a requisição informou role;
- o executor possui capacidade técnica.

A autorização deve ser provada por fonte canônica no momento decisório.

---

# 3. Principal

Toda autoridade pertence a um principal verificável.

Tipos possíveis:

- HUMAN;
- AGENT;
- SERVICE;
- EXECUTOR;
- ORGANIZATIONAL_AUTHORITY.

A implementação pode usar categorias adicionais, desde que preserve identidade
canônica.

---

# 4. Escopo de autoridade

Toda autoridade deve possuir escopo explícito.

Escopos possíveis incluem:

- sistema;
- Project;
- Module;
- Work Item;
- Delivery;
- norma;
- tipo de ação;
- período;
- ambiente.

Autoridade fora do escopo é inválida.

---

# 5. Ação autorizada

Uma concessão de autoridade deve dizer qual ação é permitida.

Exemplos conceituais:

```text
APPROVE_NEED_COMMITMENT
APPROVE_ARCHITECTURE
APPROVE_PLAN
ACCEPT_RISK
GRANT_EXCEPTION
PAUSE_PROJECT
CANCEL_PROJECT
ACCEPT_DELIVERY
RATIFY_NORM
AUDIT_OBJECT
REVIEW_OBJECT
EXECUTE_WORK
```

Os nomes técnicos serão definidos depois.

---

# 6. Origem da autoridade

Toda autoridade deve possuir origem rastreável.

Pode vir de:

- posição organizacional;
- delegação;
- policy;
- mandato temporário;
- regra sistêmica;
- aprovação explícita.

Não pode vir apenas de declaração do próprio principal.

---

# 7. Validade temporal

Autoridade pode ser:

- contínua;
- temporária;
- limitada a decisão única;
- limitada a baseline;
- limitada a uma `normative_baseline_ref`.

A validade deve ser verificável no instante do uso.

---

# 8. Autoridade e baseline

Autoridade pode depender de baseline.

Uma aprovação concedida para baseline A não autoriza automaticamente decisão
sobre baseline B.

Mudança material pode exigir revalidação de authority.

---

# 9. Autoridade e baseline normativa

Toda decisão material deve registrar o `normative_baseline_ref` que sustentou a
authority usada. Quando necessário para explicação ou policy evaluation, também
pode registrar `controlling_rule_ref`.

A authority nunca é resolvida implicitamente contra a versão "mais recente" de
um documento. O servidor resolve a baseline normativa canônica da instância e
revalida o grant contra ela.

Mudança ou migração normativa pode:

- preservar;
- exigir revalidação;
- revogar;
- superseder authority anterior.

---

# 10. Delegação

Delegação transfere autoridade dentro de limites explícitos.

Deve registrar:

- delegante;
- delegado;
- ação;
- escopo;
- início;
- expiração;
- justificativa;
- possibilidade de revogação;
- restrições;
- baseline normativa aplicável.

---

# 11. Limite da delegação

Delegante não pode conceder autoridade que não possui.

Delegação também não pode ampliar escopo.

Regra:

```text
delegated_authority ⊆ delegator_authority
```

---

# 12. Subdelegação

Subdelegação é proibida por padrão.

Só pode existir quando policy específica permitir.

Quando permitida, deve preservar toda a cadeia causal.

---

# 13. Revogação

Revogação impede uso futuro da autoridade.

A revogação deve produzir efeito sobre:

- novas decisões;
- gates ainda não concluídos;
- execuções dependentes;
- aprovações pendentes;
- handoffs ainda não consumados.

---

# 14. Decisões históricas após revogação

Revogação não invalida retroativamente decisão que era legítima quando tomada.

Se a organização quiser desfazer efeito passado, deve criar nova decisão de
supersessão, revogação de resultado ou compensação.

---

# 15. Revalidação obrigatória

Autoridade deve ser revalidada antes de:

- approve;
- reject;
- cancel;
- pause;
- resume;
- risk acceptance;
- exception;
- Delivery acceptance;
- ratificação normativa;
- publicação de resultado crítico.

---

# 16. Autoridade humana

Decisão humana exige principal humano.

Agente não pode representar-se como humano.

Ações humanas podem ser preparadas por agente, mas a decisão final deve ser
atribuída ao principal humano autorizado.

---

# 17. Autoridade de agente

Agente pode receber autoridade para:

- analisar;
- revisar;
- auditar;
- recomendar;
- executar;
- decidir gates automatizados permitidos.

Agente não recebe automaticamente autoridade humana.

---

# 18. Autoridade de serviço

Serviços podem executar ações técnicas autorizadas.

Capacidade técnica não implica autoridade de negócio.

---

# 19. Authority para review

Reviewer precisa de:

- escopo adequado;
- especialidade aplicável;
- ausência de conflito quando exigido;
- baseline conhecido.

Review sem authority válida é evidência não autoritativa.

---

# 20. Authority para audit

Auditor precisa de:

- authority de audit;
- independência quando exigida;
- objeto e baseline definidos;
- acesso suficiente às evidências.

---

# 21. Authority para approval

Approval exige authority específica para a decisão.

Authority de review ou audit não implica authority de approval.

---

# 22. Segregação de deveres

Policies podem exigir principals distintos entre:

- AUTHOR;
- REVIEWER;
- AUDITOR;
- AUTHORITY;
- EXECUTOR.

A regra deve ser explícita por decisão.

---

# 23. Conflito de interesse

Conflito de interesse relevante deve bloquear principal quando a policy exigir
independência.

Conflito deve ser:

- detectável;
- registrável;
- justificável;
- tratável por principal alternativo ou exceção governada.

---

# 24. Exceção de autoridade

Exceção de authority só pode existir quando norma superior permitir.

Deve possuir:

- autoridade excepcional;
- escopo;
- duração;
- justificativa;
- risco;
- compensação;
- audit trail.

---

# 25. Authority para risco

Aceitação de risco exige authority própria.

A pessoa capaz de aprovar trabalho técnico não é automaticamente capaz de aceitar
risco de negócio, segurança ou compliance.

---

# 26. Authority para exception

Exception exige authority superior ou distinta daquela diretamente interessada
no avanço.

---

# 27. Authority para cancelamento

Cancelamento exige principal autorizado no escopo do objeto.

Cancelamento deve também considerar descendentes e trabalho em voo.

---

# 28. Authority para pause/resume

Pause e resume podem possuir authorities diferentes.

Retomada exige revalidação de contexto e authority.

---

# 29. Authority para Delivery

Aceitar Delivery é decisão de negócio.

Deve existir principal humano ou autoridade organizacional explicitamente
responsável pelo aceite quando a policy assim exigir.

---

# 30. Authority para norma

Ratificação normativa exige authority específica.

Autor de documento não recebe essa authority automaticamente.

---

# 31. Authority e mudança de escopo

Mudança material de escopo deve disparar:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
```

para authorities afetadas.

---

# 32. Authority e descendants

Quando authority do pai é revogada, descendentes dependentes devem ser avaliados.

Nenhum filho pode continuar operando se sua authority derivava de decisão pai
revogada.

---

# 33. Authority obsoleta

Uma authority torna-se obsoleta quando:

- expirou;
- baseline mudou;
- baseline normativa mudou;
- escopo mudou;
- delegação foi revogada;
- principal perdeu posição;
- objeto foi cancelado.

---

# 34. Uso de authority obsoleta

Tentativa de uso deve:

- falhar;
- registrar tentativa;
- não produzir efeito autoritativo;
- preservar continuidade por escalada ou nova decisão.

---

# 35. Projeção de authority

A projeção futura deve indicar:

- ação disponível;
- principal elegível;
- escopo;
- condições;
- validade;
- dependências;
- baseline.

UI não calcula authority por conta própria.

---

# 36. Ausência de principal

Se uma decisão precisa de authority mas nenhum principal elegível existe, há
inconsistência de governança.

O sistema deve escalar.

---

# 37. Quorum

Authority pode exigir quorum.

Quando existir:

- quantidade;
- perfis;
- independência;
- ordem;
- desempate;
- validade.

serão definidos por policy específica.

---

# 38. Decisão única

Uma decisão deve produzir um único resultado autoritativo.

Aprovações concorrentes incompatíveis devem ser resolvidas por controle de
versão, quorum ou mecanismo equivalente.

---

# 39. Idempotência

Repetir a mesma decisão não deve duplicar efeito.

Approval idempotente deve preservar um resultado autoritativo por intenção.

---

# 40. Audit trail de authority

Toda ação material deve permitir reconstruir:

- principal;
- authority;
- origem;
- delegação;
- escopo;
- validade;
- baseline;
- `normative_baseline_ref`;
- decisão;
- instante.

---

# 41. Proibições

Não é permitido:

- self-declared authority;
- authority sem principal;
- authority sem escopo;
- authority usada após revogação;
- delegação maior que authority original;
- audit authority virar approval authority silenciosamente;
- agent assumir human authority;
- UI inventar capability;
- reuse de authority de baseline incompatível sem revalidação.

---

# 42. Cenários mentais

## 42.1 Auditor tenta aceitar Delivery

Se não possui authority de Delivery:

```text
DENY
```

## 42.2 Delegação expirou

Ação falha.

## 42.3 Role veio no request

Ignorar como prova de authority.

## 42.4 Baseline mudou

Revalidar authority antes da decisão.

## 42.5 Autor tenta auditar próprio trabalho

Se independência exigida:

```text
DENY
```

## 42.6 Project cancelado

Authorities de execução futura devem ser revogadas.

---

# 43. Itens deixados para contrato futuro

Não define:

- token;
- JWT;
- claims físicos;
- tabela de grants;
- API;
- endpoint;
- schema;
- assinatura;
- provider de identidade.

---

# 44. Critério de aprovação

Esta policy está pronta quando podemos derivar sem nova lei:

- concessão;
- escopo;
- delegação;
- revogação;
- revalidação;
- independência;
- authorities de humano/agente/serviço;
- autoridade para gates;
- autoridade para risco, exceção, cancelamento, Delivery e norma.

---

# 45. Princípio final

Autoridade não é uma propriedade implícita do ator.

Ela é uma relação governada e verificável entre:

```text
principal
+
ação
+
escopo
+
tempo
+
baseline
+
norma
```
