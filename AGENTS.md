# AGENTS.md — NAAMIVE

**Status:** NON-NORMATIVE OPERATIONAL INSTRUCTIONS  
**Escopo:** agentes de IA e automações trabalhando neste repositório

Este arquivo define regras operacionais para agentes.

Ele **não é uma fonte normativa concorrente**. Em caso de conflito com uma
Normative Baseline efetiva, a baseline prevalece. Em caso de conflito documental
não resolvido, opere fail-closed e reporte a inconsistência em vez de inventar
uma regra.

---

## 1. Princípio de trabalho

NAAMIVE existe para:

```text
Transforming Business Needs into Delivered Software
```

O software é consequência.

**Valor de negócio entregue é o objetivo.**

Não otimize uma task local sacrificando lifecycle, autoridade, auditabilidade,
continuidade ou coerência global.

---

## 2. Antes de qualquer task

Antes de alterar documentação ou código:

1. leia a task inteira;
2. identifique o escopo exato;
3. leia este `AGENTS.md`;
4. classifique a task como **mecânica/local** ou **governada/material**;
5. leia somente a documentação necessária para executar o escopo com segurança;
6. só então proponha ou realize mudanças.

### 2.1 Task mecânica/local

Considere mecânica/local quando a task:

- possui arquivos-alvo conhecidos e escopo explícito;
- não altera comportamento normativo;
- não realiza transição de lifecycle;
- não muda authority, baseline, contracts ou intenção de negócio;
- não exige auditoria ou investigação ampla.

Nesse caso:

- abra diretamente os arquivos-alvo;
- leia apenas regras explicitamente referenciadas ou materialmente necessárias;
- **não faça crawl, indexação ou busca pelo repositório inteiro**;
- **não inventarie lifecycle, authority, gates, contracts, continuity ou recovery**
  se eles não forem afetados;
- **não abra diagramas ou documentação auxiliar por padrão**;
- execute apenas os checks proporcionais à mudança;
- para mudança somente documental, não execute suíte ampla de testes salvo pedido
  explícito ou necessidade concreta.

### 2.2 Task governada/material

Quando a task alterar lifecycle, authority, baseline, contrato, comportamento
normativo, arquitetura material ou autorização de execução:

1. leia a documentação normativa aplicável;
2. identifique a Normative Baseline efetiva, quando existir;
3. identifique somente os lifecycle, authority, gates, contracts, baseline,
   continuity e recovery realmente afetados.

Para leitura rápida do sistema, quando ela for necessária, use:

- `lifecycle/diagrams/00_LIFECYCLE_VISUAL_GUIDE.md`

O guia visual é não normativo.

---

## 3. Ordem de autoridade documental

```text
00_NAAMIVE_CONSTITUTION.md
        ↓
lifecycle/
        ↓
governance/
        ↓
contracts/
        ↓
state/
        ↓
architecture/
        ↓
orchestration/
        ↓
security/
        ↓
api/
        ↓
ui/
        ↓
observability/
        ↓
implementation/
```

Documento inferior detalha o superior. Não pode contradizê-lo.

---

## 4. Normative Baseline

Nunca resolva uma instância ou decisão usando simplesmente:

```text
latest
HEAD
documento mais novo
regra que parece atual
```

Quando houver Normative Baseline efetiva, use o `normative_baseline_ref`
aplicável.

Nova revisão documental não migra automaticamente instâncias existentes.

Migração normativa exige decisão explícita source → target.

---

## 5. Antes da primeira ratificação

Enquanto não existir Normative Baseline efetiva:

- não trate `CANDIDATE FOR APPROVAL` como norma vigente;
- não inicie implementação real por inferência;
- não declare o corpus `IN FORCE` sem ratificação humana explícita.

---

## 6. Technology Baseline

Mesmo após ratificação normativa, não inicie a primeira fatia de código sem uma
Technology Baseline aprovada quando
`implementation/01_IMPLEMENTATION_READINESS.md` assim exigir.

Não invente tecnologia em silêncio.

---

## 7. Um agente por task

Use **um novo agente por task**.

