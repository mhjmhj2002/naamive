---
document_type: product-north-star
status: DRAFT_FOR_BRAINSTORM
created_at: 2026-07-30
scope: Node.js/TypeScript orchestration platform and responsive operator web application
related_baseline: ../ORCHESTRATION_END_TO_END_AUDIT_GAPS_BACKLOG.md
---

# Plataforma de Orquestração Web — Necessidade Ponta a Ponta

## Propósito deste documento

Este é o radar do produto. Ele preserva a necessidade, os limites e os
resultados esperados enquanto a implementação evolui. Não autoriza mudanças
por si só; decisões técnicas ou de prioridade continuam sujeitas à revisão
humana.

## Problema

O runtime atual comprovou que consegue conduzir a orquestração e manter uma
trilha auditável. Porém, sua superfície operacional é uma CLI síncrona em
Python. Durante despachos longos, o operador não vê progresso ao vivo; para
acompanhar precisa esperar o comando terminar e consultar arquivos ou uma
timeline depois do fato. Aprovações, feedbacks e evidências também exigem
conhecimento de comandos, caminhos e gates internos.

Isso não atende ao produto pretendido: uma pessoa operadora deve conduzir um
projeto inteiro — criação, definição da necessidade, acompanhamento,
aprovações, retrabalho e entrega — por uma interface responsiva e governada.

## Resultado de negócio esperado

O único operador configurado para a instalação consegue, no navegador:

1. criar e identificar um projeto;
2. preencher e validar a necessidade do produto em um formulário guiado;
3. submeter a necessidade e iniciar ou continuar a orquestração;
4. acompanhar, ao vivo, o estado, as execuções, a duração e as evidências;
5. examinar evidências e decidir gates com justificativa ou feedback estruturado;
6. retomar o fluxo até a entrega, sem operar estados internos ou comandos de módulo;
7. consultar depois uma auditoria completa, cronológica e explicável.

O aceite ponta a ponta será um projeto de referência definido quando o primeiro
release operacional estiver aprovado, criado integralmente pelo fluxo autorizado
e contendo aplicação, testes automatizados e instruções de uso.

## Visão de solução proposta

```text
Navegador responsivo
        │ REST + SSE
API Node.js / TypeScript
        │ aceita comandos e serve consultas
Máquina de estados e registro de eventos
        │ publica trabalho elegível
Orquestrador reativo + fila + agentes Node.js / TypeScript
        │ despacham trabalho e adaptador Codex, sem espera síncrona
Registro auditável + evidências versionadas ── Projeção operacional PostgreSQL
```

- A API aceita comandos de negócio e responde rapidamente com uma operação ou
  execução identificável; não bloqueia a requisição HTTP esperando o Codex.
- A máquina de estados é a fonte de verdade: valida transições, registra
  evidências, abre gates e determina qual trabalho está elegível em seguida.
- O orquestrador é reativo e stateless: recebe um comando ou evento, registra
  ou despacha o trabalho elegível e encerra sua ação. Ele não aguarda a resposta
  de agentes e não contém a lógica de sequência do processo.
- Agentes executam de forma independente e submetem evidência com uma
  solicitação de transição. A máquina, e não o agente, autoriza a atualização
  canônica do estado e publica o próximo evento.
- A fila entrega comandos e eventos entre componentes; consumidores acionados
  pela mudança de estado despacham o próximo agente ou param no gate.
- SSE entrega ao navegador a linha do tempo viva de um projeto; WebSocket só é
  considerado se houver uma necessidade real de comunicação bidirecional em tempo real.
- Markdown/YAML permanecem a evidência auditável e legível; PostgreSQL é a
  projeção consultável para telas, filtros, busca e stream de eventos.
- O adaptador Codex é encapsulado em Node, com timeout, correlação de IDs,
  sanitização e eventos de ciclo de vida. Tokens, prompts completos e saída
  bruta não entram na trilha de auditoria.

## Persistência e resiliência do MVP

PostgreSQL é obrigatório tanto no desenvolvimento manual quanto em HML. Ele é
a fonte operacional de verdade para máquina de estados, eventos, operações,
gates, outbox, locks, idempotência e projeções de tela. Evidências, código e
artefatos continuam fora do banco; o banco guarda referências, hashes e
metadados para encontrá-los e validá-los rapidamente.

