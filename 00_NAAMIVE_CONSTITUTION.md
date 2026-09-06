# NAAMIVE Constitution

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.4  
**Autoridade:** Constituição conceitual máxima do NAAMIVE  
**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior foi ratificada  
**Escopo:** todo o sistema NAAMIVE e todos os documentos normativos derivados

---

## 1. Propósito

NAAMIVE existe para transformar uma necessidade real de negócio em uma solução
de software entregue, utilizável e capaz de evoluir.

O objetivo do NAAMIVE não é gerar código, executar agentes de inteligência
artificial ou automatizar tarefas isoladas de engenharia.

Esses são meios.

O objetivo é reduzir, de forma governada e verificável, a distância entre:

```text
necessidade de negócio
        ↓
entendimento
        ↓
concepção
        ↓
decisão
        ↓
construção
        ↓
validação
        ↓
entrega
        ↓
evolução
```

O software é consequência.

**Valor de negócio entregue é o objetivo.**

---

# AUTORIDADE NORMATIVA

## 2. Autoridade constitucional

Esta Constituição é a autoridade conceitual máxima do NAAMIVE quando estiver
formalmente ratificada e vigente.

Toda definição posterior deve ser derivada dela, incluindo:

- lifecycle;
- máquinas de estado;
- contratos;
- gates;
- agentes;
- orquestração;
- persistência;
- APIs;
- projeções;
- interfaces;
- mecanismos de recuperação;
- auditoria;
- testes.

Nenhum documento derivado pode criar regra que contradiga esta Constituição.

Não deve existir uma convivência permanente entre documentos normativos
concorrentes que expressem leis diferentes para o mesmo conceito.

Quando houver conflito normativo:

1. a regra constitucional vigente prevalece;
2. regras derivadas incompatíveis não podem ser aplicadas;
3. o avanço afetado deve operar em modo fail-closed;
4. o conflito deve ser registrado como inconsistência normativa;
5. a inconsistência deve ser resolvida por autoridade constitucional competente.

**O NAAMIVE deve possuir uma lei, não várias versões da lei competindo entre si.**

---

## 3. Ciclo de vida da própria norma

A Constituição e demais normas derivadas devem possuir ciclo de vida normativo
explícito.

Toda versão normativa deve possuir, no mínimo:

- identificador de versão ou revisão;
- status;
- autoridade responsável pela ratificação;
- instante de entrada em vigor;
- relação com versão anterior;
- regra de supersessão;
- histórico de alteração;
- escopo de aplicabilidade.

Uma versão em `BRAINSTORM`, `DRAFT` ou equivalente não possui autoridade
normativa sobre execução real.

Uma versão somente se torna normativa após ratificação explícita por autoridade
competente.

Uma norma vigente não pode ser reescrita retroativamente para alterar o sentido
de decisões históricas.

Correções normativas devem ocorrer por nova revisão, emenda ou supersessão
rastreável.

---

## 4. Vínculo entre decisão e versão normativa

Toda decisão, transição, gate, auditoria ou autorização material deve poder ser
vinculada à versão normativa que a governou.

A plataforma deve ser capaz de responder:

```text
qual regra estava vigente quando esta decisão foi tomada?
```

Mudança de norma não reinterpreta automaticamente uma instância já existente.

Instâncias ativas somente migram para nova norma por decisão explícita,
rastreável e governada.

Uma migração deve declarar, conforme aplicável:

- origem normativa;
- destino normativo;
- recursos afetados;
- compatibilidades;
- incompatibilidades;
- evidências requeridas;
- estratégia de transição;
- tratamento de estados que não possuam equivalência.

Na ausência de migração válida, a instância permanece vinculada ao contrato
normativo que legitimou seu estado atual.

---

## 5. Separação entre conceito e implementação

A Constituição define **o que precisa ser verdadeiro**.

Ela não determina necessariamente **como será implementado**.

A Constituição pode exigir, por exemplo:

- estado canônico persistente;
- idempotência;
- rastreabilidade;
- continuidade;
- independência;
- auditoria;

sem determinar previamente tecnologia, linguagem, banco de dados, framework,
provedor de IA ou mecanismo físico utilizado.

Decisões tecnológicas pertencem aos documentos derivados e podem evoluir sem
alterar os princípios constitucionais.

---

# VOCABULÁRIO CONSTITUCIONAL

## 6. Definições mínimas

Os documentos derivados devem preservar estes significados.

### Principal

Identidade verificável de uma pessoa, agente, serviço ou outro ator capaz de
receber autoridade e executar ação governada.

### Autoridade

Permissão verificável concedida a um principal para realizar determinada ação
em determinado escopo, sob condições específicas.

Autoridade nunca é presumida apenas porque foi declarada pela própria requisição.

### Intenção

Objetivo lógico único e persistente que justifica uma ação ou conjunto
controlado de tentativas.

Retries técnicos não criam, por si só, uma nova intenção.

### Estado canônico

Representação autoritativa do estado corrente de uma instância governada.

### Fato histórico

Registro imutável de algo que ocorreu, foi decidido, observado ou produzido.

Correções de fatos históricos devem ocorrer por supersessão ou registro
compensatório, nunca por adulteração silenciosa.

### Recurso ativo

Recurso cuja intenção de continuidade permanece válida e cujo lifecycle ainda
não atingiu condição terminal.

