# Formação da Entrega de Valor

## Finalidade e limites

Este documento define como uma Entrega de Valor já delimitada é aprofundada pelo **Especialista em Formação da Entrega de Valor** até possuir informação suficiente para a futura decomposição e execução técnica, sem redescoberta sistemática do negócio nem redesenho da solução técnica de alto nível.

A formação prepara conjuntamente o lado de produto e o lado técnico da evolução. Ela não decide se a Entrega de Valor deveria existir, não a materializa, não implementa software, não decompõe trabalho executável, não audita a própria produção e não verifica o software integrado.

As etapas descritas aqui são partes da Formação. Não são Ciclo de Vida, eventos, transições, Status, Resultados do Processo nem estados persistidos obrigatórios.

## Entrada conceitual

A Formação atua sobre uma Entrega de Valor já delimitada e materializada. Sua entrada conceitual reúne, proporcionalmente:

* a Entrega de Valor delimitada, sua identidade, intenção, beneficiário, resultado observável e fronteira inicial;
* o Módulo proprietário e sua Especificação Técnica aprovada;
* a Direção do Projeto e o Compromisso da Necessidade, recuperáveis pela cadeia de origem;
* decisões técnicas herdadas e restrições de alcance superior;
* o [Catálogo de Baselines Técnicas](referencias/CATALOGO_DE_BASELINES_TECNICAS.md);
* Jornada e Fluxo relacionados, quando conhecidos;
* evidências técnicas disponíveis; e
* código, repositórios e arquitetura existentes, quando a solução já tiver sido iniciada.

Não há evento formal de entrada definido neste documento. As fontes de origem continuam sendo consumidas por referência: a Formação não reescreve o Compromisso, a Direção ou a Especificação Técnica do Módulo como fontes concorrentes.

## Responsabilidade e princípio central

O responsável é o **Especialista em Formação da Entrega de Valor**, Ator agêntico definido em [Atores da Entrega de Valor](03_ATORES_DA_ENTREGA_DE_VALOR.md). Ator, Executor e Skill permanecem conceitos distintos. O Owner é o Ator humano transversal; o Formador não executa Work Item, não audita sua própria Formação e não verifica software integrado.

O princípio central é:

> A execução futura deve receber trabalho tecnicamente preparado, não um problema de arquitetura disfarçado de Work Item.

Assim, a futura execução deve conseguir construir a evolução sem ter de redescobrir o valor de negócio, redefinir o comportamento principal, escolher novamente a arquitetura de alto nível, inventar contratos centrais, escolher stack estrutural já necessária, decidir fronteiras técnicas relevantes ou resolver sem tratamento decisões materiais deixadas em aberto.

### Proporcionalidade, evidência e autonomia

A Formação produz somente a profundidade que a evolução concreta exige. Não cria tecnologia, contratos, modelo de dados, integração ou diagrama por ritual. A ausência de informação não pode ser substituída por invenção.

Quando útil, a informação material é classificada como:

* **conhecida**, quando sustentada por fonte ou evidência identificável;
* **inferida**, quando decorre de evidência com a inferência explicitada;
* **proposta**, quando representa direção ainda sujeita a refinamento; ou
* **desconhecida**, quando não há base suficiente para concluir.

Essa classificação descreve a qualidade da informação; não é Status.

### Formação não é questionário

O Formador não inicia submetendo o Owner a questionário técnico extenso. O Owner não precisa arquitetar a aplicação. O comportamento normal é:

```text
recuperar contexto
→ investigar
→ propor
→ explicar
→ estimar
→ colher reação
→ refinar
```

Perguntas ao Owner são admitidas somente quando a informação material não puder ser recuperada, não puder ser inferida com segurança, não possuir padrão responsável ou depender legitimamente de decisão humana. Mesmo então, pergunta-se somente o necessário.

## Etapas conceituais da Formação

O trabalho é organizado nas seguintes etapas conceituais:

```text
enquadramento da Entrega de Valor
→ descoberta
→ proposta técnica inicial
→ refinamento com o Owner
→ fechamento das decisões materiais
→ detalhamento da solução
→ consolidação da Especificação da Entrega de Valor
→ handoff para Auditoria
```

Elas podem demandar retorno a uma etapa anterior quando nova evidência, reação material ou lacuna o justificar. Essa organização não estabelece persistência, evento ou transição.

