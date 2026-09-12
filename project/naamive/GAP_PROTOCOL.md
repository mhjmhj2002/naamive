# GAP Protocol

Quando algo do processo parecer impossível, contraditório, ausente ou ruim de
usar, não improvisar silenciosamente.

Abrir um Finding em:

```text
project/naamive/projects/PRJ-001-naamive-mvp/findings/
```

Campos mínimos:

```text
Finding ID
detected_at
detected_during
scope
severity
evidence
rule/model involved
why current rule cannot be followed safely
affected work
temporary stop boundary
proposed resolution path
status
```

Severidade canônica:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

Regra de continuidade:

```text
gap resolvido e validado
→ registrar resolução
→ reavaliar work afetado
→ só então continuar
```
