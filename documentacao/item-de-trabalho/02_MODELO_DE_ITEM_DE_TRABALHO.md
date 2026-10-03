# Modelo de Item de Trabalho

## Finalidade

Este documento define as informações, atributos e relações estruturais que tornam o Item de Trabalho uma entidade identificável, coesa e rastreável dentro da vertical de Realização do NAAMIVE. Ele também estabelece a materialização documental mínima no modelo operacional do repositório.

## Estrutura Conceitual

```text
Item de Trabalho
├── identificador técnico (UUID versão 4)
├── código (IT-<EV>-<sequencial> ou IT-<sequencial>)
├── título / nome técnico
├── Entrega de Valor proprietária
├── Módulo de proveniência (herdado)
├── objetivo técnico
├── escopo de implementação (fronteira técnica e arquivos/componentes)
├── decisões locais e contratos aplicáveis
├── dependências de outros Itens de Trabalho
├── critérios técnicos de aceitação (testes, compilação, comportamento local)
└── evidências de execução técnica produzidas
```

## Identidade Própria

Todo Item de Trabalho possui identidade própria e estável:

* **identificador técnico:** `UUID` versão 4 canônico e minúsculo, único globalmente no repositório;
* **código:** referência legível para comunicação humana e rastreabilidade ágil; e
* **título técnico:** descrição concisa da unidade de trabalho a ser executada.

### Código Humano

O código do Item de Trabalho segue o padrão normativo:
`IT-<sequencial com ao menos três algarismos>` (ex: `IT-001`, `IT-002`) OU referenciado à EV no formato contextual `IT-<código da EV>-<sequencial de dois dígitos>` (ex: `IT-EV001-01`).
Para manter total compatibilidade com a convenção global simples e estável das entidades do NAAMIVE (`N-001`, `P-001`, `M-001`, `EV-001`), adota-se como padrão canônico global:
`IT-<sequencial com ao menos três algarismos>` (ex: `IT-001`).

O código é único, estável e não reutilizável. Antes de atribuir um código, o Ator responsável pela decomposição consulta os Itens de Trabalho já materializados em `dados/itens-de-trabalho/*/item-de-trabalho.md` e atribui o próximo inteiro positivo disponível.

## Vínculo Estrutural com a Entrega de Valor

O Item de Trabalho é subordinado a exatamente uma Entrega de Valor:

```text
1 Entrega de Valor (em FORMADA ou EM_REALIZACAO)
→ possui
→ 1..N Itens de Trabalho

1 Item de Trabalho
→ pertence a
→ exatamente 1 Entrega de Valor
```

O vínculo é imutável. Um Item de Trabalho não pode pertencer a mais de uma Entrega de Valor simultaneamente nem migrar de Entrega de Valor. Se uma necessidade técnica for comum a múltiplas Entregas de Valor, a solução de alto nível deve ter sido resolvida na Formação (por exemplo, compartilhamento de contratos no Módulo) ou decomposta em itens específicos subordinados a cada EV correspondente.

## Rastreabilidade de Origem

A cadeia estrutural completa de rastreabilidade é:

```text
Item de Trabalho
→ Entrega de Valor
→ Módulo
→ Projeto
→ Necessidade
```

Através dessa cadeia, o Executor do Item de Trabalho tem acesso a:
* Especificação da Entrega de Valor;
* Especificação Técnica do Módulo;
* Direção do Projeto;
* Compromisso da Necessidade.

## Materialização no Modelo Operacional Atual

No modelo operacional atual baseado no sistema de arquivos do repositório, cada instância de Item de Trabalho é persistida em:

```text
dados/itens-de-trabalho/<codigo-do-item-de-trabalho>/item-de-trabalho.md
```

Exemplo: `dados/itens-de-trabalho/IT-001/item-de-trabalho.md`.

### O Plano de Realização da Entrega de Valor

Antes ou concomitantemente à materialização dos Itens de Trabalho de uma Entrega de Valor, o **Especialista em Planejamento da Realização** cria ou atualiza o **Plano de Realização da Entrega de Valor**, persistido em:

```text
dados/entregas-de-valor/<codigo-da-entrega-de-valor>/plano-de-realizacao.md
```

O Plano de Realização é o mapa canônico da decomposição técnica daquela EV, contendo:
* referência à Entrega de Valor de origem e à sua Especificação aprovada;
* lista ordenada de Itens de Trabalho necessários;
* grafo de dependências técnicas entre os Itens de Trabalho;
* estratégia de integração contínua / local e suíte de testes integrada;
* registro de transição do status da EV de `FORMADA` para `EM_REALIZACAO`.

### Estrutura Mínima do Registro do Item de Trabalho (`item-de-trabalho.md`)

```markdown
# <código> — <título técnico>

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | <UUID versão 4> |
| Código | <código, ex: IT-001> |
| Entrega de Valor proprietária | [código — nome](../../entregas-de-valor/<código>/entrega-de-valor.md) |
| Módulo de proveniência | [código — nome](../../modulos/<código>/modulo.md) |
| Status | CRIADO |

## Definição Técnica

* **Objetivo técnico:** <o que este item realiza concretamente>
* **Fronteira técnica:** <componentes, pacotes ou camadas abordados>
* **Dependências de outros itens:** <nenhuma ou códigos dos ITs precedentes>
* **Contratos lógicos observados:** <referências à Especificação da EV>
* **Decisões locais autorizadas:** <autonomia do executor para implementar classes, métodos e testes>

## Critérios Técnicos de Aceitação

1. <Critério 1: compilação, tipos, lint sem erros>
2. <Critério 2: testes unitários/integrados locais passando>
3. <Critério 3: atendimento específico do contrato técnico>

## Execução e Evidências

* **Executor:** <designação do agente ou identificação do executor>
* **Artefatos produzidos / alterados:** <caminhos de arquivos de código/teste criados ou modificados>
* **Resultado de testes locais:** <registro ou log resumido da execução de testes locais>
* **Conclusão técnica:** <resumo das decisões locais tomadas e estado da entrega técnica>

## Resultado do Processo

* **Resultado da Execução:** <EXECUCAO_CONCLUIDA | EXECUCAO_IMPEDIDA>
* **Data / Registro:** <registro do resultado>
```

## Invariantes do Modelo

1. O Item de Trabalho só pode ser materializado para uma Entrega de Valor que tenha alcançado validamente o status `FORMADA` (com `FORMACAO_SUFICIENTE`) ou que já esteja `EM_REALIZACAO`.
2. O identificador técnico `UUID` versão 4 é perene e imutável.
3. O código `IT-<sequencial>` é perene e não reutilizável.
4. O Item de Trabalho não armazena nem duplica a especificação de negócio da EV, apenas referencia os contratos técnicos a realizar.
5. O Item de Trabalho não substitui a Entrega de Valor, o Plano de Realização nem o registro principal da EV.
