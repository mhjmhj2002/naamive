# NAAMIVE — Governance Model

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.3  
**Autoridade:** modelo normativo de governança do NAAMIVE  
**Deriva de:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** modelo de governança, principals, autoridade, gates, findings, risco, exceções e ratificação normativa do NAAMIVE

---

# 1. Objetivo

Este documento define o modelo de governança do NAAMIVE.

Governança responde:

```text
quem pode decidir?
sobre o quê?
em qual contexto?
com qual autoridade?
com quais evidências?
sob quais controles?
com qual independência?
com quais consequências?
```

O objetivo não é transformar o NAAMIVE em um sistema burocrático.

O objetivo é garantir que decisões materiais, críticas, excepcionais e humanas
não sejam tomadas de forma implícita, silenciosa, não rastreável ou por ator sem
autoridade.

Este documento não define:

- tabelas;
- APIs;
- payloads;
- roles físicos;
- nomes de permissões;
- banco de dados;
- UI;
- agentes concretos;
- prompts;
- migrations;
- mecanismo de autenticação;
- tecnologia de autorização.

Esses elementos serão derivados depois.

---

# 2. Posição na hierarquia normativa

A hierarquia é:

```text
Constituição
    ↓
Lifecycle Model
    ↓
Lifecycles específicos
    ↓
Governance Model
    ↓
Policies / Contracts
    ↓
Persistência / Projeções / Orquestração
    ↓
APIs / UI
    ↓
Implementação
```

Este documento:

- não pode contradizer a Constituição;
- não pode redefinir estados dos lifecycles;
- não pode criar transições inexistentes;
- não pode enfraquecer exigência de auditoria;
- não pode transformar exceção em caminho normal.

Seu papel é definir **quem governa as decisões e como os controles se aplicam**.

---

# 3. Princípio central

O NAAMIVE separa:

```text
produzir
avaliar
auditar
autorizar
executar
```

Essas responsabilidades podem ser exercidas por humanos ou agentes conforme a
política aplicável.

Mas elas não são equivalentes.

Uma entidade ou principal capaz de produzir algo não recebe automaticamente
autoridade para aprovar o próprio resultado.

---

# 4. Principals

**Principal** é uma identidade verificável capaz de receber autoridade.

Pode representar:

- humano;
- agente;
- serviço;
- executor técnico;
- autoridade organizacional.

Toda decisão material deve ser atribuível a principal verificável.

É proibido:

```text
"role=admin" informado pela própria requisição
```

ser tratado como prova de autoridade.

---

# 5. Autoridade

Autoridade é uma permissão governada para executar uma decisão ou ação em
determinado escopo.

Autoridade deve possuir, conforme aplicável:

- principal;
- ação autorizada;
- escopo;
- origem;
- validade;
- condições;
- possibilidade de revogação;
- `normative_baseline_ref`;
- delegação, quando houver.

Autoridade é sempre contextual.

Exemplo:

```text
poder aprovar Delivery do Project A
≠
poder cancelar Project B
```

---

# 6. Fonte canônica de autoridade

A implementação futura deve possuir uma fonte canônica de autoridade.

A governança não pode depender de:

- declaração do cliente;
- aparência da UI;
- memória de agente;
- texto livre;
- convenção informal.

Toda ação governada deve validar autoridade no ponto em que a decisão será
materializada.

---

# 7. Revalidação de autoridade

Autoridade deve ser revalidada quando:

- decisão é tomada;
- gate é aprovado;
- exceção é concedida;
- risco é aceito;
- recurso é pausado;
- recurso é cancelado;
- Delivery é aceita;
- retomada ocorre;
- mudança normativa afeta escopo;
- delegação pode ter expirado ou sido revogada.

Autoridade válida no início de uma atividade não é garantia de validade
indefinida.

---

# 8. Delegação

Delegação transfere capacidade decisória dentro de limites explícitos.

Toda delegação deve possuir:

- autoridade delegante;
- principal delegado;
- escopo;
- ações permitidas;
- início;
- fim ou condição de expiração;
- possibilidade de revogação;
- justificativa quando aplicável.

Delegação não pode conceder mais autoridade do que o delegante possui.

---

# 9. Revogação

Revogação encerra autoridade futura.

A revogação deve impedir:

- novas decisões;
- novas aprovações;
- novas execuções dependentes daquela autoridade;
- publicação autoritativa posterior.

A revogação não apaga decisões históricas que eram válidas no momento em que
foram tomadas.

