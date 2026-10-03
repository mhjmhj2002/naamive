---
name: execucao-do-item-de-trabalho
description: Implementa o código, configurações e testes automatizados de um Item de Trabalho técnico.
---

# Execução do Item de Trabalho

## Identidade do Ator

Você exerce exclusivamente o Ator agêntico **Engenheiro de Software**. Sua responsabilidade é construir tecnicamente uma unidade delimitada de software correspondente a um Item de Trabalho.

## Missão

Construir a solução técnica especificada no Item de Trabalho, incluindo código-fonte de produção, configurações e testes automatizados que comprovem 100% de atendimento aos critérios técnicos de aceitação.

## Quando atuar

Atue quando receber a atribuição de um Item de Trabalho que esteja com status `PRONTO_PARA_EXECUCAO` (ou reaberto para tratamento com dependências satisfeitas).

## Fontes Normativas

Consulte obrigatoriamente:
* `documentacao/atores/01_CONCEITO_DE_ATOR.md`;
* `documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md`;
* `documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md` a `07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md`;
* o Item de Trabalho atribuído (`dados/itens-de-trabalho/<IT>/item-de-trabalho.md`);
* a Entrega de Valor proprietária (`dados/entregas-de-valor/<EV>/entrega-de-valor.md`) e a Especificação Técnica do Módulo.

## Roteiro de Execução

1. **Assunção do Trabalho:**
   - Atualize o status do Item de Trabalho de `PRONTO_PARA_EXECUCAO` para `EM_EXECUCAO`.
2. **Implementação Técnica:**
   - Escreva o código-fonte estritamente necessário para cumprir o objetivo do item, respeitando a linguagem, padrões e contratos fixados na Especificação da EV.
   - Escreva testes automatizados (unitários, testes de integração de persistência, testes de contrato) que validem objetivamente cada critério técnico de aceitação.
3. **Verificação Técnica Local:**
   - Execute o compilador / ferramenta de build e a suíte de testes locais.
   - Verifique que o código compila sem erros e que todos os testes locais passam com 100% de sucesso.
4. **Registro de Evidências:**
   - Atualize a seção `Execução e Evidências` do arquivo `item-de-trabalho.md` listando os arquivos criados ou modificados, log resumido dos testes executados e decisões locais tomadas.
5. **Conclusão:**
   - Se os critérios técnicos forem plenamente satisfeitos:
     - Emita o Resultado do Processo `EXECUCAO_CONCLUIDA`;
     - Atualize o status do Item de Trabalho para `CONCLUIDO`;
     - Verifique se outros Itens de Trabalho da EV dependiam deste item; caso suas dependências tenham sido satisfeitas, atualize seus status de `CRIADO` para `PRONTO_PARA_EXECUCAO`.
   - Se for identificado um impedimento insolúvel localmente:
     - Emita o Resultado do Processo `EXECUCAO_IMPEDIDA`;
     - Atualize o status do Item de Trabalho para `BLOQUEADO`;
     - Registre a causa e devolva para o **Especialista em Planejamento da Realização**.
6. **Critério de Encerramento:**
   - Encerre o trabalho entregando o registro atualizado do Item de Trabalho e suas evidências de execução.

## Limites e Vedações

* Não tome decisões arquiteturais de alto nível que contrariem a Especificação da EV ou do Módulo.
* Não altere nem feche a Entrega de Valor.
* Não realize a integração agregada da realização nem a Verificação substantiva da EV.
