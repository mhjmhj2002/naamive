# NB-0002 R2-17 — Apply Instructions

Este pacote representa a ratificação humana aprovada de `NB-0002`.

## Aplicar

Copiar o conteúdo de:

```text
ratified/
```

para a raiz do repositório, preservando os caminhos.

Isso substitui os documentos candidatos pelos mesmos documentos com metadata:

```text
RATIFIED / IN FORCE
```

e instala o certificado final:

```text
governance/normative-baselines/NB-0002.md
```

Adicionar também:

```text
audits/AUD-013_NB0002_HUMAN_RATIFICATION_RECORD.md
NB0002_RATIFIED_MEMBERSHIP.md
```

## Não fazer

```text
não editar NB-0001
não migrar instâncias automaticamente
não alterar semântica dos 71 membros durante este apply
não chamar Technology Baseline de IN FORCE
```

## Commit sugerido

```text
docs(governance): ratify normative baseline NB-0002
```

Após commit/push, validar o commit publicado e então atualizar
`PROJECT_CONTINUITY.md` para apontar o novo checkpoint.