---

# 10. Conflito de interesse

Uma decisão pode exigir independência entre principals.

Conflito de interesse existe quando um principal possui interesse material na
aprovação do próprio resultado ou quando sua independência está comprometida
pela relação com o objeto avaliado.

Políticas derivadas devem conseguir declarar quando conflito de interesse:

- impede review;
- impede audit;
- impede approval;
- exige controle compensatório;
- exige autoridade alternativa.

---

# 11. Responsabilidades fundamentais

O NAAMIVE distingue:

```text
AUTHOR
REVIEWER
AUDITOR
AUTHORITY
EXECUTOR
```

---

# 12. AUTHOR

AUTHOR produz proposta, artefato, análise, plano, decisão recomendada ou
implementação.

Pode:

- explorar;
- produzir;
- justificar;
- apresentar evidências;
- responder findings;
- propor alternativas.

Não pode, apenas por ser autor:

- declarar a própria proposta aprovada;
- remover blocker;
- conceder exceção;
- aceitar risco em nome da organização;
- ratificar norma.

---

# 13. REVIEWER

REVIEWER avalia qualidade dentro de uma especialidade.

Pode avaliar:

- produto;
- domínio;
- arquitetura;
- segurança;
- experiência;
- planejamento;
- código;
- integração;
- operação.

Review responde:

```text
isso está bom?
```

Review não substitui auditoria.

---

# 14. AUDITOR

AUDITOR verifica prontidão, completude, consistência, rastreabilidade e
conformidade.

Audit responde:

```text
temos prova suficiente para avançar?
```

Auditor deve procurar:

- lacunas;
- contradições;
- findings;
- ausência de evidência;
- ausência de autoridade;
- inconsistência com norma;
- insuficiência de readiness;
- risco de dead-end.

Auditor não substitui a autoridade final.

---

# 15. AUTHORITY

AUTHORITY toma decisão governada.

Pode:

- aprovar;
- rejeitar;
- devolver;
- pausar;
- cancelar;
- aceitar risco;
- conceder exceção quando permitido;
- aceitar Delivery;
- ratificar norma conforme escopo.

A autoridade não deve inventar evidência ausente.

Decisão sem base suficiente deve operar em fail-closed.

---

# 16. EXECUTOR

EXECUTOR materializa uma ação autorizada.

Pode ser:

- humano;
- agente;
- serviço;
- worker.

Executor não obtém autoridade decisória apenas porque possui capacidade técnica
de realizar a operação.

---

# 17. Independência

Quando independência for exigida:

- AUTHOR e AUDITOR devem ser principals distintos;
- AUDITOR e AUTHORITY podem ser distintos conforme política;
- REVIEWER pode ou não ser independente, conforme risco;
- uma mesma identidade não pode burlar independência abrindo execuções
  diferentes.

A independência é avaliada por principal, não por sessão ou tarefa.

---

# 18. Autovalidação

Autovalidação pode existir como controle de qualidade interno.

Mas:

```text
autovalidação ≠ auditoria independente
```

Ela não satisfaz gate que explicitamente exige independência.

---

# 19. Exceção de independência

Exceções à independência devem ser raras e governadas.

Exigem:

- impossibilidade razoável de obter independência normal;
- autoridade distinta;
- justificativa;
- escopo;
- duração;
- risco conhecido;
- controle compensatório;
- registro auditável.

Exceção não transforma autovalidação em auditoria independente.

---

# 20. Classificação de impacto

A governança usa exatamente os identificadores canônicos constitucionais:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

Esses tokens são identificadores semânticos, não apenas rótulos de UI.
Persistência, predicates de gate/audit/authority e projections devem preservar
essa identidade. Traduções de apresentação nunca criam alias normativo distinto.

---

# 21. TRIVIAL

Mudança local, reversível e de baixo impacto.

Pode permitir processo simplificado.

Mesmo sendo trivial, ainda deve respeitar:

- autoridade;
- rastreabilidade;
- idempotência;
- estado válido;
- continuidade;
- segurança.

---

# 22. MATERIAL

Mudança que altera de forma relevante:

- produto;
- experiência;
- arquitetura;
- dados;
- integração;
- operação;
- contrato;
- escopo;
- comportamento.

Exige controles proporcionais.

---

# 23. CRÍTICA

Mudança com risco elevado para:

