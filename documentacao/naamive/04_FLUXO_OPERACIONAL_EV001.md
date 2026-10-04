# Roteiro Operacional da EV-001 — Compromisso da Necessidade

Este documento descreve o fluxo passo a passo para o **Owner** inspecionar, operar e validar visualmente na interface web a primeira Entrega de Valor do sistema: **EV-001 — Compromisso da Necessidade**.

---

## 1. Contexto e Objetivo da EV-001

A **EV-001** materializa a jornada completa da vertical **Necessidade**:
1. Cadastrar uma Necessidade no status inicial `EM_FORMACAO`.
2. Registrar o parecer técnico do Auditor da Necessidade (`QUALIFICAVEL`).
3. Avançar para o status `EM_QUALIFICACAO`.
4. Registrar a recomendação do Especialista em Qualificação (`ASSUMIR_COMPROMISSO`).
5. Submeter para o status `AGUARDANDO_DECISAO`.
6. Registrar a **Decisão Material do Owner** com autoridade autenticada (`mhj`).
7. Consolidar formalmente o **Compromisso da Necessidade** e disponibilizar para o Módulo `M-002` (Projeto).

---

## 2. Acesso à Aplicação Web

1. Inicie a aplicação com:
   ```bash
   npm run build && npm start
   ```
2. Acesse no navegador:
   ```text
   http://localhost:3001/
   ```

---

## 3. Roteiro Passo a Passo de Inspeção e Uso

### Etapa 1: Visualização da Listagem Principal
- Na página inicial (`/`), você verá a tabela responsiva com o badge de status e os dados das Necessidades cadastradas.
- A **N-001** semeada no bootstrap estará listada com o status `EM_PROJETO` e badge informativo.
- Para inspecionar uma jornada do zero, clique no botão azul **"+ Nova Necessidade"**.

### Etapa 2: Cadastro de Nova Necessidade
- Preencha o formulário em `/nova`:
  - **Código:** ex: `N-002`
  - **Título:** ex: `Automatizar Verificação de Resultados de Software`
  - **Tipo:** Selecione `NOVO_PRODUTO` ou `EVOLUCAO_DE_PRODUTO`
  - **Problema ou Oportunidade:** Descreva o problema de negócio
  - **Quem é Afetado:** Indique os papéis impactados
  - **Resultado Pretendido:** Descreva a situação observável esperada
  - **Escopo Inicial e Fora de Escopo:** Defina as fronteiras da entrega
  - **Critério de Atendimento:** O teste prático para saber se foi atendida
  - **Por Que Isso Importa:** Justificativa de valor
  - **Origem:** De onde veio a demanda
- Clique em **"Cadastrar Necessidade"**. Você será redirecionado para a tela de detalhes. O status estará em **`EM_FORMACAO`**.

### Etapa 3: Auditoria da Necessidade (Ator: Auditor da Necessidade)
- Na tela de detalhes da Necessidade, na seção **"Ações do Ciclo de Vida"**, localize o painel **"Parecer de Auditoria"**.
- Selecione o resultado: `QUALIFICAVEL` (ou `AJUSTAR` / `FORA_DE_ESCOPO` caso queira testar rejeição).
- Clique em **"Registrar Parecer do Auditor"**.
- O evento será registrado no Histórico de Atividades e Resultados do Processo.

### Etapa 4: Avanço para Qualificação (Ator: Especialista em Formação)
- Com o parecer `QUALIFICAVEL` emitido, o botão **"Avançar para Qualificação"** ficará habilitado.
- Clique no botão para realizar a transição de ciclo de vida.
- O status da Necessidade mudará de `EM_FORMACAO` para **`EM_QUALIFICACAO`**.

### Etapa 5: Qualificação e Recomendação (Ator: Especialista em Qualificação)
- No painel da Qualificação, selecione a recomendação técnica: `ASSUMIR_COMPROMISSO` (ou `NAO_ASSUMIR_COMPROMISSO`).
- Clique em **"Registrar Recomendação"**.
- Em seguida, clique no botão **"Submeter à Decisão do Owner"**.
- O status da Necessidade transicionará para **`AGUARDANDO_DECISAO`**.

### Etapa 6: Decisão Material do Owner (Ator Humano: Owner)
- Na seção **"Decisão Material do Owner"**:
  - **Usuário do Owner:** Informe `mhj` (ou `owner`).
  - **Decisão:** Selecione `APROVADO`.
  - **Justificativa:** Informe a justificativa da decisão (ex: `Aprovado pelo Owner com base no valor de negócio`).
- Clique em **"Confirmar Decisão Material"**.

> [!NOTE]
> Se um usuário não autorizado for informado (ex: `fulano`), o sistema bloqueará a operação com erro de autoridade (HTTP 403 / *AutoridadeInvalidaErro*), protegendo a soberania do Owner.

### Etapa 7: Visualização do Compromisso da Necessidade Consolidado
- Ao registrar `APROVADO`, o **Serviço de Compromisso da Necessidade** é acionado instantaneamente.
- Um cartão verde de destaque surge na página exibindo a tabela com o **Compromisso Consolidado da Necessidade**:
  - Problema assumido
  - Resultado pretendido
  - Escopo assumido e Fora de escopo
  - Critério de atendimento observável
  - Restrições preservadas
  - Usuário aprovador (`mhj`) e data/hora do compromisso
- Em segundo plano, o **Worker** processa a tarefa enfileirada e integra com o Módulo `M-002`, materializando o Projeto 1:1 e transicionando a Necessidade para **`EM_PROJETO`**.

### Etapa 8: Rastreabilidade na Linha do Tempo
- No rodapé da tela de detalhes, inspecione a linha do tempo (timeline) completa:
  - Registro inicial da Necessidade
  - Emissão de pareceres técnicos
  - Transições formais de status
  - Decisão material assinada pelo Owner
  - Consolidação do Compromisso e vinculação com o Projeto
