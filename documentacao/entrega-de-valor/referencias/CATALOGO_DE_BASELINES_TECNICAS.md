# Catálogo de Baselines Técnicas da Entrega de Valor

## Finalidade e fronteiras

Este catálogo é uma referência operacional reutilizável para a futura Formação da Entrega de Valor. Ele oferece pontos de partida técnicos proporcionais para que o Especialista em Formação da Entrega de Valor não precise iniciar cada proposta do zero.

O catálogo não é uma entidade, instância, Ator, Skill, Ciclo de Vida, Status, Resultado do Processo ou mecanismo de persistência. Também não substitui a análise concreta da Entrega de Valor, sua formação futura, a futura Especificação da Entrega de Valor ou as decisões técnicas já aceitas em nível competente.

As três baselines são níveis de referência progressivos. A Baseline Essencial é o padrão inicial do NAAMIVE; as demais ampliam o espaço de solução quando houver motivo explícito e aceito. Elas não são um menu a ser entregue inicialmente ao Owner.

## Princípios de uso

### Proposta inicial concreta

Na ausência de solicitação explícita do Owner por configuração mais complexa, o Formador começa pela Baseline Essencial. Ele deve recuperar as decisões herdadas, analisar a Entrega de Valor e seu contexto técnico, adaptar essa referência e apresentar uma única proposta concreta.

O Formador não inicia a conversa transferindo ao Owner escolhas de arquitetura, fornecedor ou topologia. Em particular, não começa perguntando qual baseline, arquitetura, provedor de nuvem ou estilo de distribuição o Owner prefere. O Owner não precisa arquitetar a aplicação: o Formador analisa, propõe, explica consequências e estima custo; o Owner pode aceitar, contestar, impor restrição, pedir alternativa ou solicitar maior sofisticação.

O comportamento de referência é:

1. recuperar decisões técnicas e restrições herdadas;
2. analisar a Entrega de Valor, seu Módulo, dependências e contexto técnico relevante;
3. partir da Baseline Essencial;
4. adaptá-la ao caso concreto;
5. estimar o custo mensal quando houver infraestrutura executável;
6. apresentar uma proposta inicial concreta;
7. explicar resumidamente por que ela é proporcional;
8. aguardar a reação do Owner;
9. refinar a mesma baseline quando isso bastar;
10. discutir a escalada quando uma necessidade material a justificar;
11. consolidar as decisões materiais aceitas no nível competente; e
12. disponibilizar tais decisões à futura Especificação da Entrega de Valor.

Assim, a apresentação inicial deve ser identificada como **Proposta inicial — Baseline Essencial**, e não como uma lista para o Owner escolher entre níveis. As baselines posteriores permanecem disponíveis internamente para refinamento e escalada.

### Custo total razoável

A Baseline Essencial busca o menor custo total razoável capaz de entregar solução de qualidade adequada. Gratuidade isolada não é objetivo: uma alternativa com infraestrutura um pouco mais barata pode ser inadequada se introduzir grande custo de desenvolvimento, operação ou manutenção.

A avaliação proporcional considera infraestrutura, desenvolvimento, manutenção, operação, segurança, cópia de segurança, observabilidade, complexidade cognitiva, conhecimento necessário e evolução futura. A estimativa não precisa antecipar necessidades sem evidência, mas deve tornar explícitas as premissas e os custos que uma decisão técnica produz.

Sempre que a proposta contiver infraestrutura executável, ela informa uma faixa aproximada de custo mensal, preferencialmente na moeda adequada ao usuário, e identifica:

* componentes de maior custo;
* premissas de uso e de capacidade;
* serviços gratuitos ou promocionais relevantes, quando existirem;
* pontos que podem produzir salto de custo; e
* incertezas que precisam de validação posterior.

O catálogo não registra valores fixos nem preços atuais de provedores. Preços e condições comerciais devem ser consultados no momento da formação concreta.

### Decisões herdadas e alcance competente

Uma decisão técnica aceita, fundamentada e de alcance superior é contexto herdável. Caso Java 21, Spring Boot, PostgreSQL e monólito modular já tenham sido consolidados para uma solução, a formação de uma nova Entrega de Valor parte dessas decisões e não reabre, por rotina, a escolha de linguagem ou arquitetura. Revisão exige evidência nova ou decisão explícita competente.