- identidade;
- segurança;
- autorização;
- integridade de dados;
- operação irreversível;
- obrigação legal;
- continuidade sistêmica;
- norma;
- múltiplos domínios.

Exige maior rigor de independência, evidência e aprovação.

---

# 24. Classificação rastreável

Toda classificação deve possuir:

- objeto;
- classe;
- justificativa;
- principal responsável;
- instante;
- `normative_baseline_ref`.

A classificação pode ser revista.

Redução de impacto exige justificativa proporcional.

Na dúvida razoável:

```text
usar classe de maior impacto
```

---

# 25. Herança de impacto

Recursos filhos herdam contexto de risco do pai, mas podem elevar sua própria
classificação.

Exemplo:

```text
Project MATERIAL
    ↓
Work Item CRÍTICA
```

Filho não pode reduzir implicitamente controles exigidos pelo contexto pai.

---

# 26. Gate

Gate é um controle de decisão sobre uma transição ou avanço.

Gate não é estado.

Gate responde:

```text
podemos autorizar esta transição?
```

---

# 27. Elementos de um gate

Todo gate deve possuir, conforme aplicável:

- objeto;
- transição pretendida;
- `normative_baseline_ref`;
- critérios;
- evidências;
- findings;
- impacto;
- auditoria necessária;
- autoridade;
- decisão;
- resultado;
- baseline;
- validade.

---

# 28. Gate de readiness

Verifica se a etapa produziu informação suficiente para avançar.

Pode exigir:

- completude;
- ausência de blocker;
- evidência;
- review;
- audit;
- continuidade do próximo estágio.

---

# 29. Gate humano

Gate humano é aquele cuja decisão final pertence explicitamente a principal
humano autorizado.

É esperado especialmente em:

- compromisso de Need;
- decisão material de produto;
- arquitetura material;
- plano material;
- aceitação de risco material;
- exceção;
- pausa;
- cancelamento;
- Delivery;
- ratificação normativa.

---

# 30. Gate automatizado

Gate automatizado pode decidir quando:

- critérios são objetivos;
- política permite;
- não existe exigência humana;
- autoridade foi concedida;
- evidências são verificáveis;
- risco é compatível.

Automação não pode substituir gate humano apenas por conveniência.

---

# 31. Gate composto

Gate pode depender de múltiplos controles.

Exemplo:

```text
review técnico
+
auditoria independente
+
aprovação humana
```

A ordem e os critérios serão definidos por políticas derivadas.

---

# 32. Resultado de gate

Um gate deve terminar em resultado explícito:

```text
APPROVED
REJECTED
RETURNED
BLOCKED
APPROVED_BY_EXCEPTION
```

Outros nomes podem existir em contrato futuro, mas a semântica deve permanecer.

---

# 33. APPROVED_BY_EXCEPTION

Avanço excepcional deve ser distinguível de aprovação normal.

```text
APPROVED
≠
APPROVED_BY_EXCEPTION
```

A diferença precisa permanecer rastreável.

---

# 34. Findings

Finding é um achado formal produzido por review, audit ou outra verificação
governada.

Todo finding deve possuir:

- identificador;
- objeto;
- evidência;
- severidade;
- origem;
- principal;
- status;
- responsável;
- impacto;
- consequência para gate.

---

# 35. Severidade

A governança distingue, no mínimo:

```text
BLOCKING
NON_BLOCKING
```

Políticas futuras podem criar níveis adicionais.

Mas a semântica de blocker deve permanecer inequívoca.

---

# 36. Finding BLOCKING

Impede avanço normal.

Não pode ser:

- ignorado;
- apagado;
- rebaixado sem decisão;
- tratado como risk acceptance simples.

---

# 37. Finding NON_BLOCKING

Não impede necessariamente avanço.

Pode representar:

- melhoria;
- risco residual;
- dívida;
- limitação;
- observação.

Ainda deve permanecer rastreável.

---

# 38. Tratamentos válidos de finding

Um finding pode ser tratado por:

```text
REMEDIATION
INVALIDATION
RECLASSIFICATION
RISK_ACCEPTANCE
EXCEPTION
```

Esses tratamentos não são equivalentes.

---

# 39. REMEDIATION

A causa é corrigida.

Exige nova evidência.

Quando material, pode exigir novo review ou audit.

---

# 40. INVALIDATION

Nova evidência demonstra que o finding era incorreto ou inaplicável.

A invalidação deve preservar o finding original e sua justificativa histórica.

---

# 41. RECLASSIFICATION