`PAUSED` pode preservar a intenção de continuidade sem possuir trabalho em
execução; sua continuidade deve continuar governada.

### Recurso terminal

Recurso cujo lifecycle não admite avanço normal sem criação explícita de nova
intenção, recuperação ou evolução prevista em lei.

### Elegível

Recurso que satisfaz todas as pré-condições normativas, de estado, autoridade,
dependência e segurança necessárias para determinada ação.

### Evidência suficiente

Conjunto de evidências que satisfaz os critérios explicitamente definidos para
uma decisão.

Existência de evidência não implica suficiência.

### Consistente

Condição em que norma aplicável, fatos, estado corrente, dependências,
autoridades e projeções não apresentam contradição relevante.

### Finding

Achado formal produzido por revisão ou auditoria e vinculado a evidência,
severidade, escopo e responsável por tratamento.

### Bloqueio

Impedimento conhecido que preserva intenção de continuidade, mas impede avanço
até condição de saída verificável.

### Espera governada

Condição explícita em que o avanço depende de fato futuro conhecido e
monitorável, possuindo responsável, condição de saída e estratégia de
escalada.

### Retry

Nova tentativa técnica da mesma intenção, permitida apenas quando a política
aplicável afirmar que repetir a operação é seguro.

### Rework

Novo trabalho autorizado porque o resultado produzido não satisfez os critérios
de qualidade ou aceitação.

### Recovery

Nova execução causal criada para restaurar continuidade após falha terminal ou
condição operacional recuperável.

### Reconciliation

Processo que compara estado canônico com fatos observados para resolver dúvida,
divergência ou efeito parcialmente conhecido.

### Compensation

Ação governada destinada a neutralizar ou mitigar efeito anterior quando este
não pode simplesmente ser apagado ou ignorado.

---

# VERDADE, ESTADO E HISTÓRICO

## 7. Três camadas de verdade

O NAAMIVE deve separar explicitamente:

```text
VERDADE NORMATIVA
o que é permitido e exigido
        ↓
ESTADO CANÔNICO DA INSTÂNCIA
onde o recurso está agora
        ↓
FATOS HISTÓRICOS
o que ocorreu para chegar até aqui
```

Essas três camadas possuem responsabilidades diferentes e não podem substituir
umas às outras.

### Verdade normativa

É composta apenas por normas ratificadas e vigentes aplicáveis à instância.

### Estado canônico

É a fonte autoritativa da situação corrente do recurso.

### Fatos históricos

Preservam causalidade, decisões, evidências, execuções, findings, aprovações,
handoffs, falhas e demais acontecimentos relevantes.

Documentos, dashboards, APIs, telas e relatórios são projeções dessas fontes.

Eles não constituem autoridades concorrentes.

---

## 8. Integridade histórica

Fatos históricos materiais devem ser preservados de forma imutável ou por
mecanismo equivalente que garanta impossibilidade de alteração silenciosa.

Se um fato precisar ser corrigido:

```text
fato anterior permanece conhecido
        ↓
nova correção / supersessão é registrada
        ↓
causalidade entre ambos permanece verificável
```

Aplica-se, conforme relevante, a:

- decisões;
- evidências;
- findings;
- aprovações;
- rejeições;
- execuções;
- handoffs;
- autorizações;
- cancelamentos;
- recuperações;
- entregas.

Nenhuma decisão histórica pode ter sua justificativa substituída posteriormente
sem deixar registro explícito da mudança.

---

# ORIGEM E ESTRUTURA FUNDAMENTAL

## 9. Necessidade de negócio como origem

Todo trabalho governado pelo NAAMIVE deve possuir uma origem rastreável.

A origem primária é uma **Necessidade de Negócio**.

Uma necessidade deve explicar, em profundidade proporcional ao momento do
lifecycle:

- qual problema existe;
- quem é afetado;
- qual resultado é desejado;
- por que esse resultado possui valor;
- quais restrições relevantes são conhecidas.

Nenhum projeto deve existir apenas porque alguém decidiu implementar determinada
tecnologia.

Tecnologia serve à solução.

**Tecnologia não define a necessidade.**

---

## 10. Estrutura fundamental

O NAAMIVE governa, no mínimo, os seguintes conceitos:

```text
Necessidade
    ↓
Projeto
    ↓
Módulos
    ↓
Itens de Trabalho
    ↓
Execuções
    ↓
Evidências / Revisões / Auditorias / Decisões
    ↓
Entrega
```

Cada conceito possui responsabilidade distinta.

### Necessidade

Expressa problema, oportunidade ou mudança de negócio.

### Projeto

É a unidade governada responsável por transformar uma necessidade aprovada em
resultado entregue.

### Módulo

É uma capacidade de negócio coerente pertencente a um projeto.

Módulo não representa camada técnica.

### Item de Trabalho

É uma unidade planejada de mudança necessária para produzir parte do resultado.

Todo Item de Trabalho possui exatamente um escopo governante:

- Projeto; ou
- Módulo.

Itens transversais podem possuir escopo de Projeto e referenciar explicitamente
os módulos afetados.

### Execução

É uma tentativa concreta e auditável de realizar um Item de Trabalho autorizado.

Toda Execução pertence a exatamente um Item de Trabalho.

### Entrega

