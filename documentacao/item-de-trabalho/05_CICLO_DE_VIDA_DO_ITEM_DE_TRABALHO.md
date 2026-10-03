# Ciclo de Vida do Item de Trabalho

## Finalidade

Este documento define o fluxo completo, os eventos, as transições e as regras de avanço e encerramento do **Item de Trabalho**, desde a sua materialização pelo Especialista em Planejamento da Realização até a sua conclusão técnica ou cancelamento.

## Princípios do Ciclo

1. **Subordinação Contínua:** O Item de Trabalho só existe enquanto subordinado a uma Entrega de Valor ativa (`EM_REALIZACAO` ou em transição a partir de `FORMADA`).
2. **Execução Especializada:** A execução técnica é conduzida exclusivamente pelo Ator **Engenheiro de Software**.
3. **Não Regressão de Status:** Conforme a governança transversal do NAAMIVE, problemas e descobertas técnicas são tratados progressivamente sem regressão artificial de status.
4. **Conclusão Baseada em Evidência:** Um Item de Trabalho só é considerado concluído quando houver evidências objetivas e demonstráveis de código, compilação e testes automatizados locais bem-sucedidos.
5. **Integração como Condição de Fechamento da Realização:** O término de todos os Itens de Trabalho da EV habilita a atuação do **Integrador da Realização** para validar o conjunto integrado de software.

## Fluxo de Referência do Item de Trabalho

```text
Materialização pelo Especialista em Planejamento
→ CRIADO
   ↓ (disponibilizado com dependências satisfeitas)
→ PRONTO_PARA_EXECUCAO
   ↓ (assumido pelo Engenheiro de Software)
→ EM_EXECUCAO
   ↓ (implementação e testes locais concluídos com sucesso)
→ CONCLUIDO
```

### Ramos Excepcionais

```text
EM_EXECUCAO
   ↓ (impedimento técnico ou dependência não resolvida)
   → BLOQUEADO (em tratamento pelo Planejamento da Realização ou Formação)

CRIADO / PRONTO_PARA_EXECUCAO / BLOQUEADO
   ↓ (decisão humana de cancelamento da EV ou replanejamento estrutural)
   → CANCELADO
```

---

## Fases do Ciclo de Vida

### 1. Criação e Materialização (`CRIADO`)
* **Evento:** O Especialista em Planejamento da Realização elabora o Plano de Realização da EV e cria o arquivo `dados/itens-de-trabalho/<IT>/item-de-trabalho.md`.
* **Condição:** O item possui escopo, dependências declaradas e critérios de aceitação definidos, mas ainda aguarda a satisfação de suas dependências ou alocação para execução.

### 2. Prontidão para Execução (`PRONTO_PARA_EXECUCAO`)
* **Evento:** As dependências prévias do item (outros Itens de Trabalho que deviam precedê-lo) foram concluídas com sucesso.
* **Condição:** O item está plenamente elegível para ser assumido por um Engenheiro de Software.

### 3. Execução Técnica (`EM_EXECUCAO`)
* **Evento:** Um Engenheiro de Software assume o item e inicia o trabalho de codificação, configuração e elaboração de testes automatizados.
* **Atividades:**
  - Criação ou alteração de código-fonte no repositório;
  - Criação ou alteração de testes automatizados locais;
  - Execução dos testes e verificação da estabilidade local.

### 4. Conclusão Técnica (`CONCLUIDO`)
* **Evento:** O Engenheiro de Software conclui a implementação, verifica a aprovação de 100% dos testes técnicos locais e emite o Resultado do Processo `EXECUCAO_CONCLUIDA`.
* **Condição:** As evidências (arquivos alterados, testes executados) estão registradas no arquivo do item. O item torna-se insumo estável para a etapa de integração da realização.

### 5. Bloqueio (`BLOQUEADO`)
* **Evento:** Durante a execução, o Engenheiro de Software identifica um impedimento intransponível localmente (falha em dependência externa, ambiguidade grave no contrato ou necessidade de decisão de alto nível).
* **Condição:** O Engenheiro emite `EXECUCAO_IMPEDIDA`, registra o motivo do bloqueio e aciona o Especialista em Planejamento da Realização para tratamento causal.

### 6. Cancelamento (`CANCELADO`)
* **Evento:** Cancelamento da Entrega de Valor proprietária (por decisão humana `CANCELAMENTO_APROVADO` do Owner) ou replanejamento que extinga a necessidade daquele item específico.

---

## Conexão com a Verificação da Entrega de Valor

O ciclo de vida do Item de Trabalho conecta-se diretamente com a vertical Entrega de Valor através do seguinte percurso:

```text
Todos os Itens de Trabalho da EV em CONCLUIDO
↓
Atuação do Integrador da Realização
↓
Execução da suíte integrada e build completo do sistema
↓
Resultado do Processo da Realização: REALIZACAO_INTEGRADA
↓
Handoff oficial para o Verificador da Entrega de Valor
↓
Verificação substantiva da evolução pelo Verificador da EV
↓
EVOLUCAO_MATERIALIZADA → Entrega de Valor passa a CONCLUIDA
```