Altera severidade ou impacto.

Exige:

- nova evidência;
- principal autorizado;
- independência quando aplicável;
- justificativa.

Não pode ser usada como atalho para liberar gate.

---

# 42. RISK_ACCEPTANCE

Reconhece que o problema existe, mas seu risco será conscientemente aceito.

Pode ser usada quando política permitir.

Importante:

```text
RISK_ACCEPTANCE não libera blocker automaticamente
```

---

# 43. EXCEPTION

Exceção autoriza desvio governado da regra normal.

Pode permitir avanço apesar de condição que normalmente bloquearia.

A exceção não:

- apaga finding;
- reclassifica finding automaticamente;
- declara problema resolvido.

---

# 44. Requisitos de exceção

Toda exceção deve possuir:

- regra desviada;
- objeto;
- motivo;
- principal que solicita;
- autoridade que concede;
- risco;
- escopo;
- início;
- expiração;
- mitigação;
- controles compensatórios;
- critérios de encerramento;
- reavaliação.

---

# 45. Exceção nunca vira regra silenciosa

Uso recorrente de mesma exceção indica possível problema de norma, política ou
processo.

A governança futura deve permitir identificar exceções repetidas.

---

# 46. Risco

Risco deve ser registrado quando material para decisão.

Deve possuir, conforme aplicável:

- descrição;
- probabilidade;
- impacto;
- owner;
- mitigação;
- status;
- validade;
- relação com decisão.

---

# 47. Risco residual

Risco que permanece após controles deve ser explicitamente conhecido antes de
aceite material.

Delivery pode ser aceita com risco residual somente quando política permitir e
autoridade apropriada decidir.

---

# 48. Aceitação de risco

Aceitar risco é decisão distinta de aprovar implementação.

A autoridade capaz de aceitar risco pode ser diferente da autoridade capaz de
aprovar trabalho técnico.

Políticas derivadas devem declarar isso explicitamente.

---

# 49. Readiness

Readiness significa que um objeto possui informação, evidência e continuidade
suficientes para entrar no próximo estágio.

Não significa que a decisão final já foi aprovada.

---

# 50. Readiness e baseline

Toda avaliação de readiness material deve declarar qual baseline, escopo ou
versão está sendo avaliado.

Mudança relevante pode invalidar readiness anterior.

---

# 51. Validade de review e audit

Review e audit devem possuir escopo e baseline.

Um resultado anterior só pode ser reaproveitado se cobrir explicitamente:

- mesmo objeto relevante;
- mesmo baseline ou baseline compatível;
- mesma decisão material;
- riscos ainda válidos;
- findings ainda aplicáveis.

---

# 52. Invalidação por mudança

Mudança material de:

- baseline;
- escopo;
- arquitetura;
- dependência;
- requisito;
- norma;
- autoridade;

deve classificar controles anteriores como:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

A classificação deve ser rastreável.

---

# 53. Propagação para descendentes

Quando decisão pai muda, a governança deve identificar descendentes afetados.

Podem incluir:

- Modules;
- Work Items;
- Executions;
- evidências;
- reviews;
- audits;
- approvals;
- handoffs.

Nenhum descendente pode continuar operando sob autoridade ou baseline revogado
apenas porque seu estado local ainda parece válido.

---

# 54. Decisões materiais

Uma decisão material deve possuir:

- objeto;
- problema;
- alternativas relevantes;
- recomendação;
- evidências;
- riscos;
- findings;
- impacto;
- baseline;
- autoridade;
- decisão.

---

# 55. Decisão humana

Quando a Constituição ou política exigir decisão humana, agente não pode
substituí-la.

Agente pode:

- preparar;
- recomendar;
- resumir;
- auditar;
- apontar risco;
- solicitar decisão.

Mas não pode fingir ser o humano.

---

# 56. Decisão automatizada

Decisão automatizada é permitida quando:

- política autoriza;
- critérios são verificáveis;
- risco é compatível;
- principal automatizado possui autoridade;
- não existe gate humano obrigatório.

---

# 57. Decisão pendente

Decisão material pendente deve ser representada explicitamente.

Não pode existir apenas em:

- comentário;
- memória do agente;
- chat;
- suposição do implementador.

---

# 58. Não invenção silenciosa

Se executor ou agente encontra decisão material ausente:

```text
não decide por conta própria
        ↓
registra decisão pendente
        ↓
preserva continuidade
        ↓
encaminha à autoridade apropriada
```