Esta regra é uma responsabilidade do **operador/orquestrador humano**. Ela
**não autoriza o agente da task a criar, delegar ou coordenar outros agentes**.

O agente é um worker, não um orquestrador.

Por padrão, o agente da task deve:

```text
receber a task
→ executar o escopo
→ validar proporcionalmente
→ reportar o resultado
→ encerrar
```

Sem instrução explícita na própria task, o agente **não deve**:

- criar subagente;
- delegar parte da task a outro worker;
- criar reviewer, auditor ou verifier independente;
- solicitar a outro agente que tente falsificar suas conclusões;
- executar revisão independente recursiva;
- criar nova task para si mesmo ou para outro agente;
- transformar validação local em uma nova auditoria;
- continuar trabalhando depois que os critérios de conclusão forem satisfeitos.

Quando revisão ou auditoria independente for desejada, ela deve ser uma
**task separada**, iniciada pelo operador/orquestrador depois que o worker
anterior terminar.

Exceção: subagentes só podem ser usados quando a task recebida disser
explicitamente que delegação é necessária ou autorizada e definir seu escopo.

Mesmo quando autorizados:

- subagentes não podem criar outros subagentes;
- a delegação deve permanecer limitada ao escopo original;
- o agente principal não deve iniciar ciclos recursivos de verificação.

Não reutilize indefinidamente o mesmo contexto para tasks independentes.

Isso reduz contaminação de contexto, facilita auditoria e deixa causa e
responsabilidade da mudança mais claras.

### 7.1 Execução enxuta

Prefira o caminho mais curto que prove a conclusão da task.

Para tasks mecânicas/locais:

- abra diretamente arquivos conhecidos em vez de pesquisar o repositório;
- faça no máximo **uma passada de validação final**;
- não faça "independent verification" automática;
- não faça "falsification pass" automática;
- não releia o corpus inteiro depois de editar;
- não execute testes não relacionados;
- não crie fases artificiais de planejamento, revisão e pós-revisão.

Como orçamento operacional padrão, uma task mecânica deve normalmente terminar
em até **10–15 tool calls**. Se esse orçamento for excedido porque surgiu um
bloqueio real, pare a expansão automática e reporte objetivamente o motivo.

Comandos de terminal devem ser não interativos sempre que possível. Todo
comando que possa bloquear, aguardar lock, depender de serviço externo, iniciar
servidor, executar concorrência ou permanecer em background deve obedecer às
regras de timeout e cleanup da seção 7.2.

### 7.2 Segurança de comandos, probes e processos

Estas regras valem para **qualquer IA, agente, reviewer, auditor, executor,
subagente autorizado ou automação** trabalhando neste repositório.

O objetivo é impedir que uma execução fique presa indefinidamente consumindo
tempo, contexto ou recursos apenas porque um processo externo, lock, servidor ou
job em background não terminou.

Princípio obrigatório:

```text
no unbounded waits
no unbounded database probes
no orphan background processes
```

#### 7.2.1 Timeout é obrigatório quando houver possibilidade de espera

Qualquer comando com possibilidade razoável de bloquear ou demorar sem progresso
deve possuir um limite finito explícito.

Isso inclui, quando aplicável:

- probes de banco de dados;
- testes de lock;
- testes de concorrência;
- `docker exec`;
- `psql`;
- Playwright/browser;
- servidores HTTP temporários;
- Vite/preview;
- processos em background;
- `wait`;
- chamadas de rede;
- scripts ad hoc de review/audit;
- comandos que aguardem serviço externo;
- qualquer ferramenta cujo término não seja garantido por construção.

Para comandos shell, prefira um timeout externo explícito, por exemplo:

```bash
timeout 30s <command>
```

O valor deve ser proporcional ao comando. Não existe obrigação de usar `30s`;
o importante é que o limite seja finito e coerente com a operação.

Suites conhecidamente longas, como build ou integração completa, podem usar
limites maiores, mas ainda devem ter uma estratégia de término finita.

#### 7.2.2 Banco de dados exige proteção em mais de uma camada

