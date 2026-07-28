# Matriz de Garantia por Agente

Esta matriz valida os controles específicos adicionais de cada agente. Todos também obedecem ao [padrão de garantia](AGENT_ASSURANCE_STANDARD.md).

| Agente | Principal risco de desvio | Controle obrigatório | Verificação independente |
| --- | --- | --- | --- |
| `business-intake` | tratar solicitação ou texto não confiável como decisão | registrar fonte, fato versus premissa e dono de negócio | proprietário de negócio autoriza descoberta |
| `business-analysis` | inventar valor, consenso ou regra de negócio | rastreabilidade por stakeholder e conflito explícito | revisão independente da análise |
| `domain-modeling` | transformar tecnologia em fronteira de negócio | cada limite deve citar capacidade, regra e dependência | revisão de domínio e requisitos |
| `requirements-engineering` | requisito ambíguo ou sem critério verificável | origem, critério de aceitação e lacuna obrigatórios | revisão independente antes de baseline |
| `solution-architecture` | decisão tecnológica não autorizada ou viés de fornecedor | alternativas, trade-offs, risco e impacto operacional | revisão arquitetural; humano só para decisão material |
| `delivery-planning` | ocultar dependência ou produzir plano irreal | dependência, capacidade, risco e critério de pronto explícitos | revisão independente e critérios automatizados |
| `implementation` | escrita fora do escopo, dependência insegura ou alteração não testada | caminhos restritos, proveniência de dependência, testes e diff | qualidade, segurança e integração conforme risco |
| `integration-engineering` | violar contrato, cruzar propriedade ou expor dados | contrato versionado, compatibilidade e escopo provedor/consumidor | testes de contrato e revisão independente |
| `quality-assurance` | validar a própria implementação ou evidência insuficiente | acesso de avaliação separado, teste reproduzível e resultado imutável | governança verifica independência e cobertura |
| `security-assurance` | exceder escopo ao investigar ou aceitar risco | ambiente autorizado, evidência segura, sem segredos e sem exploração externa | autoridade humana aceita risco residual |
| `release-operations` | executar ação de produção indevida ou sem reversão | autorização, plano de reversão, prontidão operacional e registro | gate de release e aceite de negócio aplicáveis |
| `governance-assurance` | autoaprovação ou alteração da evidência fiscalizada | acesso predominantemente de leitura e trilha inviolável | autoridade humana decide exceções e conflitos |

Uma execução que não satisfaça sua linha de controle deve terminar em `REJECTED`, `REWORK_REQUIRED` ou `PAUSED`, sem alteração do estado do projeto ou módulo.
