---
task: F5-17
status: TODO
---

# F5-17 — Interface web dirigida por dados da Technology Baseline

## Referências

- [Planning: API, web e SSE; interface dirigida por dados](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 4, 8](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `web/index.html` (scripts progressivos de Fase 2/3/4)

## Implementar

1. Ao abrir a baseline, consultar `GET /api/technology/categories`, os itens `ACTIVE` de cada categoria aplicável, o Perfil Tecnológico `ACTIVE` e sua composição expandida, e o contexto de seleção/inventário do projeto; renderizar rótulos, ícones, ordem, capacidades, restrições de versão, classificações e compatibilidades apenas a partir das respostas publicadas do Catálogo.
2. Montar e enviar somente `selection_context_id`, `technology_catalog_revision_id`, `catalog_item_id`, `classification`, `version_constraint`, `reason` e referências auditáveis opcionais de perfil/regra; nunca enviar nomes de tecnologias; validação definitiva permanece no servidor.
3. Apresentar explicação simples ("Estas orientações serão usadas ao planejar e desenvolver os próximos módulos…"), o que foi detectado/confirmado, restrições, preferências e decisões em aberto, com fonte e incerteza; quando houver exatamente um perfil ativo, aplicá-lo automaticamente apresentando todos os itens/classificações/restrições ao operador.
4. Enquanto a baseline estiver pendente, desabilitar "Criar módulo" com a explicação "Revise as orientações técnicas antes de criar o primeiro módulo."; após aprovação, mostrar a aprovação e oferecer a criação do módulo; projetos legados mostram aviso informativo sem bloquear nem fingir baseline aplicada; não chamar a decisão de deploy, entrega ou aprovação de código.

## Aceite e comandos

Cobrir montagem por dados publicados, rejeição de texto tecnológico livre no corpo, bloqueio e liberação de "Criar módulo", aviso legado e ausência de condicional do navegador para linguagem/framework/banco/fornecedor.

Caso verificável da UI (cenário determinístico de E2E): com o projeto v3 em `WAITING_FOR_TECHNOLOGY_BASELINE`, a tela mantém "Criar módulo" indisponível com o texto "Revise as orientações técnicas antes de criar o primeiro módulo."; após `DECIDE_TECHNOLOGY_BASELINE` (aprovação), a mesma tela passa a oferecer a criação do módulo sem recarregar por condicional de tecnologia, e um projeto legado v2 exibe o aviso informativo sem bloquear.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check