Probes de PostgreSQL que possam disputar lock ou executar SQL potencialmente
bloqueante devem usar, quando aplicável:

```text
lock_timeout
statement_timeout
```

Além disso, prefira manter um timeout externo no shell/processo.

Exemplo conceitual:

```bash
timeout 30s docker exec   -e PGOPTIONS="-c statement_timeout=5000 -c lock_timeout=2000"   <container> psql ...
```

Não confie apenas em `lock_timeout` de uma das sessões concorrentes.

Se duas ou mais sessões participarem do mesmo probe, todas as sessões capazes de
bloquear devem possuir limites coerentes.

#### 7.2.3 `wait` nunca pode ser ilimitado

Um probe de concorrência não pode depender de:

```bash
wait <pid>
```

sem uma estratégia finita de timeout/abort.

Processos em background devem ter:

- PID rastreado;
- timeout finito;
- cleanup explícito;
- encerramento no abort da task;
- encerramento ao sair do script, quando aplicável.

Use `trap`, cleanup equivalente ou mecanismo da ferramenta sempre que houver
risco de processo órfão.

#### 7.2.4 Servidores temporários devem ter lifecycle explícito

Servidor temporário iniciado para teste não deve continuar vivo depois da task.

Isso inclui, por exemplo:

- Playwright test server;
- Vite preview;
- servidor HTTP local;
- containers temporários;
- processos auxiliares de integração.

Ao iniciar um servidor temporário, registre como ele será encerrado.

Não mate processo preexistente e não relacionado apenas para liberar porta.

Se uma porta esperada estiver ocupada por serviço externo à task:

- use outra porta segura; ou
- reporte a limitação.

Não altere processo alheio silenciosamente.

#### 7.2.5 Preferir estado descartável para probes

Security review, migration review, concorrência e probes destrutivos devem
preferir:

- banco descartável;
- schema descartável;
- container descartável;
- fixture isolada.

Não reutilize estado sujo como evidência final sem justificativa explícita.

Se um probe intermediário puder deixar lock, sessão, dado ou processo residual,
faça cleanup antes do próximo probe ou recrie o ambiente descartável.

#### 7.2.6 Timeout é resultado, não convite para esperar mais

Quando um comando exceder o timeout:

1. interrompa o comando afetado;
2. não continue esperando indefinidamente;
3. registre qual comando expirou;
4. preserve o último output útil;
5. investigue a causa do bloqueio de forma proporcional;
6. só repita se houver mudança material no probe ou no ambiente.

Não aumente timeout repetidamente apenas para obter `PASS`.

Não transforme:

```text
timeout
```

em:

```text
vamos esperar mais um pouco
```

sem nova evidência.

#### 7.2.7 Abort da task exige interrupção real

Quando o operador solicitar `STOP`, `ABORT`, `CANCEL` ou equivalente:

- interrompa a execução corrente assim que tecnicamente possível;
- não inicie novo probe;
- não crie novo subagente;
- não tente "terminar só mais uma verificação";
- não substitua o comando travado por outro comando automaticamente;
- não faça rework adicional;
- preserve o estado já produzido;
- reporte objetivamente o ponto de interrupção.

Uma instrução de abort não é uma nova fase da investigação.

#### 7.2.8 Evidence de review/audit deve registrar incidentes de execução

Quando um timeout, lock, abort, processo órfão ou limitação de ambiente afetar a
prova, o relatório deve registrar isso.

Uma execução que ficou pendurada indefinidamente não é evidence válida de
sucesso.

Quando houver retry de um probe, diferencie:

```text
tentativa inicial
retry
resultado aplicável
```

e explique por que o retry substitui ou não a primeira tentativa como evidence.

#### 7.2.9 Limite de expansão investigativa

Reviews e audits podem criar probes temporários proporcionais ao risco, mas não
devem proliferar indefinidamente variações do mesmo experimento.

Depois que uma hipótese estiver suficientemente provada ou refutada:

```text
registrar conclusão
→ parar aquela linha de investigação
```