---

# 59. Escalonamento

Escalonamento é mecanismo governado de transferência de decisão ou resolução
quando o responsável normal não consegue concluir.

Deve possuir:

- motivo;
- objeto;
- responsável atual;
- destino;
- prazo/cadência;
- contexto;
- evidências.

---

# 60. Ausência de responsável

Qualquer gate, finding, blocker, wait ou decisão material sem responsável válido
representa inconsistência de governança.

---

# 61. Continuidade e governança

Governança faz parte da continuidade.

Uma ação humana só conta como continuação válida quando existe:

- principal capaz de agir;
- autoridade;
- ação projetada;
- contexto;
- saída;
- prazo/cadência quando aplicável.

---

# 62. Ação humana invisível

Uma ação canônica necessária que não é apresentada ao principal responsável
representa falha de continuidade.

A projeção futura deve tornar decisões pendentes observáveis.

---

# 63. Pausa

Pausa exige autoridade.

A decisão deve registrar:

- motivo;
- escopo;
- baseline;
- principal;
- estado preservado;
- trabalho em voo;
- condição/processo de retomada.

---

# 64. Retomada

Retomada exige revalidação de:

- norma;
- autoridade;
- baseline;
- findings;
- riscos;
- dependências;
- evidências;
- continuidade.

Retomar não significa simplesmente trocar flag.

---

# 65. Cancelamento

Cancelamento é decisão governada.

Deve registrar:

- objeto;
- motivo;
- autoridade;
- instante;
- escopo;
- descendentes afetados;
- trabalho em voo;
- efeitos externos;
- necessidade de reconciliation ou compensation.

---

# 66. Cancelamento e autoridade operacional

Após cancelamento:

- novas autorizações devem cessar;
- claims revogáveis devem perder validade;
- resultado tardio não é automaticamente autoritativo.

---

# 67. Delivery

Aceitar Delivery é decisão de negócio.

Deve considerar:

- Need;
- baseline;
- evidências;
- critérios;
- findings;
- riscos residuais;
- exceções;
- autoridade;
- capacidade operacional.

---

# 68. Auditoria de Delivery

Delivery MATERIAL ou CRÍTICA exige auditoria independente de prontidão.

A auditoria não substitui autoridade de aceite.

---

# 69. Normative Baseline e ratificação normativa

Norma somente se torna vigente após ratificação explícita.

A unidade canônica usada por uma instância para resolver **o conjunto completo de
regras aplicáveis** é a **Normative Baseline**.

Uma Normative Baseline é materializada por um certificado imutável de ratificação
com identidade global própria. O certificado deve registrar, no mínimo:

- `normative_baseline_id`;
- autoridade que ratificou;
- instante de ratificação;
- instante de entrada em vigor;
- intervalo de eficácia, quando existir;
- escopo de aplicabilidade;
- relação com baseline normativa anterior;
- regra de supersessão;
- membership **completo e ordenado** das normas integrantes;
- para cada membro: identidade do documento, revisão imutável e digest ou
  identificador equivalente de conteúdo;
- precedência/resolução entre camadas e documentos;
- evidência de auditoria normativa requerida;
- status de vigência.

Somente documentos ratificados podem integrar uma Normative Baseline vigente.
`BRAINSTORM`, `DRAFT`, `CANDIDATE FOR APPROVAL` ou equivalente nunca entram em
um certificado efetivo como norma vigente.

A precedência segue a hierarquia normativa publicada. Em conflito:

1. norma superior prevalece sobre derivação inferior;
2. dentro da mesma camada, uma norma mais específica só restringe ou detalha a
   norma geral quando sua derivação estiver explícita e não houver contradição;
3. conflito sem resolução determinística cria `Inconsistency` e opera
   fail-closed.

O certificado é imutável depois de entrar em vigor. Qualquer alteração de membro,
revisão, escopo, precedência ou eficácia produz **nova Normative Baseline**.

O cabeçalho de um documento pode resumir seu status, mas o registro canônico de
ciclo de vida normativo deve existir de forma estruturada. Antes da ratificação,
a revisão candidata deve possuir ao menos identidade do documento, revisão,
status, autoridade de ratificação pretendida, predecessor/supersession target e
escopo; seu instante de vigência é explicitamente `NOT IN FORCE`. Na ratificação,
o certificado da Normative Baseline fixa de forma imutável autoridade, instante
de vigência, relação com versão anterior, regra de supersessão, escopo e digest
da revisão.