No desenvolvimento, o PostgreSQL roda em Docker com volume persistente (ou
diretório local montado). Reiniciar container, Docker ou máquina não deve
apagar dados. Remover volume, resetar schema ou aplicar migration destrutiva é
uma ação administrativa explícita, protegida por backup.

O MVP terá backup e restore simples do banco local, com dump automático antes
de migrations potencialmente destrutivas. Testes unitários podem usar memória
ou fakes; testes de integração e ponta a ponta usam PostgreSQL efêmero. SQLite
em arquivo e H2 não serão usados como substitutos do PostgreSQL no fluxo normal.

Reconstrução automática do banco a partir de um ledger de arquivos não faz parte
do MVP. Ela é uma evolução futura, caso backup/restore e volumes persistentes
não atendam à necessidade de resiliência observada.

## Fila e despacho assíncrono do MVP

A fila é implementada no PostgreSQL, sem Redis ou broker dedicado no MVP. Cada
transição aceita grava, na mesma transação, o novo estado, evento auditável e
job/outbox do próximo trabalho elegível. Assim, uma queda entre a transição e o
despacho não perde o trabalho.

Jobs possuem estado, tentativa, agendamento, chave de idempotência e lease. Um
lock global garante que apenas um agente execute na plataforma por vez. O worker
recupera jobs vencidos ou pendentes após restart. Polling curto pode iniciar o
MVP; `LISTEN/NOTIFY` do PostgreSQL pode ser usado depois apenas como sinal para
reduzir polling, nunca como garantia de entrega.

Redis ou broker dedicado só serão considerados com demanda comprovada por
paralelismo, múltiplos workers, alto volume de retries/agendamentos ou
integrações externas. Mesmo nesse caso, o outbox transacional no PostgreSQL
continua protegendo a consistência da máquina de estados.

## Repositório de saída e integração com GitHub

A NAAMIVE não cria projetos dentro do seu próprio repositório e não provisiona
repositórios no GitHub. O operador cria o repositório remoto, faz o clone na
máquina local e informa o caminho absoluto desse clone na tela de criação. Esse
repositório externo recebe código, testes, documentação, commits e PRs.

Na vinculação, a plataforma valida raiz local permitida, existência do caminho,
Git, `origin`, branch-base, SHA inicial e árvore limpa — ou exige confirmação
explícita para alterações existentes. A auditoria da NAAMIVE registra caminho,
URL remota, branch, SHAs e hashes que conectam operação e evidência ao produto.

O MVP usa a autenticação Git/GitHub já configurada no ambiente atestado somente
para criar branches, commits, push e pull requests nesse repositório. Não cria
ou exclui repositórios remotos, nem administra organizações.

## Execução sequencial e estratégia de branches

O MVP executa no máximo um agente por vez na plataforma inteira. A máquina só
torna o próximo agente elegível após a execução anterior concluir, pedir rework,
abrir gate, falhar, pausar ou ser interrompida. Work items são ordenados, não
paralelos. Um worktree isolado pode proteger o clone principal, sempre um por vez.

Cada projeto usa uma branch de integração e branches de fase:

```text
main
  └── naamive/projects/<project-id>/integration
        ├── naamive/projects/<project-id>/phases/01-definition
        ├── naamive/projects/<project-id>/phases/02-architecture
        └── naamive/projects/<project-id>/phases/03-implementation
```

Os nomes evitam uma branch que seja prefixo literal das outras, limitação do
namespace de refs Git. A fase nasce da `integration` atual; Dev, QA e correções
trabalham sequencialmente na mesma branch. Após QA e máquina aprovarem, a
plataforma integra fase → `integration`, faz push e registra SHAs/evidências.
A próxima fase só então começa.

A NAAMIVE nunca altera ou faz merge automático em `main` no MVP. Um único PR
draft de `integration` para `main` é atualizado durante o projeto; o merge final
no GitHub é sempre humano.

## Estados internos e status de jornada

A máquina de estados mantém todos os estados e eventos técnicos necessários
para governança, despacho, recuperação e auditoria. A web não os exibe como
status principais. Cada estado interno possui um tipo de visibilidade e é
mapeado, no backend, para um status de jornada estável e compreensível.

```text
estado interno + evento técnico
        ↓ projeção controlada pela máquina
status de jornada + marco + próxima ação
```

O catálogo de tipos e status fica no PostgreSQL. A máquina registra o estado
interno e produz projeções consultando mapeamentos versionados no banco. O
cliente web consome a projeção; ele não implementa nem infere o mapeamento.