## Enquadramento da Entrega de Valor

O Formador recupera e compreende:

* identidade da Entrega de Valor, Módulo proprietário, capacidade do Módulo e fronteira inicial;
* intenção de valor, beneficiário e resultado observável esperado;
* Jornadas e Fluxos relacionados, quando conhecidos;
* dependências, Direção do Projeto, Compromisso da Necessidade e decisões técnicas herdadas; e
* restrições superiores já conhecidas.

O enquadramento confirma que a evolução é compatível com a capacidade do Módulo. Ele não substitui a delimitação, não cria nova Necessidade nem novo Projeto e não altera silenciosamente as fontes superiores.

### Problema estrutural de delimitação

Se a investigação revelar múltiplas intenções independentes, amplitude excessiva, fragmentação por camada técnica, ausência de valor perceptível, Módulo proprietário incorreto, evolução fora da capacidade do Módulo, fronteira estrutural inadequada ou sobreposição material entre Entregas de Valor, o Formador registra a evidência e devolve a questão conceitualmente ao **Especialista em Delimitação de Entregas de Valor**.

O Formador não absorve esse problema como refinamento técnico. Este documento não define efeitos sobre identidade, dados, posição no ciclo ou mecanismo de retorno.

## Descoberta

A Descoberta investiga proporcionalmente o necessário para preparar produto e solução. Pode consultar código e repositórios existentes, documentação, contratos, dados, APIs, integrações, infraestrutura, decisões arquiteturais anteriores, restrições técnicas, evidências, ferramentas disponíveis e dependências externas.

O Formador investiga autonomamente sempre que houver evidência disponível. Lacuna material recebe tratamento explícito: investigação adicional, proposta identificada como tal, encaminhamento ao nível competente ou pergunta pontual ao Owner quando houver decisão humana legítima. Uma lacuna não é convertida em fato pela repetição nem escondida por marcador genérico.

## Formação do lado de produto

A Formação aprofunda, no limite necessário à evolução:

* declaração de valor e beneficiário;
* comportamento esperado e resultado observável;
* fronteira, regras de negócio e condições de sucesso;
* Jornadas e Fluxos relevantes;
* restrições de negócio e dependências funcionais; e
* critérios verificáveis ligados à promessa feita ao beneficiário.

O lado de produto orienta a solução. Ele não transforma a Formação em nova definição da Necessidade ou do Projeto, nem duplica integralmente as fontes de origem.

## Formação do lado técnico

Conforme a necessidade concreta, o Formador define a solução de alto nível e suas responsabilidades técnicas: organização da solução, tecnologias estruturais necessárias, contratos e APIs, dados, estado, persistência, integrações, consistência, tratamento de erros, autenticação, autorização, segurança, infraestrutura, operação, observabilidade, cópia de segurança, ambientes, integração e entrega contínuas, estratégia de testes, estratégia de verificação, riscos, restrições e dependências técnicas.

Nenhuma dessas categorias é universalmente obrigatória. A Formação estabelece decisões e detalhe suficientes para a futura decomposição, sem escrever código linha a linha ou antecipar a implementação.

### Capacidades transversais

Quando a evolução depender de identidade, autenticação, notificações, arquivos, pagamentos, auditoria ou outra capacidade transversal, o Formador avalia a dependência e a reutilização concretas. Separação arquitetural exige benefício demonstrável; não se cria serviço distribuído por possibilidade abstrata de reaproveitamento.

### Segurança

Segurança é considerada quando aplicável e de modo proporcional: autenticação, autorização, dados sensíveis, segredos, comunicação segura, validação de entrada, exposição de APIs, auditoria, retenção e privacidade. Decisão cujo alcance exceda a Entrega de Valor é encaminhada ao nível competente.

## Catálogo de Baselines e proposta técnica inicial

O [Catálogo de Baselines Técnicas](referencias/CATALOGO_DE_BASELINES_TECNICAS.md) é referência operacional da Formação. Antes de propor tecnologias, o Formador recupera decisões superiores já válidas. Na ausência de decisão superior incompatível, apresenta uma única proposta concreta baseada na **Baseline Essencial**.

O Formador não começa perguntando qual baseline o Owner prefere, se deseja monólito ou microserviços, qual provedor de nuvem, banco, framework ou arquitetura considera melhor. Também não apresenta um menu de alternativas abstratas.

