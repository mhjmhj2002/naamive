# IT-010 — Núcleo de Domínio de Coordenação, Motor de Elegibilidade e Invariante de Especialização

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `47e4aebe-14e9-485c-95cb-5e69a503df9a` |
| Código | `IT-010` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar o núcleo de domínio puro para Coordenação do Trabalho em TypeScript, contendo as entidades `TrabalhoCoordenado`, `HandoffCoordenacao`, `RetornoCoordenacao`, objetos de valor e tipos associados, as regras estritas de transição entre condições operacionais, o invariante de encadeamento de especialização (`competência → Ator → Skill → Executor`), e o serviço de domínio `MotorCoordenacaoTrabalho` para identificação determinística e auditável do próximo avanço válido e avaliação de dependências.
* **Fronteira técnica:** Camada de domínio puro (`src/dominio/coordenacao/` ou equivalente), sem dependência direta de bancos de dados, frameworks HTTP ou bibliotecas de terceiros externas ao domínio.
* **Dependências de outros itens:** `IT-009`.
* **Contratos lógicos observados:** Especificação da EV-003 (Seção Arquitetura e Decisões Técnicas e Contratos lógicos de casos de uso), modelo de dados relacional e regras invariantes.
* **Decisões locais autorizadas:** Nomes de métodos de domínio, estrutura interna de classes e funções utilitárias de avaliação de grafo de dependências.

## Critérios Técnicos de Aceitação

1. **Entidades Puras e Imutabilidade:** Entidades encapsulando o estado, validações de atributos obrigatórios e geração correta de tokens de correlação e identificadores.
2. **Invariante de Especialização Garantido:** Validação rigorosa que impede a transição para `PREPARADO` ou emissão de handoff se faltar a atribuição do Ator agêntico/humano competente e da Skill principal correspondente.
3. **Máquina de Estados Operacionais:** Transições válidas entre `POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA` e `ENCERRADO`, rejeitando formalmente saltos inválidos de fluxo.
4. **Motor de Elegibilidade e Próximo Avanço:** Serviço de domínio calcula corretamente o próximo avanço a partir do estado das dependências e da ausência de bloqueios ou pendências de decisão humana.
5. **Cobertura Completa de Testes de Unidade:** Bateria completa de testes unitários isolados cobrindo 100% dos caminhos críticos de decisão e regras do domínio.
6. **Verificação Estrita:** `npm run typecheck`, `npm run build` e suíte de testes aprovados sem erros.

## Execução e Evidências

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/domain/tipos-coordenacao.ts`: Catálogo oficial de tipos, condições operacionais (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`) e atores da coordenação.
  - `src/domain/valores-coordenacao.ts`: Objetos de valor, interfaces de dados e estrutura do pacote estruturado do handoff com referências de contexto.
  - `src/domain/coordenacao.ts`: Entidades de domínio puro `TrabalhoCoordenado`, `HandoffCoordenacao` e `RetornoCoordenacao`, encapsulando invariantes de especialização, máquina de estados operacionais, imutabilidade de retornos e reconstituição.
  - `src/domain/motor-coordenacao.ts`: Serviço de domínio puro `MotorCoordenacaoTrabalho` para avaliação do grafo de dependências, diagnóstico de elegibilidade, promoção de trabalhos e cálculo determinístico do próximo avanço válido.
  - `src/index.ts`: Exportação canônica das novas entidades e serviços de coordenação.
  - `tests/it010-dominio-coordenacao.test.ts`: Suíte de 12 testes unitários isolados validando todos os caminhos críticos e invariantes.
* **Resultado de testes locais:**
  - `npm run typecheck`: 0 erros de tipagem.
  - `npm run build`: Compilação TypeScript concluída com sucesso.
  - `npm test`: 10 suítes de teste executadas, 72 testes aprovados (100% de sucesso).
* **Conclusão técnica:** O núcleo de domínio de coordenação está plenamente implementado, testado e em conformidade estrita com a Especificação da EV-003 e os invariantes de domínio do NAAMIVE.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Engenheiro de Software
