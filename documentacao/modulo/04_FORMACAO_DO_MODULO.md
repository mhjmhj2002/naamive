# Formação do Módulo

## Finalidade e entrada

A entrada formal desta vertical é a **Direção do Projeto**, disponível porque o Projeto recebeu `FORMACAO_SUFICIENTE`. A Direção é contrato de passagem: a vertical Módulo pode consultar o Projeto completo e evidências, mas não repete enquadramento, descoberta, formação ou auditoria do Projeto.

A vertical começa antes da existência dos Módulos individuais. O Especialista em Delimitação de Módulos analisa a Direção, identifica capacidades coesas, aplica a [heurística 10 / 15 / 20](01_DEFINICAO_DO_MODULO.md#heurística-de-qualidade-10--15--20) e materializa os Módulos necessários. Cada Módulo nasce em `EM_FORMACAO`.

## Delimitação

A delimitação avalia responsabilidade, coesão, fronteiras, valor habilitado, relação com a Direção, dependências, sobreposições, lacunas e granularidade. Não divide automaticamente por interface, API, domínio, persistência ou qualquer outra camada técnica. A análise deve registrar justificativa para quantidade fora da curva, sem tratar `10`, `15` ou `20` como limites.

## Formação técnica individual

O Especialista em Formação do Módulo recebe um Módulo já materializado e organiza seu trabalho em:

```text
compreensão e refinamento da capacidade e fronteira
→ descoberta técnica
→ desenho técnico
→ handoff para Auditor do Módulo
```

Essas etapas não são status. A formação individual não refaz a delimitação do conjunto. Quando descobrir erro estrutural de fronteira, registra a evidência e devolve a questão ao Especialista em Delimitação de Módulos.

### Descoberta técnica

Conforme aplicável, a descoberta pode investigar código, arquitetura, frameworks, bibliotecas, infraestrutura, persistência, integrações, APIs e contratos existentes, segurança, autenticação e autorização, desempenho, concorrência, observabilidade, padrões do repositório, decisões arquiteturais, dependências e limitações operacionais.

Vale a regra: a ausência de informação não pode ser substituída por invenção. O material diferencia conhecido, inferido, proposto e desconhecido. Decisões técnicas só existem quando forem necessárias e sustentadas; não são escolhidas porque um Módulo supostamente precisa ter tecnologia.

### Desenho técnico proporcional

O desenho produz somente o necessário para tornar o Módulo realizável e auditável. Conforme a necessidade concreta, pode incluir decisões técnicas, arquitetura interna, componentes, contratos de API ou eventos, integrações, dados e persistência, entidades e relacionamentos técnicos, índices, transações, fluxos, diagramas, segurança, erros, idempotência, concorrência, observabilidade, requisitos e riscos técnicos.

Nenhum desses artefatos é universalmente obrigatório. Por exemplo, um Módulo sem persistência não inventa modelo de dados, e um diagrama só é produzido quando esclarece interação relevante.

## Condição de saída

Um Módulo está suficientemente formado quando sua capacidade, suas fronteiras e seu desenho técnico estão claros o bastante para que uma vertical posterior possa decompor sua realização sem precisar redesenhar o Módulo.

Isso não significa implementação concluída, código produzido, Entregas de Valor criadas, valor entregue, Projeto concluído ou Módulo operacionalmente concluído.

## Handoff e aprovação

O Especialista entrega evidências, classificação de afirmações, riscos, lacunas legítimas e desenho ao Auditor do Módulo. Após `FORMACAO_SUFICIENTE`, a **Especificação Técnica do Módulo** fica aprovada e disponível para consumo posterior. O Resultado do Processo aprova a formação; não se confunde com o artefato e não cria novo status.

Esta formação não cria a próxima vertical, Entrega de Valor, Item de Trabalho ou tarefa.