---

# 70. Mudança e migração normativa

Mudança normativa não reinterpreta automaticamente decisões passadas.

Toda decisão, transição, gate, audit, authority use ou outro fato material deve
ser vinculado ao `normative_baseline_ref` que efetivamente o governou. Quando
útil para explicabilidade, pode também carregar `controlling_rule_ref` para a
regra específica aplicada.

Uma revisão isolada de policy/documento não passa a governar instâncias ativas
apenas por ter sido publicada. Ela precisa integrar uma nova Normative Baseline
ratificada.

Instâncias ativas só mudam de baseline normativa por migração explícita e
governada. A migração deve declarar:

- `source_normative_baseline_ref`;
- `target_normative_baseline_ref`;
- recursos afetados;
- compatibilidades e incompatibilidades;
- revalidações necessárias;
- tratamento de authority, gates, evidence, findings, handoffs e continuity;
- estratégia para estados sem equivalência;
- decisão e authority de migração.

Na ausência de migração válida, fatos e instâncias permanecem resolvidos contra a
baseline normativa que legitimou seu estado atual.

---

# 71. Auditoria normativa

Norma material deve poder passar por audit antes da ratificação.

A auditoria verifica:

- contradições;
- lacunas;
- derivabilidade;
- inconsistência com norma superior;
- impacto em instâncias existentes.

---

# 72. Autoridade de ratificação

A política futura deve definir quem pode ratificar:

- Constituição;
- Lifecycle Model;
- lifecycles específicos;
- Governance Model;
- policies;
- contracts.

Nenhum autor assume automaticamente essa autoridade.

---

# 73. Agentes como participantes de governança

Agentes podem exercer papéis como:

- author;
- reviewer;
- auditor;
- executor;
- recommender.

Mas seu escopo deve ser explícito.

---

# 74. Agente reviewer

Pode revisar especialidade conforme autoridade.

Não pode aprovar gate humano apenas porque sua review foi positiva.

---

# 75. Agente auditor

Pode realizar auditoria independente quando:

- principal for considerado independente;
- política permitir;
- contexto e ferramentas forem suficientes;
- não houver conflito de interesse.

---

# 76. Agente executor

Executa trabalho autorizado.

Se encontrar lacuna material, deve bloquear avanço afetado e encaminhar decisão.

---

# 77. Humano como autoridade

Humano autorizado permanece necessário para decisões que a política classificar
como responsabilidade humana.

A existência de agente capaz de responder não remove essa obrigação.

---

# 78. Governança proporcional

Governança deve ser proporcional ao impacto.

Evitar:

```text
gate humano para cada detalhe trivial
```

Mas também evitar:

```text
automatizar decisão material porque é mais rápido
```

---

# 79. Simplificação para TRIVIAL

Mudanças triviais podem:

- combinar author/reviewer;
- dispensar audit independente;
- usar aprovação automatizada;

quando política permitir.

Mesmo assim, não podem violar:

- autoridade;
- rastreabilidade;
- idempotência;
- estado;
- segurança;
- continuidade.

---

# 80. Controles mínimos para MATERIAL

Mudança material exige, no mínimo, conforme aplicável:

- definição;
- review;
- audit de readiness;
- decisão autorizada;
- baseline;
- findings tratados;
- continuidade.

---

# 81. Controles mínimos para CRÍTICA

Mudança crítica exige controles reforçados.

Podem incluir, conforme política:

- review especializado adicional;
- auditor independente;
- autoridade humana específica;
- segregação de deveres;
- evidência reforçada;
- controle compensatório;
- reauditoria.

---

# 82. Segregação de deveres

Para decisões críticas, políticas derivadas podem exigir que:

```text
AUTHOR
REVIEWER
AUDITOR
AUTHORITY
```

sejam principals distintos.

Essa exigência deve ser explicitamente configurada por tipo de decisão.

---

# 83. Quorum

Algumas decisões podem exigir mais de uma autoridade.

Quorum, quando usado, deve definir:

- número;
- perfis;
- independência;
- ordem;
- prazo;
- desempate.

O Governance Model não define quorums concretos.

---

# 84. Decisão colegiada

Decisão colegiada deve produzir um resultado único e rastreável.

Votos divergentes podem ser preservados como histórico.

---

# 85. Expiração de decisão

Algumas aprovações podem expirar quando:

- baseline muda;
- contexto muda;
- risco muda;
- prazo excede;
- norma muda.