É um marco governado de negócio que associa uma versão ou baseline de resultado
do Projeto a evidências de validação, autoridade de aceite e origem de negócio.

A forma física de persistência da Entrega é decisão de implementação; seu papel
conceitual é obrigatório.

---

## 11. Relações e ownership mínimos

As seguintes relações são constitucionais:

- toda Necessidade aceita deve permanecer rastreável ao Projeto que originou;
- todo Módulo pertence a exatamente um Projeto proprietário;
- todo Item de Trabalho possui exatamente um escopo governante;
- toda Execução pertence a exatamente um Item de Trabalho;
- toda Entrega pertence a um Projeto;
- toda evolução de produto entregue deve permanecer vinculada à Entrega ou
  baseline anterior e a uma Necessidade governada.

Nenhum recurso governado pode existir sem ownership explícito.

---

## 12. Dependências são relações governadas

Dependências relevantes entre recursos devem ser explícitas e rastreáveis.

Toda dependência deve declarar, no mínimo:

- recurso dependente;
- recurso predecessor ou condição externa;
- motivo;
- condição objetiva de satisfação;
- impacto enquanto não satisfeita;
- responsável por acompanhamento;
- estratégia de tratamento caso se torne impossível.

Dependência não pode ser representada apenas por texto informal.

Ciclos de dependência que impeçam progresso são inválidos.

Se um ciclo intencional existir por necessidade de domínio, o modelo derivado
deve provar uma estratégia de quebra, coordenação ou convergência que preserve
continuidade.

---

# LIFECYCLES E TRANSIÇÕES

## 13. Lifecycle de negócio e lifecycle operacional são dimensões distintas

O NAAMIVE deve separar duas dimensões.

### Lifecycle de negócio

Responde:

> Onde está a necessidade, o projeto ou o módulo em sua jornada?

### Lifecycle operacional

Responde:

> O que está acontecendo com uma execução concreta?

Uma falha operacional não deve, por si só, redefinir o significado do estado de
negócio.

Da mesma forma, o estado de negócio não deve esconder uma execução operacional
quebrada.

Essa separação é obrigatória.

---

## 14. Transições explícitas

Nenhum recurso governado muda de estado implicitamente.

Toda mudança deve possuir, conforme aplicável:

- estado anterior;
- intenção;
- evento ou comando;
- pré-condições;
- versão normativa aplicável;
- principal responsável;
- autoridade;
- evidências necessárias;
- estado resultante;
- registro auditável.

Uma execução tecnicamente bem-sucedida não significa automaticamente que o
trabalho foi aceito.

A existência de evidência também não significa automaticamente que ela seja
suficiente.

---

# CLASSIFICAÇÃO DE IMPACTO E MATURIDADE

## 15. Classificação canônica de impacto

Toda proposta de mudança deve receber classificação rastreável de impacto antes
que o sistema decida quais controles podem ser comprimidos ou exigidos.

As classes mínimas são:

### TRIVIAL

Mudança local, reversível e de baixo impacto que:

- não cria nova jornada de usuário;
- não altera contrato externo;
- não altera modelo persistente de negócio;
- não altera segurança, identidade ou autoridade;
- não introduz nova dependência relevante;
- não afeta arquitetura material;
- não produz efeito externo irreversível;
- não altera lifecycle ou norma.

### MATERIAL

Mudança que introduz ou modifica decisão relevante de produto, arquitetura,
experiência, integração, dados, contrato, operação ou escopo.

São **no mínimo MATERIAL**, entre outros:

- nova tela ou nova jornada relevante;
- nova API ou alteração material de contrato;
- nova capacidade de negócio;
- mudança arquitetural;
- mudança de persistência de negócio;
- mudança cross-module;
- nova integração externa;
- novo mecanismo de automação com efeito relevante;
- novo comportamento que altera experiência ou responsabilidade do usuário.

### CRÍTICA

Mudança material com risco elevado, como:

- identidade, autenticação ou autorização;
- segurança;
- dados sensíveis;
- perda ou corrupção de dados;
- operação de produção com efeito irreversível;
- obrigação legal ou compliance;
- alteração normativa do lifecycle;
- alteração transversal capaz de comprometer várias áreas do sistema;
- decisão cuja falha possa comprometer integridade ou continuidade ampla.

---

## 16. Default conservador

Quando houver dúvida razoável entre duas classificações, deve ser aplicada a
classe de maior impacto até que evidência suficiente justifique redução.

Nenhum agente, autor ou implementador pode classificar unilateralmente seu
próprio trabalho como `TRIVIAL` para evitar controles.

A classificação deve ser registrada e verificável.

Mudanças `MATERIAL` e `CRÍTICA` exigem, no mínimo:

```text
DESCOBRIR
   ↓
CONCEBER
   ↓
REVISAR
   ↓
AUDITAR
   ↓
DECIDIR
   ↓
IMPLEMENTAR
```

Mudanças `TRIVIAL` podem usar processo simplificado, mas a simplificação deve
ser justificada pela classificação registrada.

---

## 17. Maturidade antes da materialização

Nenhum artefato estrutural ou decisão material deve ser implementado apenas
porque existe uma intenção genérica de criá-lo.

Antes da materialização de algo novo com impacto relevante, o NAAMIVE deve
garantir nível suficiente de definição.

Isso inclui, conforme aplicável:

- problema a resolver;
- usuários ou consumidores;
- objetivos;
- jornadas ou fluxos;
- responsabilidades;
- alternativas consideradas;
- restrições;
- riscos;
- dependências;
- critérios de sucesso;
- impactos sobre partes existentes;
- questões ainda abertas.

Decisões materiais exigem concepção explícita.

---

## 18. Brainstorm como mecanismo de engenharia

Brainstorm não é apenas conversa informal opcional.

No NAAMIVE, brainstorm é mecanismo de descoberta e amadurecimento de decisões
ainda abertas.

Durante brainstorm material, agentes especializados devem contribuir
ativamente, incluindo:

- fazer perguntas;
- identificar lacunas;
- questionar premissas;
- propor alternativas;
- comparar opções;
- apontar riscos;
- sugerir melhorias;
- identificar impactos;
- revelar decisões ainda não tomadas.

O objetivo não é aumentar burocracia.

O objetivo é impedir que decisões importantes não discutidas sejam tomadas
acidentalmente durante a implementação.

---

## 19. Planejamento é atividade de descoberta

Planejamento não significa apenas decompor uma solução assumida em tarefas.

Planejamento também deve descobrir se a solução está suficientemente definida
para ser construída.

Um planejamento adequado deve identificar, conforme aplicável:

- requisitos ausentes;
- decisões não tomadas;
- conflitos;
- riscos;
- dependências;
- alternativas relevantes;
- falta de critérios de aceitação;
- falta de entendimento de usuários ou fluxos;
- ausência de evidência suficiente para avançar.

Um agente de planejamento não deve ser apenas um gerador de tarefas.

---

## 20. Participação ativa dos agentes

Agentes do NAAMIVE não são apenas executores de instruções.

Dentro de sua especialidade, espera-se que contribuam para a qualidade da
decisão.

Um agente deve poder declarar:

- faltam decisões antes de implementar;
- existem alternativas ainda não avaliadas;
- determinado requisito conflita com outro;
- a proposta cria risco excessivo;
- a solução está excessivamente acoplada;
- faltam critérios para determinar prontidão;
- a experiência proposta apresenta problemas;
- determinada decisão deveria ser revisada por outra especialidade.

Obediência literal não substitui julgamento técnico.

Recomendação de agente não equivale automaticamente a decisão autorizada.

---

## 21. Não invenção silenciosa

Quando uma especificação relevante estiver incompleta, um agente não deve
preencher silenciosamente as lacunas com decisões próprias e tratá-las como
requisitos estabelecidos.

O agente deve distinguir claramente:

- o que foi decidido;
- o que foi inferido;
- o que continua em aberto;
- o que está recomendando.

Incerteza material não resolvida deve ser convertida em decisão pendente,
finding, bloqueio ou outra condição governada com responsável e rota de saída.

Se a lacuna puder alterar significativamente experiência, arquitetura, escopo,
comportamento, segurança, risco, custo ou operação, a implementação
correspondente não deve avançar.

---

# REVISÃO, AUDITORIA, IDENTIDADE E AUTORIDADE

## 22. Revisão e auditoria são responsabilidades distintas

### Revisão

Pergunta:

> A proposta está tecnicamente, funcionalmente ou conceitualmente boa?

### Auditoria

Pergunta:

> Existe evidência suficiente para afirmar que esta decisão está madura,
> consistente e segura para avançar?

A auditoria verifica conformidade e prontidão.

---

## 23. Auditoria antes do compromisso

Toda decisão `MATERIAL` ou `CRÍTICA` que autorize avanço relevante deve ser
precedida por auditoria de prontidão proporcional ao impacto.

A auditoria deve buscar responder:

- o que deveria estar definido?
- o que realmente está definido?
- existem contradições?
- existem lacunas?
- existem decisões implícitas?
- existem premissas não validadas?
- existem riscos não tratados?
- existem dependências desconhecidas?
- os critérios de sucesso são verificáveis?
- as evidências sustentam a decisão?
- o próximo estágio possui informação suficiente para trabalhar?
- a continuidade do próximo estágio está comprovada?

---

## 24. Separação entre autor, revisor, auditor e autoridade

Sempre que proporcional ao risco e impacto, o NAAMIVE distingue:

```text
AUTOR
    ↓
produz a proposta

REVISOR
    ↓
avalia sua qualidade dentro de uma especialidade

AUDITOR
    ↓
verifica completude, consistência, rastreabilidade e conformidade

AUTORIDADE
    ↓
decide se o avanço é autorizado
```

Independência deve ser verificada por **principal**, e não apenas por execução.

Uma mesma identidade não pode contornar independência apenas abrindo execuções
diferentes.

Quando independência for exigida:

- autor e auditor devem ser principais distintos;
- conflitos de interesse devem ser verificáveis;
- identidade deve ser canônica;
- autoridade deve ser concedida por fonte confiável;
- autorização deve possuir escopo;
- delegação deve ser rastreável;
- revogação deve produzir efeito;
- autoridade deve ser revalidada no ponto decisório.

Autovalidação não constitui auditoria independente.

---

## 25. Exceções de independência

Exceções à independência somente podem existir quando a política derivada
explicitamente permitir e quando não houver alternativa razoável.

Uma exceção deve possuir:

- autoridade distinta daquela que se beneficia da exceção;
- justificativa;
- escopo;
- prazo de validade;
- risco aceito;
- controles compensatórios;
- registro auditável;
- reavaliação quando o contexto mudar.

