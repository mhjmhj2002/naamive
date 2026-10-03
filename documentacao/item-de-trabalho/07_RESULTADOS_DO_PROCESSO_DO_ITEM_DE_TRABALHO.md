# Resultados do Processo do Item de Trabalho e da Realização

## Finalidade

Este é o catálogo oficial e a única fonte normativa dos **Resultados do Processo** da vertical Item de Trabalho e da etapa de Realização do NAAMIVE.

Resultado do Processo registra uma conclusão técnica, determinação ou decisão formal produzida por atividade competente. Ele não informa onde a entidade está no ciclo (o que é responsabilidade do Status).

```text
Status
→ posição persistida alcançada no ciclo

Resultado do Processo
→ conclusão técnica ou determinação produzida por atividade competente
```

## Catálogo Oficial e Autoridade Exclusiva

| Atividade | Resultado do Processo | Ator Competente | Efeito Normativo |
| --- | --- | --- | --- |
| Execução Técnica do Item | `EXECUCAO_CONCLUIDA` | Engenheiro de Software | Permite a transição do Item de Trabalho de `EM_EXECUCAO` para `CONCLUIDO`. |
| Execução Técnica do Item | `EXECUCAO_IMPEDIDA` | Engenheiro de Software | Leva o Item de Trabalho para `BLOQUEADO` e aciona tratamento causal no Planejamento ou Formação. |
| Integração da Realização | `REALIZACAO_INTEGRADA` | Integrador da Realização | Atesta que o conjunto integrado dos itens atende aos critérios técnicos de software executável e autoriza o handoff para o **Verificador da Entrega de Valor**. |
| Integração da Realização | `REALIZACAO_INSUFICIENTE` | Integrador da Realização | Identifica defeitos técnicos na integração ou testes quebrados; encaminha tratamento causal a itens específicos sem transicionar a EV. |

---

## 1. Resultados da Execução do Item de Trabalho

### `EXECUCAO_CONCLUIDA`
* **Emitido por:** Engenheiro de Software.
* **Condição:** O código, configurações e testes automatizados do Item de Trabalho foram implementados; todos os critérios técnicos de aceitação foram comprovados; os testes locais foram executados e passaram com 100% de sucesso.
* **Efeito:** O Item de Trabalho passa para o status `CONCLUIDO`. Suas dependências a jusante (itens que dele dependiam) são liberadas para `PRONTO_PARA_EXECUCAO`.

### `EXECUCAO_IMPEDIDA`
* **Emitido por:** Engenheiro de Software.
* **Condição:** A implementação encontrou obstáculo intransponível no âmbito das decisões locais do item (ex: especificação ambígua, falha em dependência externa não contornável, contradição de contrato).
* **Efeito:** O Item de Trabalho passa para `BLOQUEADO`. O Engenheiro de Software registra a causa detalhada e a determinação de tratamento, acionando o Especialista em Planejamento da Realização ou a Formação da EV.

---

## 2. Resultados da Integração da Realização

### `REALIZACAO_INTEGRADA`
* **Emitido por:** Integrador da Realização.
* **Condição:** Todos os Itens de Trabalho da Entrega de Valor estão em `CONCLUIDO` com `EXECUCAO_CONCLUIDA`. O build completo do sistema compila sem erros e a suíte integrada de testes (unidade, integração de persistência, contratos) passa com 100% de sucesso.
* **Efeito:** Conclui a fase de construção técnica interna da Realização. Autoriza a entrega oficial do handoff ao **Verificador da Entrega de Valor**, para que este avalie substantivamente se a evolução prometida ao usuário foi materializada. A Entrega de Valor permanece em `EM_REALIZACAO` aguardando a Verificação.

### `REALIZACAO_INSUFICIENTE`
* **Emitido por:** Integrador da Realização.
* **Condição:** O build geral falhou, testes da suíte integrada quebraram com a união dos componentes, ou foram detectadas lacunas técnicas de integração entre os Itens de Trabalho.
* **Efeito:** A integração técnica é reprovada. O Integrador detalha a falha e indica a determinação de tratamento (ex: reabertura/replanejamento de itens pelo Especialista em Planejamento da Realização ou correção pontual por um Engenheiro de Software). Não altera o status da Entrega de Valor (que permanece em `EM_REALIZACAO`).

---

## Separação Estrita de Conceitos

* O Engenheiro de Software não emite `REALIZACAO_INTEGRADA` nem avalia valor percebido pelo usuário.
* O Integrador da Realização não emite `EVOLUCAO_MATERIALIZADA` nem substitui o Verificador da Entrega de Valor.
* O Verificador da Entrega de Valor só atua após a emissão de `REALIZACAO_INTEGRADA`.
* Nenhum Ator agêntico emite `CANCELAMENTO_APROVADO`, que é decisão humana privativa do Owner.
