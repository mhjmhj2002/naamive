# Convenção de Branches

Esta convenção mantém branches de trabalho curtas e rastreáveis. Cada branch representa um item autorizado, mas seu nome preserva obrigatoriamente o proprietário estrutural — projeto, módulo ou capacidade de plataforma.

## Formato canônico

| Escopo | Formato | Exemplo |
| --- | --- | --- |
| Projeto | `work/<project-id>/project/<work-item-id>` | `work/digital-ordering/project/need-analysis` |
| Módulo | `work/<project-id>/<module-id>/<work-item-id>` | `work/digital-ordering/catalog/catalog-rules` |
| Plataforma | `work/platform/<capability>/<work-item-id>` | `work/platform/orchestration/gate-policy` |

Todos os identificadores usam somente letras minúsculas, números e hífen (`kebab-case`). `work-item-id` é obrigatório no despacho e é estável durante a execução. Nomes de agente, tecnologias, sprints, espaços, maiúsculas, acentos e segmentos adicionais são proibidos.

## Resolução e descoberta

1. Derivar o nome exclusivamente de `scope_type`, `project_id`, `module_id` quando aplicável, capacidade de plataforma e `authorized_work_item.id`.
2. Procurar a referência canônica localmente e em todos os remotos configurados.
3. Se existir localmente, utilizá-la.
4. Se existir somente no remoto, criar ou utilizar uma referência local de acompanhamento; não criar outra branch.
5. Se não existir em nenhum local, criá-la a partir da base autorizada pelo contexto.
6. Se o mesmo item de trabalho estiver associado a branch divergente, parar e solicitar revisão humana.

Para trabalho de módulo, a base autorizada é `main` ou a referência de integração indicada explicitamente no contexto; ela não é uma branch longa de módulo. O mesmo vale para projeto e plataforma. A autorização deve registrar a base e sua revisão de origem.

## Ciclo de vida

A branch existe somente enquanto o item de trabalho está ativo. Agentes podem realizar vários commits atômicos nela, sempre vinculados a execuções e despachos autorizados. Depois de integrada pela autoridade ou mecanismo autorizado, a branch deve ser encerrada conforme a governança; agentes não fazem merge nem exclusão por conta própria.

`main` é uma branch protegida de integração, nunca uma branch de trabalho de agente. Criar, atualizar, integrar, fazer merge, rebase, exclusão, push ou pull request requer a autorização definida na política de Git.

## Exemplos inválidos

```text
feature/catalog
agent/implementation/catalog
module/digital-ordering/catalog
work/catalog/catalog-rules
work/digital-ordering/backend/api
work/digital-ordering/catalog/Catalog-Rules
```

Esses nomes omitem proprietário ou item de trabalho, representam tecnologia em vez de escopo de negócio, ou violam o formato.