Decisão específica da Entrega de Valor pode ser consolidada em sua formação futura quando afetar somente a evolução em questão. Já uma decisão que afete várias Entregas de Valor, vários Módulos, o Projeto, a arquitetura geral ou a solução como um todo não deve permanecer escondida como escolha privada da primeira Entrega de Valor que a revelar. Ela é registrada como dependência ou questão e tratada no nível competente, para então poder tornar-se contexto herdável.

O mecanismo formal de armazenamento, aprovação e recuperação dessas decisões de alcance superior permanece deliberadamente não definido.

## Baseline Essencial

Esta é a configuração padrão inicial. Ela privilegia simplicidade, baixo custo total, poucos componentes, operação simples, manutenção acessível, evolução saudável e ausência de distribuição sem necessidade.

### Arquitetura e evolução

Para projetos novos, a referência é **monólito modular**: preferencialmente uma aplicação principal e uma pequena quantidade de unidades implantáveis. Componentes só são separados quando houver benefício concreto demonstrável.

Microserviços não são a arquitetura padrão inicial e não devem ser sugeridos espontaneamente na primeira proposta. Possibilitar evolução futura significa manter responsabilidades claras, módulos internos coesos, baixo acoplamento, contratos claros, fronteiras técnicas compreensíveis e dados e dependências bem delimitados. Não significa antecipar descoberta de serviços, malha de serviços, rastreamento distribuído, intermediário de mensagens, orquestração de contêineres, múltiplos bancos por serviço ou dezenas de serviços.

### Referências de aplicação e persistência

Quando não houver decisão herdada, restrição ou fundamento concreto em sentido contrário, as referências iniciais são:

* Java 21 e Spring Boot para a aplicação de backend;
* organização modular explícita;
* API HTTP, quando aplicável;
* banco relacional e PostgreSQL, quando adequados;
* uma única instância lógica de banco enquanto a separação não for necessária;
* migrações versionadas; e
* cópia de segurança proporcional para dados persistentes relevantes.

Java 21, Spring Boot e PostgreSQL são referências atuais do catálogo, não invariantes ontológicos da Entrega de Valor nem tecnologias permanentes do NAAMIVE. O Formador pode propor alternativa quando houver fundamento concreto de custo, simplicidade, manutenção, compatibilidade, restrição ou atendimento ao público.

Não se sugere espontaneamente vários bancos, banco distribuído, obtenção de eventos como fonte de verdade, segregação física de comandos e consultas, banco não relacional sem necessidade ou lago de dados.

### Interface, ambientes e entrega

Não há obrigação de frontend separado nem de framework obrigatório de interface. Quando houver interface web, a proposta prefere a opção mais simples: a aplicação pode servi-la junto com o backend quando isso for conveniente; um frontend estático separado pode ser usado quando simplificar custo ou operação; e uma aplicação de página única só é indicada se trouxer benefício concreto.

Os ambientes de referência são desenvolvimento/local e produção. Homologação separada ou múltiplos ambientes só entram quando houver necessidade sustentada.

A referência mínima de integração e entrega contínuas é build automatizado, execução automática dos testes existentes, validações básicas, artefato reproduzível e implantação simples e repetível. A referência mínima de observabilidade inclui logs suficientes, verificação de saúde, monitoramento básico e informação de erro útil para diagnóstico. Dados persistentes relevantes precisam de cópia de segurança automática, retenção mínima adequada e possibilidade real de restauração.

### Infraestrutura, escala e nuvem

A infraestrutura prefere uma região, quantidade mínima de recursos, implantação simples, hospedagem de baixo custo, TLS, segredos tratados adequadamente e armazenamento de objetos somente quando necessário. Banco gerenciado pode ser preferível quando seu custo total for economicamente vantajoso.

AWS, Azure e GCP não são escolhas automáticas. A referência parte de uma solução economicamente proporcional, sem proibir grandes provedores de nuvem. Eles podem entrar se o Owner os solicitar explicitamente, se houver decisão herdada ou se uma necessidade for discutida e aceita pelo Owner. Quando o Owner escolher um fornecedor específico, o Formador adapta a proposta a ele.

A estratégia de escala segue esta prioridade:

1. corrigir desperdícios;
2. otimizar quando necessário;
3. escalar verticalmente;
4. introduzir cache se houver evidência;
5. escalar horizontalmente se necessário; e
6. distribuir capacidades somente diante de motivo real.

### Capacidades transversais reutilizáveis

Uma capacidade transversal com reutilização real ou fortemente prevista pode justificar separação da aplicação principal. Identidade, autenticação, autorização, notificações, arquivos, pagamentos e auditoria são exemplos possíveis, desde que cada separação tenha justificativa concreta.

