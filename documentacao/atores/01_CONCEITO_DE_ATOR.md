# Conceito de Ator

## Conceitos fundamentais

**Ator** é o papel especializado que possui uma responsabilidade no processo.

**Executor** é quem concretamente exerce aquele Ator em uma execução.

**Skill** é a capacidade especializada necessária para um agente exercer um Ator agêntico.

Os três conceitos são distintos. Um Ator define a responsabilidade; o Executor a realiza; e a Skill principal capacita o agente para exercer a responsabilidade agêntica correspondente.

Exemplo conceitual:

```text
Ator: Especialista em Formação da Necessidade
Executor: agente
Skill principal: Formação da Necessidade
```

```text
Ator: Owner
Executor: usuário autenticado
```

## Naturezas de Ator

Nesta versão, existem as seguintes naturezas:

* **Ator humano:** exercido por pessoa humana.
* **Ator agêntico:** exercido por agente especializado.

Não há outras classificações nesta versão.

## Princípio de especialização dos agentes

Agentes devem exercer responsabilidades especializadas; não existe um agente genérico responsável por toda a cadeia do NAAMIVE.

Cada Ator agêntico desta versão deve possuir responsabilidade e fronteira claras, ser executado por agente que carregue a Skill principal correspondente àquela responsabilidade, entregar seu resultado e encerrar sua atuação naquele trabalho.

O princípio é: **“pastelero a tus pasteles”**: cada agente deve saber qual responsabilidade exerce e não acumular papéis especializados sem necessidade.

Nesta versão, a relação conceitual é:

```text
Ator agêntico especializado
≈ agente especializado
≈ Skill principal correspondente
```

Essa aproximação não determina cardinalidade universal rígida nem impede futura composição de capacidades auxiliares.

## Owner

`Owner` é o Ator humano transversal. Nesta versão, seu Executor é o usuário autenticado.

`Owner` não é papel configurável, grupo de usuários, perfil RBAC, relação de ownership atribuída individualmente por entidade, permissão delegável, hierarquia organizacional, matriz de autoridade, aprovação por maioria ou modelo multiusuário.

Esta simplificação é consciente. A introdução futura de multiusuário exigirá revisão explícita deste modelo; esta versão não cria RBAC, ACL, delegação, grupos, papéis configuráveis ou ownership por entidade.
