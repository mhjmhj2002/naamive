# IT-004 — Adaptador Web/HTTP e Suíte de Verificação Local Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `03e72009-acd6-4c7c-9dd1-1693591a1bc7` |
| Código | `IT-004` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CRIADO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a camada de exposição web (controladores REST HTTP e/ou templates web da Baseline Essencial) para suportar as operações de registro de Necessidade, consolidação de formação, registro de parecer e decisão humana, e consulta do Compromisso; além de consolidar a suíte integrada de testes de ponta a ponta (E2E) que valida os critérios verificáveis estabelecidos na Especificação da EV-001.
* **Fronteira técnica:** Camada de controle/exposição web (Spring MVC / REST Controllers, DTOs, validações `@Valid`, serialização JSON) e suíte de testes de integração ponta a ponta (`@SpringBootTest`, `MockMvc` / `WebTestClient`).
* **Dependências de outros itens:** `IT-003` (para integrar fluxo completo com autenticação e adaptadores).
* **Contratos lógicos observados:** Casos de uso da Especificação de EV-001 e os 6 critérios verificáveis:
  1. Registro e consulta de Necessidade distinguível do histórico;
  2. Pareceres de Formação, Auditoria e Qualificação vinculados aos Atores sem confusão com status;
  3. Rejeição de decisão sem identidade ou fora de posição elegível;
  4. Decisão `APROVADO` produz Compromisso e solicitação idempotente para M-002 sem criar o Projeto internamente;
  5. Repetição de solicitação não duplica o Projeto (invariante 1:1);
  6. Evidências e vínculos perenes e recuperáveis.
* **Decisões locais autorizadas:** Nomenclatura e caminhos exatos dos endpoints REST (ex: `POST /api/necessidades`, `POST /api/necessidades/{id}/decisao`, `GET /api/necessidades/{id}/compromisso`), estrutura de DTOs e códigos de status HTTP apropriados.

## Critérios Técnicos de Aceitação

1. Endpoints REST respondem aos contratos esperados com validação de payload e tratamento adequado de erros (400, 401, 403, 404, 409).
2. A suíte de testes de ponta a ponta (E2E) é executada com 100% de sucesso cobrindo a jornada completa de uma Necessidade do registro até a disponibilização do Compromisso após aprovação do Owner.
3. Todas as asserções correspondentes aos critérios verificáveis da Especificação da EV-001 são demonstradas por relatórios de execução dos testes.

## Execução e Evidências

* **Executor:** *Pendente de atribuição ao Engenheiro de Software*
* **Artefatos produzidos / alterados:** *Pendente*
* **Resultado de testes locais:** *Pendente*
* **Conclusão técnica:** *Pendente*

## Resultado do Processo

* **Resultado da Execução:** *Pendente*
* **Data / Registro:** *Pendente*
