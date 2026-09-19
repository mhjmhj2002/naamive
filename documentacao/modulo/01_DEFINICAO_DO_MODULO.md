# Definição do Módulo

## Conceito

**Módulo é uma unidade coesa de capacidade da solução, pertencente a exatamente um Projeto, dentro da qual podem ser realizadas uma ou mais futuras Entregas de Valor relacionadas.**

O Módulo recebe a **Direção do Projeto** como referência de origem. Ele concentra uma responsabilidade compreensível, com fronteiras explícitas e razão funcional ou de valor para existir. A sua coesão é definida pela capacidade que habilita, e não pelo número de futuras Entregas de Valor nem pela tecnologia empregada.

Um Módulo pode atravessar interface, API, regras de domínio, persistência, integrações, processamento e eventos quando esses elementos participarem da mesma capacidade coesa. Ele não deve ser delimitado automaticamente por camada técnica.

## O que Módulo não é

Módulo não é backend, frontend, banco de dados, API, microserviço, repositório, pasta, tabela, componente técnico isolado, equipe, sprint, Entrega de Valor, Item de Trabalho ou tarefa. Esses elementos podem existir dentro ou ao redor de um Módulo, mas não definem o conceito.

## Relação com Projeto e futura Entrega de Valor

```text
1 Projeto
→ possui
→ N Módulos

1 Módulo
→ pode comportar
→ 1 ou N futuras Entregas de Valor relacionadas
```

Cada Módulo pertence a exatamente um Projeto. Um Projeto pode possuir tantos Módulos quanto sua capacidade exigir; não há teto normativo.

Uma única futura Entrega de Valor pode justificar um Módulo quando sua capacidade tiver fronteira própria. Porém, uma relação sistemática de 1 Módulo para 1 futura Entrega de Valor é sinal de possível fragmentação excessiva e deve motivar análise. A quantidade de futuras Entregas de Valor não define a existência do Módulo.

Esta vertical não define Entrega de Valor, seu modelo, ciclo, status, Atores, Skills ou decomposição interna. A vertical posterior que a consumir permanece não modelada.

## Delimitação

A pergunta principal é:

> Existe aqui uma capacidade ou responsabilidade suficientemente coesa para justificar uma fronteira própria e dentro da qual façam sentido futuras Entregas de Valor relacionadas?

A resposta deve considerar responsabilidade, coesão, fronteira, relação com a Direção do Projeto, valor ou capacidade habilitada, dependências, sobreposições, lacunas entre Módulos e granularidade excessiva.

O resultado dessa análise é preservado no **Mapa de Módulos do Projeto**, seção canônica do registro do Projeto. O Mapa não é nova entidade, status nem Resultado do Processo: ele mantém a evidência de que o conjunto de Módulos foi escolhido de modo deliberado e permite revisar a delimitação sem perder sua justificativa de origem.

## Heurística de qualidade 10 / 15 / 20

Esta é a fonte central da heurística de modularização. Ela é política de qualidade, não invariante de domínio nem limite máximo de Módulos por Projeto. É candidata a parametrização futura, sem configuração técnica nesta versão.

| Referência | Significado e tratamento |
| --- | --- |
| Aproximadamente `10` | Referência central de Projeto saudável, não objetivo obrigatório. Favorece visão compreensível das principais capacidades. |
| `15` ou mais | Limiar de atenção. Deve provocar revisão da modularização: há fragmentação excessiva, Módulos pequenos demais, praticamente um Módulo por futura Entrega de Valor ou capacidades que deveriam estar agrupadas? |
| `20` ou mais | Limiar de revisão estrutural forte. Além das perguntas anteriores, verificar se o Projeto ainda representa um único compromisso coeso ou se há mais de uma Necessidade ou Projeto escondido. |

Ultrapassar `15` ou `20` não reprova automaticamente a delimitação. A revisão produz análise e justificativa proporcional para casos legítimos fora da curva; não cria barreira matemática.

## Artefato de saída

A saída aprovada da vertical é a **Especificação Técnica do Módulo**. Ela consolida, no registro do Módulo, a origem no Projeto e sua Direção, capacidade, responsabilidade, fronteiras, valor habilitado, dependências, decisões e desenho técnico proporcionais, contratos, dados, integrações, fluxos, segurança, riscos e classificações entre conhecido, inferido, proposto e desconhecido legítimo.

Seu núcleo invariável contém, no mínimo:

* identificação do Módulo, do Projeto de origem, da Direção consumida e do item correspondente no Mapa de Módulos;
* capacidade, responsabilidade, valor habilitado e fronteiras — o que está dentro e fora;
* evidências que sustentam as afirmações materiais e sua classificação entre conhecido, inferido, proposto e desconhecido;
* relações, dependências, sobreposições e lacunas relevantes com outros Módulos;
* direção de realização e decisões técnicas necessárias, ou o registro explícito de que determinado aspecto técnico não se aplica ou permanece desconhecido; e
* riscos, restrições, lacunas legítimas e decisões pendentes relevantes.

Contratos, dados, integrações, diagramas, fluxos, segurança, persistência, concorrência, observabilidade e demais detalhamentos continuam condicionais: entram quando necessários para tornar a capacidade realizável e auditável, nunca por ritual.

Ela não é nova entidade, status, Resultado do Processo, decisão humana nem arquivo obrigatoriamente separado. Pode ser uma seção do `modulo.md` e referenciar artefatos técnicos auxiliares quando existirem.