Identidade e acesso podem ser uma capacidade reutilizável quando mais de um produto a consumir ou houver perspectiva concreta de compartilhamento. Nesse caso, pode existir componente ou aplicação própria responsável por cadastro, identidade, autenticação, credenciais, recuperação de acesso, papéis e permissões e, quando aplicáveis, tokens ou sessões. Produtos consumidores não devem duplicar desnecessariamente essas responsabilidades.

Isso não torna autenticação separada uma regra universal. Em solução pequena e isolada, o Formador pode mantê-la interna ou usar serviço adequado quando essa alternativa for mais simples e econômica.

## Baseline Equilibrada

Este é o segundo nível de referência, usado quando o Owner quiser evoluir além da Baseline Essencial. Seu objetivo é adicionar robustez proporcionalmente; ela não implica microserviços.

Conforme a necessidade demonstrada, pode admitir mais de uma instância, balanceamento, ambiente de homologação, serviços gerenciados mais robustos, observabilidade ampliada, filas, processamento assíncrono, cache, armazenamento de objetos, capacidades transversais separadas, cópia de segurança mais robusta e maior isolamento. A arquitetura pode continuar sendo monólito modular.

Todo novo componente precisa de justificativa. Ao apresentar essa escalada, o Formador mostra o que mudou, por que mudou, o benefício obtido e o custo adicional aproximado.

## Baseline Avançada

Este é o terceiro nível de referência. É apropriado quando o Owner deliberadamente desejar arquitetura mais sofisticada ou quando, após discussão explícita, aceitar uma configuração de maior complexidade.

Conforme a necessidade concreta, pode admitir microserviços, arquitetura orientada a eventos, mensageria, múltiplas unidades implantáveis, gateway de API, persistências especializadas, contêineres em escala, infraestrutura como código, alta disponibilidade, múltiplas zonas, escalonamento automático, observabilidade distribuída, rastreamento, objetivos de nível de serviço, estratégias avançadas de resiliência, recuperação de desastre e implantação progressiva.

Esses elementos são possibilidades, não lista obrigatória. Maior sofisticação amplia o espaço de solução, mas não autoriza inserir complexidade sem benefício demonstrado.

## Escalada explícita e diálogo com o Owner

A escalada é progressiva: Essencial, depois Equilibrada e, somente quando necessário, Avançada. O Formador não salta automaticamente para solução complexa apenas porque ela é tecnicamente possível.

Caso o Owner peça solução mais robusta, AWS, microserviços, maior disponibilidade ou arquitetura mais sofisticada, o Formador pode apresentar proposta compatível com o próximo nível adequado. Caso detecte requisito aparentemente incompatível com a Baseline Essencial, ele torna o conflito explícito, explica a consequência, apresenta a necessidade potencial de escalada e não aumenta silenciosamente arquitetura e custo.

O diálogo futuro é um ciclo de proposta, reação do Owner, refinamento, nova proposta e fechamento. Esta descrição é apenas referência operacional: não estabelece Ciclo de Vida, eventos, Status, Resultados do Processo ou transições.

## Forma de referência para a proposta inicial

A proposta é compreensível para usuário não especialista e pode adotar, sem se tornar formulário rígido, a seguinte estrutura:

```text
Proposta inicial

Baseline:
- Essencial

Arquitetura:
- ...

Backend:
- ...

Frontend:
- ...

Persistência:
- ...

Identidade e segurança:
- ...

Infraestrutura:
- ...

Operação:
- ...

Custo mensal estimado:
- ...

Principais premissas:
- ...

Por que esta proposta:
- ...

O que poderia justificar uma configuração mais sofisticada:
- ...
```

## Evolução do catálogo e limites atuais

As referências técnicas deste catálogo podem evoluir se a experiência real demonstrar alternativa que reduza custo ou complexidade, simplifique operação, melhore manutenção ou atenda melhor ao público. Alterar o catálogo não reabre automaticamente soluções existentes.

Ele é especialmente compatível com aplicações pessoais, projetos pequenos, novos produtos em estágio inicial, orçamentos limitados e usuários que não dominam arquitetura de software. Isso não limita permanentemente o NAAMIVE: cenários maiores podem justificar as referências posteriores.

Permanecem fora deste catálogo a Formação completa da Entrega de Valor, Skills de seus Atores, Ciclo de Vida, Status, Resultados do Processo, eventos, Work Items, tarefas, instâncias, preços fixos, fornecedor obrigatório, framework obrigatório de frontend, formato definitivo de decisões de alcance superior e mecanismo de persistência das baselines.
