# M-002 — Formação do Projeto

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `0061143a-4df3-408d-9640-610a19576d00` |
| Código | `M-002` |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) |
| Status | `FORMADO` |

## Delimitação inicial

* **Item canônico:** [M-002 no Mapa de Módulos do Projeto](../../projetos/P-001/mapa-de-modulos.md#m-002--formação-do-projeto).
* **Capacidade:** constituir o Projeto vinculado à Necessidade comprometida e produzir sua Direção aprovada.
* **Responsabilidade:** preservar o vínculo 1:1, conduzir a formação e disponibilizar a Direção após auditoria independente.
* **Dentro da fronteira:** vínculo com a Necessidade, formação, auditoria da formação e Direção do Projeto.
* **Fora da fronteira:** qualificação da Necessidade, delimitação ou formação de Módulos, coordenação da execução e verificação de resultado.
* **Relações relevantes:** recebe o compromisso de M-001 e disponibiliza a Direção para M-003, M-004 e M-005; M-004 preserva suas evidências.

## Formação técnica

### Compreensão e refinamento da fronteira

**Conhecido.** M-002 transforma o Compromisso aprovado de uma Necessidade na capacidade de formar um único Projeto a ela vinculado e disponibilizar a Direção do Projeto somente após auditoria independente suficiente. O bootstrap é responsabilidade inicial do Especialista em Formação do Projeto; não há Ator separado para criar ou materializar Projeto.

**Conhecido.** A instância P-001 demonstra o resultado histórico esperado: a decisão `APROVADO` da N-001 precedeu a materialização de um único Projeto em `EM_FORMACAO`; a confirmação permitiu que a N-001 assumisse `EM_PROJETO`; a auditoria posterior produziu `FORMACAO_SUFICIENTE`, levando P-001 a `FORMADO` e liberando sua Direção.

**Inferido.** Para realizar essa capacidade sem depender de reconstrução manual, a solução precisa tratar o Compromisso, a solicitação de bootstrap, a referência estável da Necessidade, o Projeto atual, seu histórico e a confirmação para M-001 como elementos logicamente distintos e correlacionáveis.

**Proposto.** M-002 será a autoridade das regras de domínio de bootstrap, formação e efeitos normativos do Projeto. M-004 fornecerá a capacidade transversal de preservação, recuperação e correlação de contexto; M-002 define a semântica do que deve ser registrado, sem escolher seu armazenamento ou mecanismo de consulta.

**Verificação de fronteira.** Não há evidência de sobreposição que exija redelimitar M-002. A formação de Necessidade e a decisão `APROVADO` permanecem em M-001 e no Owner; M-002 não coordena a realização posterior (M-003), não mantém infraestrutura transversal de contexto (M-004), não verifica o resultado de software (M-005) e não delimita nem forma Módulos.

### Descoberta técnica

| Evidência | Classificação | Impacto no desenho |
| --- | --- | --- |
| [N-001](../../necessidades/N-001/necessidade.md) e seu Compromisso | Conhecido | Comprovam `APROVADO` pelo Owner `mhj`, o vínculo exclusivo com P-001 e a transição para `EM_PROJETO` após a materialização. A Necessidade permanece fonte de verdade do compromisso. |
| [P-001](../../projetos/P-001/projeto.md) | Conhecido | Comprova identificador técnico `5575efa1-c68e-464f-8393-07be8c9bc93a`, código `P-001`, nome inicial editável, vínculo 1:1 com N-001, bootstrap concluído, auditoria suficiente, `FORMADO` e Direção disponível. |
| Documentação normativa da vertical Projeto | Conhecido | Define modelo mínimo, Atores separados, formação, status, Resultados do Processo, 1:1, cancelamento e efeitos normativos. |
| [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto) e [item M-002 no Mapa](../../projetos/P-001/mapa-de-modulos.md#m-002--formação-do-projeto) | Conhecido | Sustentam a passagem coesa entre Compromisso e Direção, as fronteiras e as relações com os Módulos posteriores. |
| [Especificação aprovada de M-001](../M-001/modulo.md#especificação-técnica-do-módulo) | Conhecido | Define o handoff: Compromisso disponível, solicitação lógica idempotente ligada à referência estável da Necessidade, e `EM_PROJETO` condicionado à confirmação de M-002. |
| Inventário versionado do repositório | Conhecido | Contém somente documentação, Skills e registros Markdown; não há código executável, API, banco de dados, autenticação, autorização, integração, orquestrador ou mecanismo físico de unicidade reutilizável. |

### Especificação Técnica do Módulo

Esta especificação foi aprovada pela Auditoria do Módulo. A aprovação produz o Resultado do Processo desta vertical e altera o status de M-002 para `FORMADO`, sem definir continuação operacional.

#### Origem e capacidade

| Elemento | Referência | Classificação |
| --- | --- | --- |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) | Conhecido |
| Direção consumida | [Direção do Projeto](../../projetos/P-001/projeto.md#direção-do-projeto), aprovada por `FORMACAO_SUFICIENTE` | Conhecido |
| Justificativa de delimitação | [M-002 no Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-002--formação-do-projeto) | Conhecido |
| Entrada da capacidade | [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) | Conhecido |

M-002 deve receber um Compromisso validamente aprovado e garantir o efeito lógico `1 Necessidade aprovada → exatamente 1 Projeto`. Em seguida, deve suportar a formação do Projeto pelos Atores competentes, a auditoria independente de sua formação e a disponibilização da Direção aprovada. O resultado disponibilizado às capacidades posteriores é a Direção rastreável de um Projeto `FORMADO`, não a execução, a coordenação ou a verificação do resultado de software.

#### Fronteiras e relações

Está dentro de M-002:

* validar a elegibilidade do Compromisso e reconhecer a solicitação inicial ou a repetição legítima de bootstrap;
* localizar o Projeto correspondente ou materializar somente um Projeto em `EM_FORMACAO`, preservando vínculo, identidade técnica, código e nome;
* conduzir e registrar as etapas `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO` sem confundi-las com status;
* receber e aplicar os efeitos de Resultados produzidos pelo Auditor do Projeto, mantendo a separação de papéis;
* tornar a Direção disponível somente após `FORMACAO_SUFICIENTE`, e registrar o handoff para delimitação de Módulos; e
* preservar semanticamente evidências, classificações, histórico, decisões, Resultados do Processo e vínculos necessários à explicação do percurso.

Está fora de M-002:

* formar, auditar ou qualificar a Necessidade, consolidar seu Compromisso ou produzir a decisão humana `APROVADO` — responsabilidades de M-001, dos Atores da Necessidade e do Owner;
* delimitar Módulos, formar Módulos ou auditar Módulos — responsabilidades da vertical Módulo;
* decompor, selecionar executor, coordenar ou acompanhar trabalho posterior — fronteira de M-003;
* prover armazenamento compartilhado, busca transversal, correlação física ou retenção de contexto — fronteira de M-004;
* implementar software, verificar seu resultado ou produzir `COMPROMISSO_ATENDIDO`/`COMPROMISSO_NAO_ATENDIDO` — fronteira operacional futura e M-005 na primeira jornada; e
* definir Entrega de Valor, Item de Trabalho, tarefa, tecnologia, API, banco ou orquestração física.

M-001 disponibiliza o Compromisso e recebe de volta somente confirmação idempotente de que o Projeto 1:1 existe; não cria o Projeto por M-002. M-003, M-004 e M-005 podem consumir a Direção como referência de origem, mas não a modificam. M-004 preserva e recupera o contexto que M-002 determina semanticamente. A relação com a vertical Módulo termina no handoff da Direção aprovada ao Especialista em Delimitação de Módulos; M-002 não executa essa delimitação.

#### Modelo lógico e regras de integridade

**Proposto.** A realização deve manter uma visão atual de Projeto ligada a uma referência estável de Necessidade e registros correlacionáveis, mas distintos, de Compromisso recebido, solicitação de bootstrap, histórico, evidências, etapas de formação, classificações, Resultados do Processo, decisões humanas e Direção. O formato das referências e sua persistência física permanecem desconhecidos.

| Conceito lógico | Finalidade em M-002 | Não se confunde com |
| --- | --- | --- |
| Projeto atual | Instância identificável com identidade técnica, código, nome, Necessidade de origem e um status do catálogo de Projeto. | Compromisso, Direção, etapa, Resultado ou decisão. |
| Solicitação de bootstrap | Pedido lógico associado à referência estável da Necessidade aprovada, recuperável até confirmação. | criação adicional de Projeto ou novo status. |
| Confirmação de materialização | Evidência de que o único Projeto correspondente existe e pode ser referenciado por M-001. | simples tentativa, etapa de formação ou transição antecipada da Necessidade. |
| Etapa de formação | Registro de `ENQUADRAMENTO`, `DESCOBERTA` ou `DIREÇÃO DA SOLUÇÃO` e suas evidências. | status do Projeto. |
| Resultado do Processo | Conclusão formal produzida pelo Auditor, Verificador Agregado ou Owner conforme o catálogo. | status, Direção ou decisão de agente. |
| Direção do Projeto | Representação consolidada, aprovada e disponível após `FORMACAO_SUFICIENTE`. | entidade, status ou Resultado do Processo. |

As regras lógicas obrigatórias são:

1. somente uma Necessidade com Compromisso que registre `APROVADO` pode iniciar bootstrap;
2. uma solicitação inicial e suas repetições devem ser correlacionadas à mesma referência estável da Necessidade; se já houver Projeto correspondente, a repetição deve devolver sua confirmação sem criar outro;
3. não havendo Projeto, a materialização deve produzir exatamente uma instância com identificador técnico único, código estável, nome inicial proposto ou gerado, vínculo exclusivo com a Necessidade e status inicial `EM_FORMACAO`;
4. falha antes da confirmação não autoriza M-001 a registrar `EM_PROJETO`; a obrigação de bootstrap e sua evidência permanecem recuperáveis para nova tentativa legítima;
5. a garantia lógica de unicidade deve continuar válida para solicitações concorrentes, repetidas ou recuperadas após falha, embora o mecanismo físico de exclusão mútua, transação ou restrição ainda seja desconhecido;
6. `FORMACAO_INSUFICIENTE` mantém o Projeto em `EM_FORMACAO`; somente `FORMACAO_SUFICIENTE` produzido pelo Auditor do Projeto o leva a `FORMADO` e libera a Direção; e
7. alteração do nome não modifica identidade técnica, código ou Necessidade de origem; o mecanismo normativo permanente de geração de códigos continua uma lacuna, e o exemplo histórico `P-001` não é algoritmo universal.

#### Fluxos e contratos lógicos

| Operação lógica | Pré-condição e efeito | Responsável pela regra |
| --- | --- | --- |
| Receber Compromisso e solicitação | Exige referência da Necessidade e evidência de `APROVADO`; registra a solicitação correlacionável sem redefinir o Compromisso. | M-002; conteúdo da Necessidade permanece em M-001. |
| Consultar ou materializar Projeto 1:1 | Procura por Necessidade de origem; se encontrar um Projeto, confirma-o; se não encontrar, cria a única instância elegível em `EM_FORMACAO` e devolve confirmação somente após êxito. | M-002, sob atuação do Especialista em Formação do Projeto. |
| Tratar repetição, falha e recuperação | Repetição legítima retorna a mesma instância; falha pré-confirmação não muda a Necessidade; recuperação retoma a mesma obrigação sem duplicar Projeto. | M-002. |
| Conduzir formação | Preserva enquadramento, descoberta, direção, evidências, lacunas e classificações; entrega material ao Auditor sem produzir o parecer. | M-002 sob atuação do Especialista em Formação do Projeto. |
| Registrar auditoria | Aceita apenas `FORMACAO_SUFICIENTE` ou `FORMACAO_INSUFICIENTE` do Auditor do Projeto, preservando Ator, evidências e efeito normativo. | M-002 suporta o fluxo; Auditor do Projeto produz o Resultado. |
| Disponibilizar Direção | Após resultado suficiente, consolida a Direção aprovada, mantém Projeto em `FORMADO` e entrega referência ao Especialista em Delimitação de Módulos. | M-002; delimitação pertence à vertical Módulo. |
| Registrar cancelamento | Exige `CANCELAMENTO_APROVADO` do Owner autenticado em posição não terminal; leva Projeto a `CANCELADO` e aplica o efeito normativo de N-001 para `CANCELADA`. | Owner produz a decisão; M-002 preserva e aplica o efeito. |

**Proposto.** O contrato entre M-001 e M-002 contém, no mínimo, a referência estável da Necessidade, a referência ao Compromisso aprovado e uma chave lógica de idempotência vinculada àquela Necessidade. A resposta de confirmação contém a referência estável do único Projeto e evidência de materialização bem-sucedida. Formato de mensagem, sincronismo, transporte, tentativas físicas e garantias de entrega são desconhecidos.

#### Estado, segurança e confiabilidade

**Conhecido.** P-001 evidencia que identidade técnica, código, nome, Necessidade de origem, status, etapas de formação, Resultado de auditoria e Direção aprovada são informações materialmente relevantes. O histórico deve ainda preservar solicitação, confirmação, evidências, classificações, handoffs e decisões que expliquem os efeitos no Projeto e na Necessidade.

**Conhecido como requisito; mecanismo desconhecido.** O Owner é o usuário autenticado e é o único Ator que pode produzir `CANCELAMENTO_APROVADO`. A solução futura deve rejeitar cancelamento sem identidade autenticada identificável ou em status terminal; não há modelo de RBAC, ACL, delegação, grupos, propriedade por entidade ou escolha técnica de autenticação.

**Proposto.** Cada alteração material deve preservar Ator, momento, contexto, efeito, classificação e referência de evidência suficientes para auditoria e recuperação. M-004 receberá essa semântica, sem que M-002 imponha banco, formato de log ou correlação física global.

**Desconhecido legítimo.** Não há evidência de requisitos de volume, latência, disponibilidade, escala, retenção, criptografia, cópia de segurança, telemetria, alertas, mecanismo de retry ou infraestrutura. A realização deverá escolher meios proporcionais que garantam unicidade lógica, recuperação de falhas e auditabilidade, sem tornar tais meios fatos desta especificação.

#### Decisões técnicas registradas

| Decisão | Motivação | Sustentação |
| --- | --- | --- |
| Separar logicamente Projeto atual, solicitação de bootstrap, histórico, evidências, etapas, Resultados, decisões e Direção. | Evitar confundir posição, processo, autoridade e artefato de saída. | Modelo, ciclo, status e Resultados do Processo do Projeto; Direção do P-001. |
| Tratar a repetição da solicitação como recuperação da mesma obrigação, e não como nova criação. | Preservar `1 Necessidade aprovada → 1 Projeto`, inclusive diante de retry e falha. | Definição, ciclo e formação do Projeto; contrato de handoff de M-001. |
| Condicionar a confirmação a um Projeto materializado e referenciável. | Impedir que N-001 assuma `EM_PROJETO` sem o único Projeto existir. | Ciclo de Vida do Projeto e evidência do bootstrap de P-001. |
| Manter código como atributo estável, sem definir seu algoritmo permanente. | P-001 prova uma convenção histórica, mas as fontes normativas ainda não definem geração universal. | Modelo e bootstrap de P-001. |
| Separar formação e auditoria do Projeto por Ator. | Impedir que o formador aprove o próprio trabalho e preservar o efeito normativo da auditoria. | Atores, Formação e Resultados do Processo do Projeto. |
| Não escolher tecnologia física para unicidade, persistência, autenticação ou comunicação. | Não há evidência técnica no repositório e o desenho lógico já torna a capacidade realizável e auditável. | Inventário real e regra contra invenção. |

#### Riscos, lacunas e decisões pendentes

| Item | Classificação | Impacto e tratamento |
| --- | --- | --- |
| Geração permanente de códigos de Projeto | Lacuna conhecida | Não bloqueia P-001 nem o desenho lógico; deve receber regra normativa e mecanismo sustentado antes de novos bootstraps reais. Não usar `P-001` como algoritmo. |
| Persistência, unicidade física, transação, concorrência, retry e entrega de confirmação | Desconhecido legítimo | A realização deve preservar o invariante 1:1 e a recuperação; a escolha física permanece futura. |
| Autenticação e autorização concretas | Desconhecido legítimo | Não bloqueia a capacidade principal; a decisão humana de cancelamento exige identidade autenticada identificável. |
| Cancelamento da Necessidade em `EM_PROJETO` | Lacuna de processo conhecida | As fontes definem que cancelamento de Projeto propaga N-001 para `CANCELADA`, mas não definem o efeito inverso de uma Necessidade cancelada sobre Projeto ativo. Não inventar sincronização automática; não bloqueia bootstrap, formação ou auditoria de M-002. |
| `CONCLUIDO`, verificação agregada e `COMPROMISSO_ATENDIDO` | Fora da fronteira, com trecho operacional desconhecido | M-002 preserva os Resultados quando a camada futura os definir, mas não determina sua ocasião, efeitos operacionais ou realização. |
| Fronteira de M-002 | Conhecido | A descoberta não revelou problema estrutural; não há retorno ao Especialista em Delimitação de Módulos. |

#### Suficiência e handoff

A realização posterior pode decompor o suporte a bootstrap, formação, auditoria e disponibilização da Direção sem redesenhar a capacidade nem suas fronteiras: os contratos, invariantes, dados semânticos, efeitos de status, dependências e lacunas estão explícitos. Não foram definidos Entregas de Valor, Itens de Trabalho, tarefas, implementação ou continuação operacional posterior.

## Resultado do Processo — Auditoria independente do Módulo

`FORMACAO_SUFICIENTE`

### Parecer independente

A formação técnica é suficiente para orientar realização posterior sem redesenhar a capacidade ou a fronteira de M-002. A origem está rastreável ao P-001, à sua Direção aprovada, ao item canônico do Mapa e ao Compromisso aprovado da N-001. A capacidade permanece a passagem coesa entre esse Compromisso e uma Direção de Projeto aprovada.

O núcleo invariável está presente: responsabilidade e fronteiras, evidências classificadas, relações com M-001 a M-005, contratos lógicos, estado e dados semanticamente separados, decisões sustentadas, riscos e desconhecidos legítimos. A Especificação não absorve a formação ou decisão de compromisso da Necessidade, a delimitação ou formação de Módulos, a coordenação posterior, a infraestrutura transversal de M-004, a verificação do resultado nem a conclusão operacional do Projeto.

O contrato de bootstrap explicita que solicitações iniciais, repetidas, concorrentes ou recuperadas se relacionam à mesma Necessidade aprovada; Projeto já existente é confirmado, ausência produz apenas uma instância em `EM_FORMACAO`, e falha anterior à confirmação não leva a N-001 para `EM_PROJETO`. Assim, a realização futura deve garantir o efeito lógico `1 Necessidade aprovada → exatamente 1 Projeto`, sem que a Especificação invente lock, índice, transação, banco, fila ou outro mecanismo físico.

A confirmação de materialização pertence a M-002 e é a única informação devolvida a M-001 para permitir `EM_PROJETO`; M-001 não cria nem forma Projeto. Identidade técnica única, código estável, nome inicial editável e vínculo exclusivo estão diferenciados. A ausência de regra permanente de geração de códigos é corretamente registrada como lacuna não bloqueante, sem converter P-001 em algoritmo universal.

Status, etapas e Resultados do Processo permanecem distintos. A Direção somente se torna aprovada e disponível após `FORMACAO_SUFICIENTE` do Auditor do Projeto, sem tornar-se entidade, status ou Resultado. Formação e Auditoria do Projeto preservam Atores distintos. O cancelamento continua condicionado a `CANCELAMENTO_APROVADO` do Owner e não inventa propagação automática de cancelamento da Necessidade para Projeto ativo. `CONCLUIDO`, verificação agregada e seus Resultados permanecem fora da fronteira desta capacidade.

Não foram encontrados problemas de formação nem problemas de delimitação. A Especificação Técnica está aprovada e disponível para consumo posterior; M-002 transiciona de `EM_FORMACAO` para `FORMADO`. A continuação operacional não é definida por esta auditoria.