Para solução nova sem decisão arquitetural superior, o ponto de partida é **monólito modular**: coesão, fronteiras claras, baixo acoplamento, contratos compreensíveis e responsabilidades separadas. Java 21, Spring Boot, PostgreSQL quando adequado, infraestrutura simples e baixo custo total razoável são referências iniciais da Baseline Essencial, não dogmas.

Microserviços, AWS, Azure, GCP, Kubernetes e arquitetura distribuída não são padrões iniciais. Podem integrar uma proposta quando forem decisão herdada, solicitação do Owner ou necessidade material explicada e aceita. Preparar evolução futura não significa antecipar distribuição.

Após enquadramento e descoberta suficientes, a proposta inicial pode registrar, conforme aplicável, arquitetura, backend, frontend, persistência, identidade e segurança, integrações, infraestrutura, operação, ambientes, estratégia de testes, estratégia de verificação, premissas, riscos e justificativa. A linguagem deve ser compreensível para Owner não especialista.

## Custo técnico-operacional

Sempre que a proposta contiver infraestrutura executável, ela informa estimativa mensal de custo: faixa aproximada, moeda adequada ao Owner quando possível, componentes principais, premissas, pontos de aumento relevante e incertezas. Preços não são congelados nesta norma; na formação concreta, devem ser consultados em fonte atual adequada.

A escolha considera custo total razoável, não somente a fatura de infraestrutura. Desenvolvimento, manutenção, operação, segurança, observabilidade, cópia de segurança, conhecimento necessário, complexidade e evolução futura entram na avaliação proporcional. Solução aparentemente barata não é preferível se tornar significativamente pior o custo total.

## Refinamento com o Owner e escalada de baseline

O diálogo com o Owner é um loop conceitual:

```text
proposta
→ reação do Owner
→ refinamento
→ nova proposta
→ fechamento
```

O Owner pode aceitar a direção, contestar componente, impor restrição, pedir alternativa, maior robustez, tecnologia ou provedor específico, rejeitar custo ou pedir simplificação. O Formador explica consequências técnicas e econômicas relevantes, sem converter toda preferência técnica em aprovação humana obrigatória.

A escalada de referência é progressiva:

```text
Essencial
→ Equilibrada
→ Avançada
```

Primeiro, o Formador tenta atender a necessidade dentro da Essencial. Requisito concreto incompatível ou sofisticação desejada exige explicação do motivo, impacto, benefício, custo e dependências antes de propor o próximo nível. A escalada não é automática, silenciosa nem uma proibição de tecnologias mais robustas.

## Decisões e nível competente

Uma decisão deve ser tomada no nível mais baixo capaz de decidir legitimamente todo o seu impacto.

| Classe | Alcance e tratamento |
| --- | --- |
| Decisão superior herdada | Já existe, afeta escopo maior e é consumida pela Entrega de Valor enquanto válida. Sua revisão exige motivo concreto. |
| Decisão técnica da Entrega de Valor | Afeta somente ou principalmente a evolução em formação. Pode ser tomada pelo Formador quando sustentada por evidência, não contradiz contexto superior e não exige decisão humana material. |
| Decisão local de implementação | Tem impacto restrito à futura execução e não altera valor, comportamento principal, contrato central, arquitetura de alto nível, fronteira ou decisão superior. Pode permanecer para a implementação. |

Se uma questão afeta várias Entregas de Valor, vários Módulos, a arquitetura geral, o Projeto ou a solução como um todo, o Formador torna seu alcance explícito, registra-a e a retorna ao nível competente. Quando ela for bloqueante, aguarda consolidação antes de consumi-la como contexto herdado. Não é criado aqui novo Ator, mecanismo formal de armazenamento ou aprovação de decisões superiores; essa lacuna permanece explícita.

## Fechamento, desconhecidos e detalhamento da solução

Uma decisão material necessária à futura realização não pode permanecer aberta, sem responsável competente, sem tratamento ou empurrada indevidamente para Work Item. Ela pode estar consolidada, herdada, decidida na Entrega de Valor, encaminhada ao nível superior ou explicitamente classificada como não bloqueante.

Nem todo desconhecido impede a Formação. Pode permanecer quando não for necessário à decomposição, não alterar decisão de alto nível, puder ser resolvido localmente na execução e não comprometer valor ou verificabilidade. Todo desconhecido relevante tem tratamento explícito.

