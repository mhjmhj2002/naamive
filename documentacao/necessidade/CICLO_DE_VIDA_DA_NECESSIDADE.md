# Ciclo de Vida da Necessidade

## Finalidade

Este documento define o fluxo, os eventos e as transições da Necessidade desde sua criação até o encerramento. O catálogo de posições possíveis no ciclo está em [Status da Necessidade](STATUS_DA_NECESSIDADE.md). As conclusões, recomendações e decisões produzidas durante o processo estão em [Resultados do Processo da Necessidade](RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md).

## Fluxo principal

```text
criação
→ EM_FORMACAO
→ formação concluída
→ EM_QUALIFICACAO
→ qualificação concluída e recomendação emitida
→ AGUARDANDO_DECISAO
→ decisão humana APROVADO
→ criação obrigatória do Projeto 1:1
→ EM_PROJETO
→ Projeto concluído com sucesso
→ ATENDIDA
```

Os caminhos excepcionais são:

```text
NAO_CARACTERIZA_NECESSIDADE
→ tratamento na formação ou decisão humana de cancelamento
→ CANCELAMENTO_APROVADO
→ CANCELADA

NAO_ASSUMIR_COMPROMISSO
→ decisão humana de cancelamento
→ CANCELAMENTO_APROVADO
→ CANCELADA
```

`ATENDIDA` e `CANCELADA` são terminais. Arquivamento, se necessário no futuro, será uma condição administrativa posterior ao encerramento e não um status do ciclo de negócio.

## Transições

| Evento ou condição | Transição | Regra |
| --- | --- | --- |
| Criação da Necessidade | `EM_FORMACAO` | A Necessidade entra diretamente nesse status. Não há status de registro. |
| Formação concluída | `EM_FORMACAO` → `EM_QUALIFICACAO` | Exige auditoria com formação suficiente e confirmação da intenção pela pessoa usuária, conforme o processo de formação. |
| Auditoria com `NAO_CARACTERIZA_NECESSIDADE` | permanece em `EM_FORMACAO` ou segue para decisão humana de cancelamento | O agente trata a demanda quando ainda for possível compreendê-la ou reformulá-la. Se o diagnóstico for definitivo, não pode encerrá-la unilateralmente: depende de `CANCELAMENTO_APROVADO`. |
| Qualificação concluída e recomendação emitida | `EM_QUALIFICACAO` → `AGUARDANDO_DECISAO` | A decisão material passa a aguardar o usuário autenticado responsável pela Necessidade. |
| Recomendação `NAO_ASSUMIR_COMPROMISSO` | `EM_QUALIFICACAO` → `AGUARDANDO_DECISAO` | A recomendação não cancela a Necessidade. Havendo informação, condição ou mudança que justifique nova análise, o processo pode retornar à formação ou à qualificação conforme a causa concreta. |
| Decisão humana `APROVADO` | `AGUARDANDO_DECISAO` → criação do Projeto → `EM_PROJETO` | A criação do Projeto correspondente é obrigatória. |
| Projeto concluído com sucesso | `EM_PROJETO` → `ATENDIDA` | O sucesso do Projeto 1:1 encerra com sucesso a Necessidade. |
| Decisão humana `CANCELAMENTO_APROVADO`, antes do atendimento | status não terminal → `CANCELADA` | Encerramento excepcional; uma Necessidade cancelada não é atendida. |

## Formação e qualificação

A formação segue o processo definido em [Formação e qualificação da Necessidade](03_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md). A conclusão `QUALIFICAVEL` é Resultado do Processo, não status. `NAO_CARACTERIZA_NECESSIDADE` também é Resultado do Processo e requer tratamento na formação ou decisão humana de cancelamento; não determina encerramento unilateral pelo agente. Da mesma forma, `ASSUMIR_COMPROMISSO` e `NAO_ASSUMIR_COMPROMISSO` são recomendações, não status. A recomendação negativa não cancela automaticamente a Necessidade.

## Decisão humana e relação com Projeto

`APROVADO` é uma decisão humana de compromisso e um Resultado do Processo, não um status. `CANCELAMENTO_APROVADO` também é uma decisão humana material e um Resultado do Processo, não um status. Nesta primeira versão, ambas as decisões somente podem ser realizadas pelo usuário autenticado responsável pela Necessidade, que é o usuário que a criou. O registro de cada decisão deve identificar, no mínimo, a decisão e o usuário autenticado que a realizou. Não há papéis, delegação ou matriz de permissões neste modelo.

O efeito de `APROVADO` é atômico no modelo: dispara a criação obrigatória de exatamente um Projeto para exatamente uma Necessidade.

```text
1 Necessidade com compromisso aprovado
→ 1 Projeto
```

Não existe estado permanente entre `APROVADO` e `EM_PROJETO`. Somente após a existência do Projeto correspondente a Necessidade assume formalmente `EM_PROJETO`. A Necessidade não replica os status internos de execução do Projeto.

Se a aprovação já ocorreu, mas o Projeto não puder ser criado porque a entidade Projeto ainda não está definida, isso é uma lacuna de implementação ou modelagem. Deve-se registrar a transição obrigatória ainda não materializada, sem criar status intermediário.

## Encerramento

O término bem-sucedido do Projeto encerra a Necessidade em `ATENDIDA`; não há auditoria final obrigatória da Necessidade neste momento. Antes disso, uma decisão material válida pode encerrá-la em `CANCELADA`. Regras futuras de auditoria de encerramento e melhoria contínua serão definidas quando necessárias.
