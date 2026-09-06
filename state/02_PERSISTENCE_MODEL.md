# NAAMIVE — Persistence Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** modelo conceitual de persistência  
**Deriva de:** `01_CANONICAL_STATE_MODEL.md` e Contracts

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** garantias conceituais de persistência, histórico, idempotência, causalidade e durabilidade

---

# 1. Objetivo

Definir o que a persistência precisa garantir, sem escolher tecnologia.

---

# 2. Categorias

A persistência deve distinguir:

```text
CURRENT STATE
IMMUTABLE HISTORY
EVIDENCE
PROJECTIONS
OPERATIONAL CLAIMS
```

---

# 3. Current State

Representa verdade atual necessária para decisões concorrentes e rápidas.

---

# 4. Immutable History

Preserva transições, decisões, grants, audits, findings, attempts e supersessions.

---

# 5. Evidence store

Evidence pode estar no mesmo store ou em store especializado.

A referência canônica deve preservar integridade e origem.

---

# 6. Projection store

Projection é derivada.

Pode ser descartada e reconstruída.

---

# 7. Operational claims

Leases, claims ou fencing generations são operacionais.

Não substituem business state.

---

# 8. Identidade

Cada registro governado deve possuir ID estável.

---

# 9. Versionamento

Entidades mutáveis devem possuir versão monotônica ou mecanismo equivalente.

---

# 10. Optimistic concurrency

A persistência deve impedir lost update.

---

# 11. Atomicidade lógica

Uma transition deve produzir, logicamente:

- state update;
- history;
- continuity/handoff;
- decision linkage;
- descendant validity changes;

como uma unidade consistente.

---

# 12. Quando atomicidade física não for possível

Usar mecanismo durável de completion/recovery.

É proibido depender de sorte entre duas gravações.

---

# 13. Append-only

Eventos/fatos históricos materiais são append-only.

Correções usam supersession/reversal records.

---

# 14. Soft delete

Entidades normativas/governadas não devem desaparecer por delete destrutivo
quando história for necessária.

---

# 15. Baseline identity

Baseline deve possuir identity própria ou composição determinística equivalente.

---

# 16. Baseline membership

Deve ser possível saber quais objetos/versões compõem um baseline material.

---

# 17. Causation

Persistência deve armazenar causation.

---

# 18. Correlation

Deve armazenar correlation para tracing ponta a ponta.

---

# 19. Intention identity

Idempotência depende de intention id persistente.

---

# 20. Idempotency record

A implementação deve conseguir responder:

```text
esta intenção já foi aplicada?
```

---

# 21. Unique authoritative outcome

Constraints devem impedir dois resultados autoritativos incompatíveis para a
mesma intenção.

---

# 22. Handoff durability

Handoff pendente deve sobreviver restart.

---

# 23. Continuity durability

Continuity deve ser persistida antes ou junto da publicação de estado ativo.
Seu registro deve preservar `cause_ref` e `normative_baseline_ref` para que a rota
de continuidade seja causalmente explicável e avaliada sob a norma correta.

---

# 24. Finding persistence

Finding nunca some ao ser tratado.

---

# 25. Authority persistence

Grant, delegation e revocation precisam ser rastreáveis.

---

# 26. Audit persistence

Audit finalizada é imutável.

---

# 27. Execution attempts

Cada attempt possui identidade distinta.

FAILED não é reutilizada.

---

# 28. Claim generation

Generation/fencing token deve ser monotônico ou equivalentemente seguro.

---

# 29. Effect certainty

Persistência precisa representar:

```text
NO_EFFECT
EFFECT_CONFIRMED
PARTIAL_EFFECT
WRONG_EFFECT
UNKNOWN
```

ou semântica equivalente.

---

# 30. Reconciliation record

Reconciliation deve preservar input, decisão e resultado e, quando houver uma
Inconsistency associada, referenciar seu `inconsistency_id`.

---

## 30.1 Inconsistency persistence

Toda Inconsistency canônica deve ser durável e versionada o suficiente para
preservar:

- identidade;
- tipo/classe;
- recurso/escopo afetado;
- `cause_ref`;
- Business Baseline;
- `normative_baseline_ref`;
- status e owner;
- causation/correlation;
- evidence;
- treatment;
- continuity/escalation;
- links de reconciliation/recovery/compensation;
- closure/supersession history append-only.

Logs e alertas podem referenciar a Inconsistency, mas não substituem seu registro
canônico.

---

# 31. Recovery lineage

Nova Execution deve apontar attempt anterior quando retry/recovery.

---

# 32. Parent-child relations

Need → Project → Module/Work Item → Execution devem ser enforceáveis.

---

# 33. Ownership

Work Item possui exatamente um governing scope.

---

# 34. Orphan prevention

Persistência não deve permitir orphan governado.

---

# 35. Referential integrity

Relações críticas devem ser protegidas por constraint física ou validação
transacional equivalente.

---

# 36. Normative Baseline persistence

Decisões materiais armazenam `normative_baseline_ref`, nunca uma revisão escalar
ambígua.

O certificado de Normative Baseline vigente é imutável e deve preservar:

- identidade global;
- membership completo e ordenado;
- identidade + revisão/digest imutável de cada norma membro;
- escopo/aplicabilidade;
- effective interval;
- precedência/resolução;
- autoridade e instante de ratificação;
- supersession relation.

Migrações entre baselines normativas devem preservar explicitamente origem,
destino, decisão, authority e recursos afetados.

---

# 37. Migration

Mudanças de schema não podem reinterpretar fatos históricos.

---

# 38. Retention

Política de retenção pode existir, mas não pode destruir auditabilidade exigida.

---

# 39. Encryption

Dados sensíveis devem poder receber proteção adequada na tecnologia escolhida.

---

# 40. Backup/restore

Restore deve preservar:

- ordering;
- versions;
- idempotency;
- authority history;
- lineage;
- continuity.

---

# 41. Disaster recovery

Após restore, sistema deve detectar work/handoffs in-flight e reconciliar.

---

# 42. Invariantes

```text
no lost update
no orphan
no duplicate authoritative outcome
history append-only
handoff durable
continuity durable
Inconsistency durable
Normative Baseline vigente imutável
failed execution preserved
```

---

# 43. Proibições

Não é permitido:

- usar filesystem local como única truth;
- editar history em place;
- apagar failed job para retry;
- projection como source;
- write parcial sem recovery;
- guardar apenas uma revisão normativa escalar ambígua em fato material;
- representar Inconsistency material somente em log/alerta.

---

# 44. Princípio final

Persistência não é só guardar dados.

É preservar as provas necessárias para que a verdade continue confiável após
concorrência, falha e restart.