Depois que a direção técnica estiver suficientemente fechada, o Formador detalha a solução no nível necessário para futura decomposição. Esse detalhamento pode abranger componentes e responsabilidades, contratos, endpoints quando necessários, modelos de dados, transições de estado, integrações, eventos técnicos, consistência, segurança, observabilidade, erros, dependências, estratégia de testes e critérios de verificação. Não é futura implementação nem decomposição em Work Items.

### Critérios verificáveis e estratégia de testes

Critérios verificáveis confrontam futuramente intenção de valor, comportamento esperado, resultado observável e software integrado. Não são evidência, conclusão, Status, Resultado do Processo ou homologação por si só; não devem ser somente técnicos quando o valor prometido exige comportamento perceptível pelo beneficiário.

A estratégia de testes é proporcional aos riscos e ao comportamento da evolução. Pode incluir testes unitários, de integração, de contrato, de ponta a ponta, de segurança, de carga, manuais ou outros mecanismos necessários, sem exigir todos eles.

## Especificação da Entrega de Valor

A saída documental principal da Formação é a **Especificação da Entrega de Valor**. Ela não é entidade nova, nem sua forma física é definida neste momento. Quando aplicável, consolida:

1. identidade, origem e rastreabilidade;
2. intenção de valor, beneficiário, resultado observável e fronteira;
3. comportamento esperado, Jornadas e Fluxos relevantes;
4. decisões herdadas e decisões técnicas da Entrega de Valor;
5. arquitetura e solução técnica de alto nível;
6. contratos, dados ou estado, integrações e dependências;
7. infraestrutura e segurança;
8. restrições, riscos e desconhecidos relevantes;
9. critérios verificáveis e estratégia de testes e verificação;
10. estimativa de custo quando aplicável; e
11. justificativa de suficiência para futura decomposição.

A lista é núcleo de consolidação proporcional, não formulário de campos vazios. Itens sem incidência material podem ser omitidos ou tratados de forma correspondente à evolução.

A Especificação preserva a cadeia:

```text
Entrega de Valor
→ Módulo
→ Projeto
→ Necessidade
```

Por referência, ela recupera a Especificação Técnica do Módulo, a Direção do Projeto e o Compromisso da Necessidade. Não cria arquivo de instância, diretório operacional, código, template físico obrigatório ou proposta real para P-001.

## Teste de suficiência e handoff para Auditoria

O teste conceitual central é:

> Com esta Especificação, a futura camada de decomposição e execução consegue construir a Entrega de Valor sem precisar redescobrir o valor de negócio ou redesenhar sua solução técnica de alto nível?

Se a resposta for negativa, a Formação ainda não está preparada para Auditoria, salvo se o impedimento for estrutural e exigir retorno ao Delimitador ou ao nível competente.

Quando considerar a Especificação consolidada, o Formador encerra sua atividade e a entrega, com evidências, classificações, riscos, lacunas legítimas e decisões, ao **Auditor da Entrega de Valor**. O Formador não declara a própria formação aprovada nem antecipa o parecer independente. A Auditoria avalia a suficiência da preparação e produz os Resultados formais definidos em [Resultados do Processo da Entrega de Valor](07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md).

## Fronteiras posteriores

Work Item continua vertical futura. A Formação prepara produto, comportamento, solução técnica de alto nível, contratos, restrições e critérios proporcionais para que a futura decomposição não redesenhe a evolução. A execução poderá decidir aspectos locais de implementação, inclusive atravessando múltiplas camadas técnicas quando isso for coeso, mas não é o lugar sistemático para redescobrir produto ou arquitetura.

O Verificador da Entrega de Valor atua somente após a Realização integrada. A Formação define critérios verificáveis; a Verificação confronta software integrado, critérios e evolução prometida. M-005 é capacidade de software do NAAMIVE e não se confunde com Formador, Auditor ou Verificador, embora possa futuramente consumir critérios ou suportar evidências.

Permanecem deliberadamente posteriores: agentes concretos, eventos e mecanismos operacionais de transição, forma física da Especificação, mecanismos de armazenamento e aprovação de decisões superiores, redelimitação operacional, instâncias, Work Item, decomposição, execução, ambientes, homologação, aceite, mecanismos de implementação e custos reais.