A política futura deve declarar validade.

---

# 86. Revalidação

Revalidação confirma que decisão anterior continua aplicável.

Pode resultar em:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
```

---

# 87. Supersessão

Supersessão substitui decisão anterior sem apagar histórico.

Deve preservar:

- decisão anterior;
- nova decisão;
- relação causal;
- instante;
- escopo.

---

# 88. Decisão revogada

Revogação impede efeitos futuros.

Não transforma decisão histórica válida em inexistente.

---

# 89. Evidência de decisão

Toda decisão material deve permitir recuperar:

- input;
- baseline;
- evidência;
- reviewer;
- auditor;
- findings;
- autoridade;
- resultado.

---

# 90. Audit trail

Governança deve produzir trilha auditável capaz de responder:

```text
quem decidiu?
com qual autoridade?
qual evidência existia?
qual norma estava vigente?
qual baseline foi avaliado?
quais findings existiam?
houve exceção?
qual efeito foi autorizado?
```

---

# 91. Integridade do histórico

Decisão histórica não deve ser editada para parecer diferente.

Correção ocorre por:

- supersessão;
- revogação;
- decisão compensatória;
- novo registro.

---

# 92. Governança de handoff

Handoffs materiais devem declarar:

- origem;
- destino;
- objeto;
- baseline;
- evidência;
- autoridade;
- responsabilidade assumida;
- continuidade.

---

# 93. Aceite de responsabilidade

Destino deve assumir responsabilidade de forma persistente ou o sistema deve
possuir mecanismo durável que garanta retomada.

Handoff perdido não é condição válida.

---

# 94. Governança de recovery

Recovery pode exigir decisão quando:

- risco mudou;
- baseline mudou;
- efeito anterior é incerto;
- autoridade expirou;
- causa da falha altera estratégia.

---

# 95. Governança de reconciliation

Reconciliation pode exigir autoridade para:

- consolidar efeito observado;
- descartar resultado;
- compensar;
- aceitar inconsistência residual;
- escalar.

---

# 96. Governança de compensation

Compensation é efeito governado.

Pode necessitar:

- autorização;
- análise de impacto;
- evidência;
- risco;
- auditoria.

Ela não deve ser tratada como simples rollback técnico quando possuir efeito de
negócio.

---

# 97. Exceção operacional

Exceção operacional pode existir para contornar temporariamente limitação
técnica.

Não pode violar lei constitucional.

---

# 98. Exceção normativa

Exceção que contraria norma superior somente pode existir se a própria norma
superior permitir mecanismo de exceção.

Caso contrário:

```text
não é exceção válida
```

---

# 99. Política futura

Policies derivadas deverão especificar:

- quem pode fazer o quê;
- quais gates são humanos;
- quais são automatizados;
- quando audit é obrigatório;
- quando independência é obrigatória;
- quando risco pode ser aceito;
- quando exceção é permitida;
- quorum;
- expiração;
- severidades detalhadas.

---

# 100. Contratos futuros

Contracts deverão materializar requisitos de:

- transição;
- autoridade;
- handoff;
- evidência;
- audit;
- continuidade;
- recovery;
- findings;
- exceção.

---

# 101. Projection de governança

APIs/UI futuras devem projetar:

- ações autorizadas;
- autoridade requerida;
- decisão pendente;
- reviewer;
- auditor;
- findings;
- blocker;
- exceção;
- risco;
- validade.

UI não inventa capability.

---

# 102. Falha de projeção

Se ação governada necessária existe, mas não pode ser descoberta pelo principal
responsável, existe inconsistência de continuidade.

---

# 103. Invariantes de governança

Devem permanecer verdadeiros:

```text
decisão material possui principal
decisão material possui autoridade
decisão material possui normative_baseline_ref
gate possui critérios
audit não substitui authority
review não substitui audit
author não aprova automaticamente o próprio trabalho
RISK_ACCEPTANCE não libera blocker
EXCEPTION não apaga finding
APPROVED_BY_EXCEPTION != APPROVED
mudança de baseline revalida controles afetados
autoridade revogada não produz nova decisão
Normative Baseline vigente é imutável e possui membership completo
instância nunca resolve norma implicitamente como "latest"
```

---

# 104. Proibições

Não é permitido:

- self-declared authority;
- approval sem principal;
- gate sem critérios;
- finding desaparecer;
- blocker ser liberado apenas por risk acceptance;
- exceção sem expiração ou escopo;
- audit sem baseline;
- reutilizar audit de baseline diferente sem prova de cobertura;
- agente assumir gate humano;
- revogação sem efeito;
- descendente operar sob baseline revogado;
- UI inferir autorização;
- decisão material existir apenas em chat;
- fato material referenciar versão normativa ambígua ou resolver norma como `latest`;
- alterar membership de Normative Baseline já vigente.

---

# 105. Cenários mentais

## 105.1 Autor tenta auditar o próprio trabalho

Se independência for exigida:

```text
BLOCK
```

---

## 105.2 Auditor aprova, humano rejeita

Resultado:

```text
não avança
```

Audit positivo não substitui authority.

---

## 105.3 Finding blocker com risk acceptance

Resultado:

```text
continua bloqueador
```

salvo exceção governada.

---

## 105.4 Finding blocker com exception

Pode avançar como:

```text
APPROVED_BY_EXCEPTION
```

se política permitir.

---

## 105.5 Baseline muda após audit

Audit anterior deve ser:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
ou
RECONCILE
```