Se surgirem múltiplas variações sucessivas (`probe2`, `probe3`, `probe-final`,
`probe-final-2`, etc.), o agente deve reavaliar se:

- falta uma hipótese clara;
- o ambiente está contaminado;
- o probe deveria ser simplificado;
- é melhor recriar ambiente limpo;
- já existe evidência suficiente para reportar finding.

A investigação deve convergir.

#### 7.2.10 Relação com Harness futuro

Enquanto o Harness ainda não impõe esses limites tecnicamente, o agente deve
obedecê-los por instrução operacional.

Quando houver enforcement no Harness, preferir:

```text
timeout padrão por classe de comando
PID/process handle rastreável
cleanup automático
cancelamento propagado
limites de lock/statement para probes de banco
detecção de processo órfão
```

A existência futura de enforcement não reduz a obrigação atual do agente.

---

## 8. Não expandir escopo silenciosamente

Não faça refactor, limpeza, renomeação, reorganização ou correção lateral apenas
porque parece conveniente.

Se encontrar algo fora do escopo:

```text
registrar / reportar
≠
corrigir silenciosamente
```

Só altere fora do escopo quando a task autorizar ou quando a correção for
necessária para preservar uma invariável que a task não pode violar. Nesse caso,
explique a necessidade.

---

## 9. Git safety

Sem autorização explícita do operador, agentes não devem:

- commit;
- push;
- merge;
- rebase;
- reset;
- clean;
- force push;
- apagar branch;
- alterar histórico.

O operador humano controla publicação e histórico.

Quando solicitado, o agente pode sugerir uma mensagem de commit.

---

## 10. Legado arquivado

Conteúdo em:

```text
naamive/backup/
```

é histórico e não normativo.

Pode ensinar, mas não governa.

Não restaure contratos, CLI, protocolos ou compatibilidade antigos por padrão.

```text
legacy can teach
legacy cannot govern
```

---

## 11. Terminal significa terminal

Não reabra uma instância terminal por edição silenciosa.

Exemplos:

```text
Execution FAILED
Work Item DONE
Module INTEGRATED
Project DELIVERED
```

Quando houver continuidade, crie retry, recovery, successor, rework, nova Work
Item, nova Need ou nova instância causal apropriada.

Preserve história.

---

## 12. Execution e Work Item são diferentes

```text
Execution SUCCEEDED
≠
Work Item DONE
≠
Module INTEGRATED
≠
Project DELIVERED
```

Cada promoção depende do seu próprio lifecycle, evidence, authority e gate.

---

## 13. Fail-closed com continuidade

Quando não for possível provar authority, baseline, versão, identidade, intenção,
pré-condições ou compatibilidade normativa, não avance por suposição.

Mas não crie dead-end silencioso.

Materialize continuidade tratável, como:

- HUMAN_ACTION;
- GOVERNED_WAIT;
- GOVERNED_BLOCK;
- RECOVERY;
- RECONCILIATION;
- escalation;
- Inconsistency.

---

## 14. Findings, Risk e Exception

Não trate esses conceitos como equivalentes.

```text
Risk acceptance não fecha Finding.
Exception não fecha nem reclassifica Finding.
Exception é relação separada.
APPROVED_BY_EXCEPTION pertence ao gate/decision.
```

Finding bloqueador impede avanço normal enquanto seu efeito não for tratado de
forma governada.

---

## 15. Baseline change

Mudança material em escopo, arquitetura, planejamento, baseline ou intenção pode
invalidar descendentes e evidências.

Classifique, conforme aplicável:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

Enquanto a cobertura estiver indefinida, não permita nova Execution nem novo
resultado autoritativo no escopo potencialmente afetado.

---

## 16. Recovery e retry

Nunca ressuscite `Execution FAILED`.

Retry/recovery cria nova tentativa causal.

Se efeito externo anterior for incerto:

```text
RECONCILIATION primeiro
```

Não use retry cego quando repetição puder duplicar efeito indevido.

---

## 17. Handoffs

Não considere:

```text
"enviei"
```

equivalente a:

```text
"o destino assumiu"
```

Handoff precisa ser durável, observável, idempotente e recuperável.