Exceção nunca transforma autocertificação em auditoria independente.

---

# FINDINGS, RISCO E PRONTIDÃO

## 26. Findings são governados

Todo finding material deve possuir:

- identificador;
- evidência;
- severidade;
- escopo;
- autor;
- responsável por tratamento;
- status;
- consequência para avanço.

Um finding não pode desaparecer silenciosamente.

---

## 27. Formas válidas de tratamento de finding

Um finding pode ser encerrado ou neutralizado somente por uma destas vias:

### Remediação

A causa é corrigida e nova evidência demonstra resolução.

### Invalidação fundamentada

Nova evidência demonstra que o finding era incorreto ou não aplicável.

### Reclassificação

A severidade ou impacto é alterado por decisão rastreável e independente,
fundamentada em nova evidência.

### Aceitação de risco

O finding permanece verdadeiro, mas seu risco é formalmente aceito quando a
política permitir.

### Exceção governada

O avanço excepcional é autorizado sem resolver o finding.

A exceção:

- não apaga;
- não fecha;
- não reclassifica automaticamente;
- não transforma o finding em não bloqueador.

Ela cria um registro separado de override governado.

---

## 28. Findings bloqueadores

Um finding bloqueador impede avanço **normal**.

Avanço somente pode ocorrer quando:

1. o finding for remediado;
2. for invalidado com evidência;
3. for reclassificado de forma independente; ou
4. existir exceção governada explicitamente permitida.

Uma exceção sobre blocker exige, no mínimo:

- autoridade distinta;
- justificativa;
- escopo;
- responsável;
- prazo;
- mitigação;
- controles compensatórios;
- critérios de encerramento;
- reauditoria ou revalidação posterior.

O sistema deve distinguir claramente:

```text
APROVADO NORMALMENTE
≠
APROVADO POR EXCEÇÃO
```

---

# CONTINUIDADE

## 29. Invariante de continuidade

**Nenhum recurso ativo pode existir sem continuidade comprovável, persistida e
acionável.**

Uma continuidade válida deve possuir:

- tipo de continuidade;
- recurso;
- causa;
- responsável;
- principal ou autoridade capaz de agir;
- próxima ação ou condição observável;
- pré-condição;
- condição de saída;
- fallback;
- prazo, deadline ou cadência de reavaliação quando aplicável;
- regra de escalada;
- correlação com a intenção atual.

As classes válidas de continuidade são:

- trabalho automático elegível;
- ação humana autorizada;
- espera governada;
- bloqueio governado;
- recovery governado;
- reconciliation governada.

---

## 30. Fórmula de ausência de continuidade

É inválida uma situação equivalente a:

```text
recurso ativo
+
nenhum trabalho automático elegível
+
nenhuma ação humana autorizada
+
nenhuma espera governada
+
nenhum bloqueio governado
+
nenhum recovery governado
+
nenhuma reconciliation governada
=
INCONSISTÊNCIA DE CONTINUIDADE
```

A lista conceitual e a fórmula devem permanecer logicamente equivalentes.

---

## 31. Continuidade nominal não é continuidade real

Não basta rotular um recurso como:

```text
WAITING
BLOCKED
RECOVERY_PENDING
RECONCILING
```

para satisfazer o invariante.

Se a condição não possuir responsável, saída verificável e mecanismo de
progressão, ela é um dead-end mascarado.

Espera infinita sem cadência ou escalada também é inconsistência.

---

## 32. Fail-closed não pode produzir limbo invisível

Fail-closed impede avanço inseguro.

Ele não autoriza abandono silencioso do recurso.

Quando uma ação for bloqueada por incerteza, inconsistência ou ausência de
prova, o sistema deve:

1. impedir a ação insegura;
2. registrar a causa;
3. materializar continuidade governada;
4. indicar responsável;
5. definir rota de resolução, recovery, reconciliation ou escalada.

Se não existir rota válida, o próprio fato deve ser registrado como
inconsistência terminal ou escalada conforme política.

---

# IDENTIDADE, INTENÇÃO, CONCORRÊNCIA E HANDOFF

## 33. Intenção lógica única

Toda ação com efeito material deve derivar de uma intenção lógica identificável
e persistida.

A intenção deve permitir distinguir:

```text
mesma intenção + retry técnico
```

de:

```text
nova intenção de negócio ou operação
```

Retries, reinícios, mensagens duplicadas, requests repetidas e concorrência não
devem criar múltiplos resultados autoritativos para a mesma intenção.

---

## 34. Resultado autoritativo único

Para uma mesma intenção lógica, o sistema deve possuir no máximo um resultado
autoritativo para cada efeito que a norma classificar como único.

Execuções concorrentes podem existir quando autorizadas, mas não podem produzir
autoridade concorrente sobre o mesmo efeito.

Quando houver disputa, apenas o executor que ainda possuir claim, lease, fence
ou mecanismo equivalente válido poderá publicar resultado autoritativo.

A tecnologia utilizada é derivada; a garantia é constitucional.

---

## 35. Executor obsoleto não possui autoridade

Uma execução que perdeu autorização, claim, lease, versão ou vínculo com a
intenção atual não pode avançar estado canônico.

Antes de publicar efeito autoritativo, a execução deve provar que continua
autorizada.

