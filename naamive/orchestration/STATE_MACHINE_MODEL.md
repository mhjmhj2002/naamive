# Modelo de Máquinas de Estado

As regras de estado do NAAMIVE são globais e centralizadas neste diretório. Elas definem o que pode acontecer; não registram o estado de uma instância concreta.

Cada projeto e cada módulo materializado registra seu estado atual em seu próprio `STATUS.md`. Esse registro deve referenciar a máquina aplicável e não pode copiar, alterar ou ampliar suas regras.

```text
Regra global em naamive/orchestration/
             ↓
Contexto de execução validado
             ↓
STATUS.md do projeto ou módulo
             ↓
Agente atua somente no escopo e transição autorizados
```

## Regras comuns

- Um estado só muda por uma transição definida na máquina aplicável.
- Toda transição exige evidências indicadas na regra, uma solicitação de transição e o tipo de controle exigido. Aprovação humana só ocorre quando a política de gates a exigir.
- Agentes podem produzir evidência e solicitar uma transição; não a aprovam em nome da autoridade humana.
- `PAUSED` e `CANCELLED` podem ser alcançados de qualquer estado ativo por decisão humana registrada.
- A retomada de `PAUSED` retorna ao último estado ativo somente após remoção do impedimento e aprovação aplicável.
- Nenhum contexto de módulo pode avançar além do estado do projeto que o contém.
- Uma exceção requer decisão explícita, rastreável e anexada ao contexto de execução; ela não altera a máquina global.

## Fonte de verdade por responsabilidade

| Informação | Fonte de verdade |
| --- | --- |
| Estados, transições e gates permitidos | Documentos neste diretório |
| Escopo, autorização e entradas de uma execução | Contrato de contexto de execução |
| Estado atual de uma instância | `projects/<project-id>/STATUS.md` ou `modules/<module-id>/STATUS.md` |
| Evidências produzidas | Escopo de projeto ou módulo definido pelo contexto |
| Dependência de módulo reutilizável | Contrato de consumo no projeto consumidor; módulo permanece no projeto provedor |

## Documentos normativos

- [Máquina de estados de projeto](PROJECT_LIFECYCLE.md)
- [Máquina de estados de módulo](MODULE_LIFECYCLE.md)
- [Protocolo de orquestração](ORCHESTRATION_PROTOCOL.md)
- [Contrato de contexto de execução](../contracts/EXECUTION_CONTEXT.md)
- [Contrato de despacho](../contracts/WORK_DISPATCH.md)
- [Contrato de solicitação de transição](../contracts/TRANSITION_REQUEST.md)
- [Contrato de decisão de gate](../contracts/GATE_DECISION.md)
- [Contrato de consumo de módulo](../contracts/MODULE_CONSUMPTION.md)
- [Política de gates](../governance/GATE_POLICY.md)
