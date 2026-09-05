---
task: MIG-FIX-01
status: DONE
implementation_completed_at: 2026-08-24
title: Compatibilidade da cadeia fresh do gate catalog 049/051
---

# MIG-FIX-01 — Compatibilidade fresh 049/051

## Problema e causa histórica

O runner controla somente o filename em `schema_migrations`; ele não calcula
nem compara hash do arquivo SQL. A colisão é de dados publicados. A migration
049 atual já acrescenta `consequence` e `continuation` a todas as decisões e
publica v1. A migration 051 aplica a mesma transformação com `coalesce` e tenta
publicar v2. Em database vazia, os dois catálogos são byte a byte iguais e têm
o hash `732b7a49823abed5e1d512686e72c02a47ce0fa375125f1bcfa2cabf4ffadca7`,
mas a constraint histórica `UNIQUE(content_hash)` de 049 bloqueava v2.

Ambientes rolling aplicados preservam o estado anterior: v1 pode ter o hash
`c09ea65d49667f0bafca5cefe0f2298dff249856f2cd7ffc1b34f9a38167e9ad`
e v2 o hash completo `732b…`. Os arquivos históricos foram preservados. Seus
SHA-256 no baseline são:

- 049: `2800e76d98b5361ff4db1de284d125b1735c790af95d687bce6007cbf7b747ef`;
- 051: `67ad78a8d9c8c55d7e5f6f029bd89da2ef098fb243ec29ed7e06266aeda1237f`.

## Estratégia de compatibilidade

Antes de executar somente `051_phase_6_5_gate_catalog_v2.sql`, o runner prova
simultaneamente: 049 e 050 aplicadas, 051 ausente, v2 ausente, constraint legada
presente, v1 íntegra com o hash completo conhecido e transformação de 051
estritamente no-op. Apenas nesse estado certificado ele remove a unicidade
cross-version. A migration 051 então executa sem alteração e é registrada pelo
fluxo normal. Estado desconhecido falha fechado; não há skip, marker, fake
apply ou bypass global.

A migration aditiva `066_phase_6_5_gate_catalog_hash_compatibility.sql` aplica
o mesmo modelo aos upgrades já existentes: `version` continua sendo a chave da
publicação imutável, enquanto `content_hash` é uma identidade de conteúdo
indexada e pode se repetir entre versões semanticamente idênticas.

## Evidência de validação

- upgrade real com 049/051 já aplicadas: somente 066 avançou; v1/v2 e seus
  hashes permaneceram intactos;
- fresh vazio: 66 migrations aplicadas, v1 e v2 publicadas com o hash completo;
- segundo migrate no fresh: permaneceu em 66 migrations e conservou o mesmo
  `last_applied`;
- testes unitários provam que a exceção só muta o estado certificado e falha
  fechada para hash desconhecido ou transformação diferente;
- migrations 049 e 051 não foram editadas ou renomeadas.
