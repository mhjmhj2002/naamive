# Política de Gates e Decisão Humana

Gates existem para reduzir risco com evidência, não para converter cada etapa em uma fila de aprovação. Todo avanço exige critérios verificáveis; aprovação humana é reservada a compromisso de negócio, exceção ou risco material.

## Tipos de controle

| Tipo | Como opera | Autoriza transição sozinho? |
| --- | --- | --- |
| `AUTOMATED_EVIDENCE` | Verifica critérios objetivos, testes, integridade e evidências. | Sim, quando todos os critérios passam. |
| `INDEPENDENT_REVIEW` | Um papel distinto avalia qualidade, integração ou segurança. | Sim, se o despacho e os critérios permitirem. |
| `HUMAN_DECISION` | Decide investimento, aceite de negócio, risco material ou exceção. | Sim, somente após decisão registrada. |

## Decisões humanas normais

1. **Registrar projeto e autorizar descoberta:** validar a solicitação pré-projeto, materializar o projeto e iniciá-lo em `ANALYSIS`.
2. **Assumir compromisso de produto:** aprovar objetivo, escopo de alto nível, módulos candidatos, investimento e riscos relevantes para `DEFINITION → ARCHITECTURE`.
3. **Aceitar entrega de negócio:** confirmar resultado, operação e handover para `DELIVERY → DELIVERED`.

## Decisões humanas condicionais

Exigem `HUMAN_DECISION` somente quando aplicáveis: mudança arquitetural material, risco residual, segurança/compliance, fornecedor, dados sensíveis, exceção à máquina de estados, pausa, cancelamento ou autorização de produção classificada como de alto risco.

## Regra de proporcionalidade

Qualidade, integração, requisitos detalhados, planejamento e prontidão para implementação não exigem aprovação humana recorrente quando seus critérios automatizados e revisões independentes passarem. A orquestração deve elevar o caso para humano somente quando detectar o risco ou a exceção previstos nesta política.