Se um efeito externo já tiver ocorrido antes da perda de autoridade e não puder
ser desfeito automaticamente, o caso deve entrar em reconciliation e, quando
aplicável, compensation.

---

## 36. Handoffs são compromissos governados

Toda passagem de responsabilidade entre:

- agentes;
- etapas;
- módulos;
- execuções;
- revisão;
- auditoria;
- integração;
- validação;
- entrega;

deve ser durável e rastreável.

Um handoff deve permitir responder:

- quem entregou?
- quem deve receber?
- qual intenção está sendo transferida?
- qual estado e versão estavam vigentes?
- quais evidências acompanham?
- quando o destino aceitou a responsabilidade?
- o que acontece se origem ou destino falhar durante a transferência?

A origem não deve considerar o handoff concluído apenas porque tentou enviá-lo.

A conclusão exige:

- aceite durável do destino; ou
- intenção persistida cuja entrega ao destino seja recuperável e comprovável.

---

# FALHA, RETRY, RECOVERY, RECONCILIATION E CANCELAMENTO

## 37. Falha não apaga história

Uma execução terminal permanece como fato histórico.

Ela não deve ser reescrita para aparentar que nunca falhou.

Recovery cria nova execução causalmente vinculada à anterior.

---

## 38. Recovery exige revalidação atual

Nenhum recovery pode simplesmente repetir trabalho antigo.

Antes de recuperar, o sistema deve revalidar:

- intenção ainda válida;
- estado canônico atual;
- versão normativa aplicável;
- autoridade atual;
- escopo;
- dependências;
- causa da falha;
- certeza ou incerteza sobre efeitos já produzidos;
- segurança de repetir.

Se o efeito anterior for incerto, reconciliation precede retry ou recovery.

Se o efeito anterior ocorreu e precisa ser neutralizado, compensation deve ser
considerada.

---

## 39. Inconsistências são entidades de primeira classe

Uma inconsistência não deve existir apenas como erro escondido em log.

Ela deve poder ser:

- detectada;
- persistida;
- classificada;
- atribuída;
- investigada;
- reconciliada;
- recuperada;
- escalada;
- encerrada.

Sua resolução preserva causalidade e histórico.

---

## 40. Bloqueio, pausa, cancelamento e falha são distintos

### Bloqueio

Existe intenção de continuar, porém há impedimento conhecido e rota governada de
saída.

### Pausa

A continuidade foi temporariamente suspensa por decisão governada.

### Cancelamento

A intenção de continuidade foi encerrada.

### Falha

Uma execução não conseguiu produzir o resultado esperado.

Esses conceitos não são equivalentes.

---

## 41. Cancelamento durante trabalho em voo

Cancelamento é uma decisão material.

Quando um recurso for cancelado:

- novas execuções não podem ser autorizadas;
- claims ou autorizações revogáveis devem ser invalidados;
- execuções em voo deixam de possuir autoridade para promover estado;
- resultados tardios não podem ser aceitos automaticamente;
- efeitos externos já produzidos devem ser classificados;
- efeitos incertos devem ser reconciliados;
- efeitos indesejados devem ser compensados quando possível e seguro.

Cancelar não significa apagar fatos históricos.

---

## 42. Pausa e retomada

Pausa preserva a intenção de continuidade.

Retomada não significa restaurar cegamente a situação anterior.

Antes de retomar, devem ser revalidados:

- estado atual;
- norma vigente;
- autoridade;
- dependências;
- blockers;
- findings;
- validade das evidências anteriores.

Evidências tornadas obsoletas por mudança de contexto devem ser produzidas ou
revisadas novamente.

---

# GOVERNANÇA HUMANA E AGENTES

## 43. Governança humana proporcional

O NAAMIVE busca alta autonomia operacional sem eliminar autoridade humana.

Humanos devem decidir quando houver, conforme política:

- compromisso de negócio;
- investimento material;
- mudança material;
- aceitação de resultado;
- risco material;
- exceção;
- pausa;
- cancelamento;
- ratificação normativa;
- outras decisões explicitamente humanas.

Humanos não devem ser transformados em aprovadores mecânicos de cada atividade
técnica.

**Automação deve eliminar decisões repetitivas, não decisões responsáveis.**

---

## 44. Autoridade dos agentes

Agentes podem, quando autorizados:

- analisar;
- questionar;
- propor;
- comparar;
- planejar;
- produzir;
- implementar;
- testar;
- revisar;
- auditar;
- gerar evidência;
- recomendar decisões;
- solicitar transições.

Eles não podem:

- ampliar o próprio escopo;
- declarar autoridade para si mesmos;
- aprovar gate humano em nome de pessoa;
- ignorar política;
- fabricar evidência;
- ocultar incerteza relevante;
- criar transição inexistente;
- contornar independência por nova execução;
- promover estado com autorização obsoleta.

---

# EVIDÊNCIA E RASTREABILIDADE

## 45. Rastreabilidade ponta a ponta

Toda decisão relevante deve ser explicável posteriormente.

O sistema deve ser capaz de responder:

- o que aconteceu?
- por que aconteceu?
- qual necessidade originou?
- qual intenção estava ativa?
- qual versão normativa governou?
- quem ou o que iniciou?
- qual principal executou?
- qual autoridade possuía?
- qual trabalho foi realizado?
- qual evidência foi produzida?
- quem revisou?
- quem auditou?
- quais findings existiram?
- houve exceção?
- qual decisão foi tomada?
- qual estado mudou?
- qual entrega ou evolução resultou?

