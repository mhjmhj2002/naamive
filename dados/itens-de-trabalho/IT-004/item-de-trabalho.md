# IT-004 — Camada Web Responsiva, Adaptadores HTTP e Suíte de Testes Locais

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `ec19cf4b-5775-47e2-8e10-c1b7147a46fa` |
| Código | `IT-004` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a camada web responsiva e o servidor HTTP (Node.js/TypeScript) com rotas para registro, consulta, atualização, submissão de pareceres e aprovação da Necessidade, acompanhada de interface visual responsiva (Bootstrap/HTML/CSS) e suíte integrada de testes locais verificando a jornada completa de EV-001.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), rotas/controllers, templates ou assets da interface web responsiva e suíte de testes de integração ponta a ponta local (`tests/e2e/` ou `tests/integration/`).
* **Dependências de outros itens:** `IT-003`.
* **Contratos lógicos observados:** Todos os contratos da Especificação de EV-001: interface responsiva apresentando a posição atual, histórico distinguível, bloqueio visual para decisões não autorizadas e disponibilização do Compromisso da Necessidade.
* **Decisões locais autorizadas:** Framework HTTP (ex: Express, Fastify ou Hono para Node.js), mecanismo de renderização de interface (ex: SSR com templates EJS/Pug ou HTML/Bootstrap estático servido pela aplicação) e ferramental de testes de ponta a ponta (ex: Supertest com Vitest).

## Critérios Técnicos de Aceitação

1. **Interface Responsiva Operante:** Telas responsivas acessíveis via navegador e rotas HTTP correspondentes permitindo criar Necessidade, acompanhar histórico e registrar pareceres.
2. **Decisão do Owner:** Tela com ação explícita de aprovação pelo Owner com validação de identidade e exibição imediata do Compromisso da Necessidade gerado.
3. **Suíte Integrada de Testes de Ponta a Ponta:** Bateria de testes automatizados locais que executa a jornada completa (Criação → Formação → Auditoria → Decisão do Owner → Geração do Compromisso → Disponibilização a M-002) e passa com 100% de sucesso.
4. **Verificação de Não Regressão:** Validação de que entradas inválidas ou transições proibidas retornam diagnósticos claros com código HTTP apropriado sem corromper o estado persistido.

## Execução e Evidências

* **Executor:** (Aguardando conclusão de IT-003)
* **Artefatos produzidos / alterados:** N/A
* **Resultado de testes locais:** N/A
* **Conclusão técnica:** N/A

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