---

## 18. Authority

Autoria não implica autoridade de aprovação.

Agent pode atuar como author, reviewer, auditor, executor ou recommender quando a
task permitir.

Agent não assume automaticamente HUMAN_GATE nem autoridade de ratificação.

Se a norma exige humano, preserve essa exigência.

---

## 19. Auditoria

Quando a **task recebida** for de auditoria:

- não corrija enquanto audita, salvo autorização explícita;
- cite evidência concreta;
- classifique finding por severidade;
- diferencie falha normativa, ambiguidade, gap de implementação e preferência;
- procure contradições e dead-ends, não apenas happy path;
- verifique regressões;
- mantenha independência proporcional à materialidade.

"Independência" aqui significa separação adequada entre implementação e a task
de auditoria. **Não significa que um agente deve criar outro agente para
auditá-lo.**

Se a auditoria independente exigir um worker diferente, o operador/orquestrador
deve iniciar essa task separadamente.

Auditoria positiva não equivale a ratificação humana.

---

## 20. Desenvolvimento

Quando a implementação estiver formalmente liberada, construa verticalmente:

```text
state
  ↓
persistence
  ↓
transition
  ↓
authority
  ↓
projection
  ↓
API
  ↓
UI / agent action
  ↓
tests
  ↓
observability
  ↓
recovery
```

Evite construir todas as camadas horizontalmente antes de provar um fluxo
vertical governado.

---

## 21. Testes

Valide proporcionalmente, incluindo quando aplicável:

- happy path;
- transição inválida;
- authority ausente/revogada;
- idempotência;
- concorrência;
- restart;
- handoff interrompido;
- retry;
- terminal failure;
- stale executor;
- baseline mismatch;
- projection conformance;
- recovery/reconciliation;
- cancelamento/pause;
- efeitos tardios.

Não altere teste apenas para fazê-lo passar quando o teste representa a norma
correta.

---

## 22. Documentação

Ao alterar comportamento normativo:

1. altere primeiro a camada normativa correta;
2. propague para documentos inferiores afetados;
3. não esconda regra nova apenas em código, teste, prompt ou comentário;
4. atualize diagramas apenas como derivação;
5. mantenha documentos normativos focados na regra atual, não em changelog.

---

## 23. Diagramas

Conteúdo em:

```text
lifecycle/diagrams/
```

é auxiliar para humanos.

Se diagrama e norma textual divergem:

```text
norma textual prevalece
```

e a divergência deve ser corrigida no guia visual.

---

## 24. Segurança e secrets

Nunca grave secrets, tokens, senhas ou credenciais reais em código,
documentação, fixtures, logs, exemplos ou commits.

---

## 25. Idioma

Use **Português do Brasil** para documentação e comunicação do projeto, exceto
identificadores técnicos canônicos, estados, APIs, nomes de arquivos e termos de
protocolo que deliberadamente usem inglês.

---

## 26. Ao terminar uma task

Antes de declarar concluído, faça **uma validação proporcional ao escopo**:

1. confira o escopo;
2. verifique arquivos alterados;
3. valide apenas as invariantes afetadas;
4. execute os checks aplicáveis;
5. procure regressão direta relacionada à mudança;
6. reporte o que mudou;
7. reporte o que não foi possível validar;
8. não publique nem faça commit sem autorização;
9. **encerre a task**.

Não crie subagente para verificar a conclusão.

Não faça segunda auditoria, falsification pass, review recursivo ou nova rodada
de investigação por padrão depois que os checks aplicáveis passarem.

Se um check falhar, trate apenas a causa dentro do escopo ou reporte o bloqueio.
Não expanda silenciosamente a task.

---

## 27. Princípio final

Um agente deve conseguir responder:

```text
qual necessidade esta mudança atende?
qual norma a governa?
qual baseline é aplicável?
quem tem autoridade?
qual evidência prova o resultado?
como o sistema continua se algo falhar?
```

Se não consegue responder e isso é material para a task:

```text
não invente
investigue, bloqueie de forma acionável ou escale
```
