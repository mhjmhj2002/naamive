# DEB-TEC-001 — Ausência de Motor de Orquestração Autônoma de Agentes e Handoffs no Worker/Backend

## Ficha do Débito Técnico

| Campo | Valor |
| --- | --- |
| **Identificador** | `DEB-TEC-001` |
| **Título** | Ausência de motor de orquestração autônoma de agentes e handoffs no worker/backend |
| **Severidade** | `NAO_BLOQUEANTE` |
| **Natureza** | Débito Técnico (Arquitetura de Execução / Autonomia Agêntica) |
| **Origem / Competência de Tratamento** | Módulo `M-003 — Coordenação do Trabalho` / Infraestrutura de Worker e Orquestração |
| **Data de Registro** | 2026-10-04 |
| **Data de Resolução** | *Pendente* |
| **Status da Proposta** | **`ATIVO`** (Reconhecido pela Governança) |

---

## 1. Descrição do Desvio

Atualmente, o sistema NAAMIVE implementa em seu backend/worker uma arquitetura orientada a domínio (DDD) com persistência em PostgreSQL, filas de eventos e tarefas em background, além de serviços especializados de formação, coordenação, contexto e verificação.

Entretanto, observa-se uma dependência indevida de intervenção manual no chat/CLI a cada transição de Ator agêntico:
1. **Ausência de Despacho Autônomo de Handoffs:** Quando uma etapa agêntica é concluída (por exemplo, finalização de um Item de Trabalho ou emissão de laudo técnico de verificação), a passagem de bastão (handoff) para o próximo Ator agêntico não é acionada de forma autônoma pelo worker de backend.
2. **Dependência de Acionamento Manual:** O avanço entre papéis agênticos (ex.: Executor para Integrador, Integrador para Verificador, Delimitador para Formador) exige que um operador humano ou prompt externo invoque explicitamente o próximo agente via chat/CLI.
3. **Subutilização da Capacidade do Worker:** Embora o worker possua capacidade para processamento assíncrono de tarefas e verificação de regras de elegibilidade (como construído no módulo `M-003`), ele ainda não dispõe de um motor executivo de orquestração autônoma capaz de instanciar ou delegar a execução de subagentes com suas respectivas Skills operacionais de maneira contínua e autônoma.

---

## 2. Impacto e Riscos

* **Latência Operacional:** O ciclo de vida da demanda é interrompido a cada fronteira de Ator agêntico, aguardando intervenção externa no ambiente de chat ou terminal.
* **Sobrecarga Cognitiva do Operador:** Exige que a pessoa usuária/operador atue como "ponte humana" mecânica de acionamento entre agentes, papel que deveria ser delegado à infraestrutura autônoma de orquestração do sistema.
* **Não Bloqueante para o Valor Atual:** A condução do ciclo de vida e a integridade conceitual do NAAMIVE permanecem plenamente funcionais e rastreáveis, uma vez que as regras de governança, permissões e invariantes continuam sendo respeitadas em cada handoff, mesmo com despacho assistido.

---

## 3. Diretrizes para Tratamento e Resolução Futura

Para saneamento estrutural deste débito, os seguintes passos técnicos deverão ser concebidos e implementados em momento oportuno:

1. **Motor de Orquestração no Worker:** Desenvolver um despachante de agentes integrado ao loop de execução do worker (`src/backend/worker/`), capaz de ler handoffs elegíveis e invocar os Atores correspondentes com seus contextos canônicos.
2. **Automação de Transição Agêntica Segura:** Assegurar que apenas handoffs de Atores agênticos automatizados sejam orquestrados autonomamente, preservando rigorosamente os pontos de controle humanos soberanos (como o gateway de decisão e homologação do Owner).
3. **Logs e Rastreabilidade Causal:** Integrar cada ciclo autônomo de orquestração com a trilha de auditoria do `M-004`, garantindo explicabilidade e inspeção completa das ações disparadas automaticamente pelo motor.