A rastreabilidade deve atravessar toda a cadeia:

```text
Necessidade
→ Projeto
→ Módulo / Escopo de Projeto
→ Item de Trabalho
→ Intenção
→ Execução
→ Evidência
→ Revisão
→ Auditoria
→ Finding / Exceção
→ Decisão
→ Entrega
→ Evolução
```

---

# PROJETO, MÓDULO E AGREGAÇÃO

## 46. Relação Projeto–Módulo

Um Módulo pertence ao contexto de um Projeto.

Projeto e Módulo possuem responsabilidades e lifecycles próprios.

A progressão do Projeto deve ser derivada de regras explícitas de agregação das
condições de seus Módulos, Itens de Trabalho, dependências e entregas aplicáveis.

Não pode existir inferência informal como:

```text
"parece que terminou, então avança"
```

Estados e fórmulas detalhadas pertencem ao lifecycle derivado, mas a existência
de regra explícita de agregação é obrigatória.

---

## 47. Resultado parcial e dependências

A conclusão de um Módulo não implica automaticamente conclusão do Projeto.

A conclusão de um predecessor também não implica automaticamente que qualquer
dependente esteja apto a avançar.

O lifecycle derivado deve definir:

- condições de satisfação;
- agregação;
- quorum quando aplicável;
- comportamento diante de cancelamento parcial;
- dependência impossível;
- módulo opcional;
- módulo substituído;
- resultado parcialmente aceito.

Essas regras devem ser determinísticas e auditáveis.

---

# VALIDADE DE ESCOPO, BASELINE E DESCENDENTES

## 48. Cobertura e invalidação por mudança governante

Toda evidência, review, auditoria, autorização, finding, handoff e resultado
material deve declarar o escopo e o baseline, versão, geração ou contexto
governante ao qual se aplica.

Nenhuma aprovação permanece válida por simples existência histórica quando o
objeto que ela cobria mudou materialmente.

Quando ocorrer qualquer uma destas condições:

- mudança material de escopo;
- mudança de baseline;
- mudança arquitetural ou de planejamento que afete trabalho já derivado;
- retorno de lifecycle para estágio anterior;
- supersessão de decisão;
- cancelamento de recurso pai;
- retomada após mudança relevante de contexto;

o sistema deve identificar todos os descendentes, evidências, reviews,
auditorias, autorizações e handoffs potencialmente afetados e classificá-los
explicitamente em uma das seguintes condições:

### KEEP

Permanece válido porque a mudança não altera seu escopo, premissas, baseline,
autoridade nem critérios.

A decisão de manter validade deve ser demonstrável.

### REVALIDATE

Pode continuar somente após nova verificação de que permanece aplicável ao
contexto atual.

Enquanto a revalidação não ocorrer, não pode autorizar novo avanço.

### SUPERSEDE

Foi substituído por novo recurso, baseline, decisão, evidência ou versão.

O anterior permanece histórico, mas deixa de governar avanço futuro.

### REVOKE

Perdeu validade ou autoridade e não pode mais produzir efeito autoritativo.

Execuções em voo afetadas devem perder capacidade de promover estado.

### RECONCILE

Existe incerteza sobre o que já ocorreu ou sobre efeitos produzidos antes da
mudança. O avanço permanece bloqueado até reconciliação suficiente.

A classificação deve ser causal, persistida e rastreável.

Até que a cobertura da mudança seja determinada, descendentes potencialmente
afetados operam em fail-closed: não são considerados elegíveis para novo avanço
e não podem publicar resultado autoritativo baseado no contexto anterior.

Cancelamento de um recurso pai exige, no mínimo, revogação ou tratamento
explícito de toda autoridade descendente ainda capaz de produzir efeito.

Mudança de baseline não reabre silenciosamente recursos terminais. Quando novo
trabalho for necessário, ele deve ocorrer por nova intenção, sucessão, rework ou
outro mecanismo governado que preserve o fato histórico anterior.

---

# ENTREGA E EVOLUÇÃO

## 49. Entrega é marco governado

Entrega não é sinônimo de "código terminou".

Uma Entrega deve vincular, conforme aplicável:

- necessidade atendida;
- escopo entregue;
- baseline ou versão;
- evidências de validação;
- riscos residuais;
- autoridade de aceite;
- decisão de aceite;
- contexto operacional.

A existência de Entrega não elimina histórico nem encerra a possibilidade de
evolução.

---

## 50. Evolução nasce de necessidade governada

Toda evolução de produto entregue deve nascer de:

- nova Necessidade de Negócio; ou
- alteração governada de Necessidade existente quando a política permitir.

A evolução deve permanecer vinculada:

```text
Entrega / baseline anterior
        ↓
Necessidade governada
        ↓
avaliação de impacto
        ↓
ponto autorizado de reentrada no lifecycle
```

Não é permitido entrar diretamente em implementação apenas porque o produto já
existe.

Mudanças relevantes devem revalidar problema, valor, impacto, dependências,
riscos e evidências que possam ter se tornado obsoletas.

---

# PROJEÇÕES, UI E OBSERVABILIDADE

## 51. Observabilidade não substitui governança

