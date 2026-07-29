# Modelo de Agentes do NAAMIVE

Os agentes são capacidades globais da plataforma NAAMIVE. Eles apoiam e automatizam atividades de engenharia no ciclo de transformação de uma necessidade de negócio em software entregue. Não são produtos, módulos de negócio nem autoridades autônomas de aprovação.

## Regras operacionais

- Cada agente atua somente no escopo e com os artefatos autorizados pelo contexto de execução.
- Toda saída deve referenciar suas entradas e registrar evidência suficiente para auditoria.
- Um agente não pode aprovar a própria saída, substituir a autoridade humana ou ocultar incertezas, riscos e decisões pendentes.
- Transições entre etapas exigem saída explícita do agente anterior, gate aplicável e contexto válido do projeto ou módulo.
- Agentes globais não são copiados para `projects/` ou `modules/`.
- Antes de atuar, cada agente deve validar o [contrato de contexto de execução](../contracts/EXECUTION_CONTEXT.md), receber um [despacho de trabalho](../contracts/WORK_DISPATCH.md) e respeitar a [máquina de estados aplicável](../orchestration/STATE_MACHINE_MODEL.md).

## Cobertura do ciclo

```text
Necessidade → intake → análise → domínio → requisitos → arquitetura → planejamento
→ implementação → integração → qualidade e segurança → entrega → evolução
```

O agente de governança acompanha o ciclo, verificando rastreabilidade, limites de autoridade e evidências. A sequência não autoriza pular etapas: somente uma decisão de governança e a autoridade humana aplicável podem liberar uma exceção.

## Catálogo

| Identificador | Papel principal |
| --- | --- |
| `business-intake` | Qualifica a necessidade e estabelece o contexto inicial. |
| `business-analysis` | Converte necessidade em entendimento de negócio verificável. |
| `domain-modeling` | Delimita capacidades, linguagem e regras do domínio. |
| `requirements-engineering` | Produz requisitos, critérios de aceitação e restrições rastreáveis. |
| `solution-architecture` | Define a arquitetura do produto ou módulo dentro das restrições aprovadas. |
| `delivery-planning` | Organiza plano, dependências, riscos e entregas. |
| `implementation` | Implementa artefatos autorizados e testes próximos à implementação. |
| `integration-engineering` | Constrói e verifica integrações entre módulos e sistemas externos. |
| `quality-assurance` | Planeja e executa validações de qualidade e aceitação. |
| `security-assurance` | Avalia requisitos e evidências de segurança. |
| `release-operations` | Prepara entrega, operação e transferência de responsabilidade. |
| `governance-assurance` | Verifica rastreabilidade, evidências, gates e autoridade humana. |

As definições individuais estão em diretórios próprios sob `naamive/agents/`. O contrato de execução e as máquinas de estado determinam onde e quando esses papéis podem atuar.

O comportamento comum, os limites de escrita e o protocolo obrigatório de commit estão no [padrão operacional](AGENT_OPERATING_STANDARD.md) e na [política de contribuição Git](../governance/GIT_CONTRIBUTION_POLICY.md).

A [matriz de garantia por agente](AGENT_ASSURANCE_MATRIX.md) define os controles específicos de cada papel; o [padrão de garantia](AGENT_ASSURANCE_STANDARD.md) define controles contra entrada não confiável, excesso de privilégio e ações de alto impacto.