O modelo inclui, no mínimo:

| Elemento | Responsabilidade |
| --- | --- |
| `status_types` | Agrupa vocabulários, por exemplo `OPERATOR_JOURNEY`, `INCIDENT_RESPONSE` e `TECHNICAL`. |
| `status_definitions` | Define código estável, rótulo, descrição, categoria, ordem, visibilidade e se o status é terminal. |
| `status_audiences` | Define o público do status, inicialmente apenas `OPERATOR`; no futuro pode incluir `INCIDENT_RESPONDER` e administração. |
| `state_status_mappings` | Mapeia estado interno e evento para um status por tipo/público. |
| Projeção do projeto | Persiste `internal_state`, `status_code`, `status_type`, `status_version`, `milestone` e `next_action`. |

Isso permite que um resolvedor de incidentes veja os status normais da jornada e
outros relevantes para investigação, sem poluir a experiência do operador.
Status e mapeamentos são inseridos por migrations/configuração controlada e
versionada; não podem alterar por si só as transições autorizadas da máquina de
estados. Cada evento preserva o código e a versão de status aplicados, para que
histórico e auditoria não mudem de significado depois.

O vocabulário inicial de jornada é limitado a:

| Status visível | Uso para o operador |
| --- | --- |
| Rascunho | Falta preencher ou submeter. |
| Em preparação | A necessidade está sendo validada ou iniciada. |
| Em andamento | A plataforma executa trabalho autorizado. |
| Em revisão | Uma entrega está em verificação. |
| Aguardando sua decisão | Existe gate humano pendente. |
| Ajustes necessários | Há finding ou rework a tratar. |
| Pausado | O fluxo foi parado deliberadamente. |
| Atenção necessária | Falha, timeout ou condição que exige ação. |
| Pronto para entrega | Falta autorização ou aceite final. |
| Entregue | Projeto concluído. |

Os detalhes técnicos continuam auditáveis e podem ser consultados em drill-down
controlado. A timeline principal mostra somente marcos relevantes, como
“definição concluída”, “revisão encontrou ajustes” ou “aguardando sua decisão”.

## Progresso seguro de agentes

A UI do operador mostra somente status de jornada, marcos relevantes, duração
real, heartbeat do worker, evidências e commits validados, findings
estruturados, e falhas sanitizadas com próxima ação. Ela não mostra percentuais
artificiais de progresso.

Prompt completo, stdout/stderr bruto, raciocínio do Codex, chamadas de
ferramentas, tokens, segredos e dados de ambiente não são exibidos nem
persistidos como timeline de operador. Detalhe técnico auditável é acessível
somente por drill-down controlado e continua sujeito a sanitização.

## Migração e depreciação do runtime Python

O runtime Python atual entra em estado `DEPRECATED`. Ele permanece no
repositório somente durante a migração como fonte de regras, contratos, testes
e comportamento de referência. Não recebe novas funcionalidades de produto.

O runtime Node inicia com schema e contratos versionados próprios; não há
compromisso de manter um leitor operacional compatível com registros Python.
A migração é um corte controlado: a matriz de paridade usa o Python como
referência, o novo fluxo Node/Web é aceito ponta a ponta e o legado é então
arquivado/removido. Registros históricos necessários para consulta são
preservados como evidência de migração, fora do caminho operacional Node.

O corte só pode remover Python depois de confirmar que os controles relevantes,
testes de regressão, documentação e operações necessárias foram substituídos no
runtime Node. A remoção deve ser uma mudança explícita, revisada e rastreável.

## Princípios inegociáveis

- **Governança antes de automação:** somente trabalho autorizado por contexto,
  despacho e estado válido pode alcançar um agente.
- **Máquina de estados soberana:** ela é o único componente que autoriza uma
  transição e define elegibilidade do próximo trabalho; agentes não editam
  estado canônico diretamente.
- **Orquestração sem espera:** o retorno síncrono de um comando operacional é
  apenas `ACCEPTED` com `operation_id`; progresso e resultado chegam por eventos.
- **Sequência antes de paralelismo:** apenas um agente executa por vez no MVP;
  paralelismo só será considerado após isolamento e recuperação simultânea robustos.
- **Gates humanos explícitos:** decisões de escopo, risco e aceite nunca são
  inferidas pela interface.
- **Auditabilidade imutável:** cada comando, execução, evento, decisão e
  evidência deve possuir ID, tempo, responsável e referência canônica.