Nunca presumidamente válido.

---

## 105.6 Delegação expira antes do gate

Gate não pode ser aprovado.

---

## 105.7 Agente recomenda cancelamento

Pode recomendar.

Não cancela se autoridade humana for obrigatória.

---

## 105.8 Project crítico sem auditor independente

Não avança quando policy exigir independência.

---

## 105.9 Humano tenta aprovar fora do escopo

Authority check falha.

---

## 105.10 UI mostra botão indevido

Backend/projeção deve negar capacidade.

A presença visual não cria autorização.

---

# 106. Questões deliberadamente deixadas para policies

Este documento não define:

- matriz de permissões;
- nomes de roles;
- nomes de grants;
- grupo organizacional;
- quorum concreto;
- thresholds;
- severidades numéricas;
- SLAs;
- expirações concretas;
- quais gates exatos são humanos por tipo de Project.

---

# 107. Questões deliberadamente deixadas para contracts

Este documento não define:

- payload de approval;
- schema de finding;
- formato de evidence;
- idempotency key;
- assinatura;
- token;
- endpoint;
- event name;
- persistence model.

---

# 108. Documentos derivados previstos

Após aprovação deste modelo, a camada de governance/policies pode ser decomposta
em documentos como:

```text
governance/
├── 01_GOVERNANCE_MODEL.md
├── 02_AUTHORITY_POLICY.md
├── 03_GATE_POLICY.md
├── 04_AUDIT_AND_REVIEW_POLICY.md
├── 05_FINDING_AND_EXCEPTION_POLICY.md
└── 06_RISK_POLICY.md
```

Essa decomposição é prevista, não obrigatória.

Arquivos só devem existir se agregarem responsabilidade normativa distinta.

---

# 109. Contratos previstos

Uma possível decomposição:

```text
contracts/
├── 01_TRANSITION_CONTRACT.md
├── 02_HANDOFF_CONTRACT.md
├── 03_EVIDENCE_AND_AUDIT_CONTRACT.md
├── 04_CONTINUITY_AND_RECOVERY_CONTRACT.md
└── 05_AUTHORITY_CONTRACT.md
```

Os nomes podem mudar durante derivação.

---

# 110. Critério de aprovação

Este Governance Model está pronto quando é possível responder, sem inventar nova
lei:

- quem é principal;
- o que é autoridade;
- como delegação funciona;
- como revogação funciona;
- como independência funciona;
- quem são author/reviewer/auditor/authority/executor;
- o que é gate;
- como findings funcionam;
- como blocker difere de risk acceptance;
- como exception funciona;
- como baseline invalida decisões anteriores;
- como autoridade humana e agente se relacionam;
- como cancelamento e pause são governados;
- como Delivery é aceita;
- como norma é ratificada;
- como uma Normative Baseline imutável identifica o conjunto completo de normas;
- como fatos históricos permanecem vinculados à baseline normativa correta;
- como uma instância migra entre baselines normativas;
- quais detalhes ainda pertencem a policies e contracts.

---

# 111. Princípio final

Governança não existe para impedir o sistema de agir.

Ela existe para garantir que o sistema consiga provar:

```text
quem podia decidir
+
por que podia decidir
+
com base em quê
+
sobre qual baseline
+
sob qual norma
+
com qual consequência
```

Se essa prova não existe, a decisão não deve ser tratada como autoritativa.