Logs, métricas, traces, dashboards e alertas são instrumentos de observação.

Eles não constituem, isoladamente, estado normativo.

A plataforma deve permitir observar:

- estado;
- progresso;
- esperas;
- falhas;
- bloqueios;
- inconsistências;
- findings;
- exceções;
- ações disponíveis;
- decisões pendentes;
- continuidade atual.

---

## 52. Interface como projeção

A interface do NAAMIVE apresenta realidade governada.

Ela não inventa estado, ação, autoridade ou transição.

```text
norma + fatos + estado canônico
        ↓
projeção
        ↓
UI
        ↓
ação do principal autorizado
```

---

## 53. Completude e correção da projeção

Não basta a projeção evitar ações inexistentes.

Ela também deve representar corretamente as ações e condições necessárias para
continuidade.

Quando aplicável, uma projeção de ação, espera, blocker ou decisão deve carregar
correlação suficiente para identificar:

- recurso;
- intenção;
- estado atual;
- versão normativa;
- autoridade necessária;
- geração ou versão atual;
- responsável;
- condição de saída.

Uma ação canônica necessária que exista no backend mas permaneça invisível ou
inacessível ao responsável representa falha de continuidade.

Ausência, duplicidade ou contradição de projeção necessária deve ser detectável
como inconsistência.

---

## 54. UI também passa por discovery

A interface é parte do produto.

Criação ou mudança `MATERIAL`/`CRÍTICA` de UI deve passar por:

- entendimento do usuário;
- jornadas;
- arquitetura de informação;
- navegação;
- responsabilidades de telas;
- alternativas;
- critérios;
- revisão especializada;
- auditoria de prontidão.

A instrução genérica:

```text
"crie a interface"
```

não constitui especificação suficiente para implementação material.

---

# HISTÓRICO DO REBOOT

## 55. Compatibilidade e histórico

A nova arquitetura não possui obrigação de reproduzir contratos internos da
implementação anterior.

O conteúdo preservado em:

```text
naamive/backup/
```

constitui patrimônio histórico.

Ele pode ser usado para:

- recuperar conhecimento;
- identificar boas decisões;
- identificar erros;
- comparar soluções;
- extrair requisitos;
- evitar regressões conceituais.

Ele não possui autoridade normativa sobre a nova versão.

Nenhuma regra será mantida apenas porque existia anteriormente.

---

# CRITÉRIO DE SUCESSO E DERIVAÇÃO

## 56. Critério constitucional de sucesso

Uma implementação do NAAMIVE somente é coerente com sua missão quando consegue
transformar necessidade em entrega preservando:

- valor de negócio;
- qualidade;
- rastreabilidade;
- governança;
- maturidade das decisões;
- integridade normativa;
- continuidade;
- independência;
- segurança operacional;
- recuperabilidade;
- auditabilidade;
- capacidade de evolução.

Quantidade de agentes, linhas de código, automações, workflows ou tecnologias
não constitui medida de sucesso.

---

## 57. Regra de derivação

A Constituição não define o lifecycle detalhado.

Ela define as leis que esse lifecycle deverá respeitar.

O próximo nível normativo deverá responder, de ponta a ponta:

- quais entidades possuem lifecycle;
- quais estados possuem;
- como começam;
- como avançam;
- como são classificadas mudanças;
- onde existe descoberta;
- onde existe brainstorm;
- onde existe revisão;
- onde existe auditoria;
- onde existe decisão;
- como findings são tratados;
- como independência é aplicada;
- como entidades se relacionam;
- como dependências são satisfeitas;
- como Projeto agrega Módulos;
- como continuidade é representada;
- quando esperam;
- quando bloqueiam;
- quando voltam;
- quando param;
- como falham;
- como fazem retry;
- como recuperam;
- como reconciliam;
- como compensam;
- como cancelam trabalho em voo;
- como terminam;
- como entregam;
- como evoluem.

O lifecycle derivado não pode inventar novas leis fundamentais para preencher
lacunas desta Constituição.

Se durante sua elaboração surgir necessidade de uma nova lei fundamental, a
Constituição deve ser emendada antes de a regra ser incorporada ao lifecycle.

---

## 58. Ordem de derivação

Somente após esta Constituição ser ratificada devem ser derivados, nesta ordem
conceitual:

```text
Constituição
    ↓
Lifecycle Model
    ↓
Políticas e contratos
    ↓
Modelo de persistência e projeção
    ↓
Orquestração e agentes
    ↓
APIs e UI
    ↓
Implementação
```

Detalhes podem ser refinados iterativamente, mas nenhuma implementação deve
antecipar uma decisão material que ainda pertença a nível normativo ou de
concepção não resolvido.

---

## 59. Princípio final

O NAAMIVE não deve avançar porque algum componente acredita que pode avançar.

Ele deve avançar porque existem:

- necessidade rastreável;
- entendimento suficiente;
- classificação adequada de impacto;
- decisão suficientemente madura;
- estado válido;
- versão normativa conhecida;
- evidência suficiente;
- revisão adequada;
- auditoria satisfatória;
- independência verificável;
- autoridade correta;
- findings tratados;
- intenção válida;
- escopo e baseline atuais;
- validade dos descendentes afetados comprovada;
- continuidade comprovável e acionável.

**Pensar antes de construir não é atraso.  
É parte da construção.**