- **Observabilidade em tempo real:** o operador vê que um agente está em
  execução, em qual etapa, há quanto tempo e qual é a próxima ação.
- **Jornada acima da infraestrutura:** a interface mostra poucos status de
  negócio estáveis; eventos internos ficam na auditoria e no detalhe técnico.
- **Não expor topologia interna:** a interface fala em projetos, necessidades,
  módulos, evidências e decisões; não exige que o operador conheça transições internas.
- **Segurança por padrão:** autenticação, autorização, isolamento de execução,
  segredos fora de logs e validação de caminhos fazem parte do produto.
- **Migração sem regressão:** as garantias cobertas pelo backlog de auditoria
  existente devem ser preservadas ou fortalecidas no runtime Node.
- **Entrega incremental de valor:** cada fase termina com uma capacidade
  utilizável, demonstrável e verificável de ponta a ponta pelo operador na
  web; fundações técnicas só entram quando habilitam esse resultado na própria
  fase.

## Jornada do operador

| Momento | Experiência desejada | Resultado verificável |
| --- | --- | --- |
| Criar | Informa identificador, título e responsável. | Projeto em rascunho, auditado. |
| Definir | Preenche template com ajuda e validação. | Necessidade válida e pronta para submissão. |
| Executar | Aciona iniciar/continuar uma vez. | Operação assíncrona criada; UI recebe eventos vivos. |
| Observar | Vê timeline, fase, agente, duração, evidências e falhas. | Nenhum período opaco de espera. |
| Decidir | Lê proposta/evidências e aprova, rejeita ou pede retrabalho. | Decisão, autor e justificativa imutáveis. |
| Recuperar | Pausa, retoma e corrige achados pelo mesmo fluxo. | Retomada preserva estado e histórico. |
| Entregar | Consulta pacote, aplicação, testes e aceite. | Projeto entregue com rastreabilidade completa. |

## Ciclos entre agentes e retrabalho

Uma etapa concluída não significa aprovação. Cada handoff é um ciclo governado
por evidências e estado, e deve permanecer visível para o operador:

```text
Dev entrega evidência → máquina valida → QA elegível → QA revisa
                                      ↓ aprovado          ↓ reprovado
                                  próxima etapa       finding estruturado
                                                           ↓
                                            correção elegível para Dev
                                                           ↓
                                              nova evidência → nova QA
```

Um finding registra a evidência revisada, regra/teste falho, severidade,
impacto, responsável, tentativa de correção e critério de revalidação. A UI
deve agrupar tentativas e mostrar o encadeamento entrega → QA → correção →
revalidação. Política de transição define quais achados retornam
automaticamente ao trabalho elegível e quais exigem gate humano, como segurança,
mudança de escopo, arquitetura ou repetição acima do limite configurado.

## Escopo do primeiro release operacional

Inclui criação de projeto, formulário de intake, submissão, início/continuidade
assíncrona, tela de status, timeline por SSE, leitura de evidências, gates
`REGISTER_PROJECT` e `PRODUCT_COMMITMENT`, e a trilha de auditoria.

O MVP é de **operador único e mono-organização**. Não haverá multitenancy,
gestão de usuários, convite, troca de organização ou matriz de permissões no
primeiro release. A identidade configurada do operador ainda é gravada nas
decisões e na auditoria. Os contratos internos devem evitar acoplamento que
impeça uma evolução posterior para múltiplos usuários e organizações.

Ficam para incrementos seguintes: autenticação e gestão de múltiplos usuários
e organizações, notificações externas, dashboard multiportfólio, múltiplos provedores de IA,
colaboração simultânea em documentos e substituição imediata de todos os
artefatos históricos.

## Medidas de sucesso

- Um novo projeto chega ao primeiro gate sem CLI nem passos técnicos manuais.
- A tela recebe evento de início de despacho em poucos segundos e atualizações
  de vida enquanto o agente trabalha.
- Cada item exibido na UI aponta para evidência e evento canônicos.
- Toda decisão de gate é atribuída a uma identidade e contém justificativa ou
  feedback estruturado.
- O cenário de aceite alcança entrega com aplicação, testes e documentação.
- Falhas, timeout, pausa e rework são explicados pela UI e recuperáveis pelo fluxo governado.
- Uma reprovação de QA permite identificar a entrega revisada, o finding, a
  correção, a revalidação e o resultado de cada tentativa.

## Questões a decidir no brainstorm
