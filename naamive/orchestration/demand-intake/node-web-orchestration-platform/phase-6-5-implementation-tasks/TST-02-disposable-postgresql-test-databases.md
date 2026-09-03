---
task: TST-02
status: TO_DO
title: Isolar testes PostgreSQL do banco runtime e exigir bancos descartáveis
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-02
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# TST-02 — Isolar testes PostgreSQL do banco runtime e exigir bancos descartáveis

## Classificação

**P1 — testes automatizados contaminaram o banco utilizado pelo runtime/manual E2E.**

Durante a validação manual pós-F6.5 foram encontrados no banco `naamive` projetos,
jobs, operations e demais registros produzidos por testes automatizados, incluindo
fixtures `LR-02 ...`.

Um desses jobs de teste foi posteriormente capturado pelo worker manual e chegou
a executar o Codex real repetidamente.

Essa mistura entre:

```text
banco do runtime/manual
```

e:

```text
banco de testes automatizados
```

não pode continuar possível.

Antes de implementar, ler e cumprir:

```text
/AGENTS.md

naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
```

Também inspecionar:

```text
naamive/runtime/node-web/package.json
naamive/runtime/node-web/scripts/run-tests.mjs
naamive/runtime/node-web/scripts/run-e2e.mjs
naamive/runtime/node-web/src/*.test.ts
naamive/runtime/node-web/src/*.e2e.test.ts
naamive/runtime/node-web/src/db.ts
naamive/runtime/node-web/src/config.ts
naamive/runtime/node-web/migrations/
```

e qualquer helper atual de criação/limpeza de banco de teste.

---

# 1. Problema observado

O banco local utilizado para o runtime/manual E2E:

```text
naamive
```

recebeu dados de testes automatizados.

Foram encontrados projetos como:

```text
LR-02 global reconciliation
LR-02 scoped reconciliation
LR-02 legacy
LR-02 discovery
LR-02 materialization first
LR-02 succession first
LR-02 mixed delta
```

junto com o projeto manual:

```text
Controle Financeiro Familiar
```

Isso gerou contaminação funcional do laboratório manual.

Posteriormente o worker manual capturou um job proveniente desse histórico de
testes:

```text
kind = ANALYZE_PRODUCT_NEED
attempts = 9
```

e invocou o agente real.

Portanto, a falha não é apenas estética ou de limpeza:

- altera o estado observado pela UI;
- interfere no manual E2E;
- pode disparar worker sobre fixtures;
- pode consumir execução real de agente;
- pode mascarar ou criar falsos bugs;
- torna o banco local não determinístico.

---

# 2. Objetivo

Depois desta task:

```text
NENHUM teste automatizado PostgreSQL
```

pode executar contra o banco runtime/manual `naamive`.

Os testes devem utilizar exclusivamente bancos descartáveis e isolados.

A proteção deve existir no código/ferramenta.

Não confiar apenas em disciplina humana ou documentação.

---

# 3. Modelo desejado

## Runtime/manual

Banco persistente local:

```text
naamive
```

Esse banco é reservado para:

- execução manual da aplicação;
- worker manual;
- smoke manual;
- manual E2E;
- inspeção humana.

Testes automatizados não podem escrever nele.

---

## Testes

Cada execução automatizada que usa PostgreSQL deve trabalhar em banco descartável
próprio, por exemplo:

```text
naamive_test_<id>
naamive_e2e_<id>
naamive_fix_<id>
```

O identificador deve evitar colisão entre execuções concorrentes.

Exemplos aceitáveis:

```text
naamive_test_20260902_123456_ab12
naamive_e2e_7f8d3c
```

Não depender apenas de timestamp se houver risco de colisão.

---

# 4. Guard técnico obrigatório

Criar uma verificação central reutilizável para execução de testes PostgreSQL.

Antes de qualquer teste que possa escrever no banco, validar o banco conectado.

No mínimo, deve ser impossível prosseguir quando:

```text
current_database() = 'naamive'
```

ou quando a URL apontar explicitamente para o banco runtime reservado.

A execução deve abortar imediatamente com erro claro, por exemplo:

```text
TEST_DATABASE_SAFETY_GUARD

Refusing to run automated tests against runtime database "naamive".
Use a disposable test database.
```

Essa proteção deve ocorrer ANTES da criação de fixtures.

Não considerar suficiente:

- comentário;
- README;
- variável opcional que possa ser esquecida;
- convenção informal;
- cleanup posterior.

O mecanismo deve ser fail-closed.

---

# 5. Não permitir bypass acidental

Evitar solução equivalente a:

```text
NAAMIVE_ALLOW_TESTS_ON_RUNTIME_DB=true
```

como comportamento normal.

Se algum bypass administrativo realmente for indispensável para manutenção, ele
deve:

- não ser usado pelos runners;
- exigir ação explícita extraordinária;
- estar ausente do fluxo normal;
- estar documentado como perigoso.

Preferência: não criar bypass.

---

# 6. Provisionamento automático de banco descartável

Os comandos normais:

```text
npm test
npm run e2e
```

devem conseguir executar com banco isolado sem o desenvolvedor precisar montar
manualmente uma sequência de `createdb`, migration e `dropdb`.

Implementar runner/helper que:

```text
1. resolve conexão administrativa segura
2. cria banco único descartável
3. monta DATABASE_URL apontando para esse banco
4. executa migrations
5. executa a suíte
6. encerra conexões
7. remove o banco descartável ao final
```

O cleanup deve ocorrer também quando:

- teste falha;
- processo retorna status diferente de zero;
- uma suíte aborta;
- ocorre exceção no runner.

Utilizar `try/finally` ou mecanismo equivalente.

---

# 7. Preservação de evidência em falha

O cleanup automático não deve eliminar a capacidade de diagnosticar falhas.

Se necessário, permitir opção explícita de desenvolvimento como:

```text
NAAMIVE_KEEP_TEST_DATABASE=1
```

para manter SOMENTE o banco descartável recém-criado.

Essa opção:

- nunca pode converter `naamive` em banco de teste;
- deve imprimir o nome do banco preservado;
- deve permanecer opt-in;
- não deve ser padrão de CI.

---

# 8. Banco administrativo

Não assumir silenciosamente que o banco alvo da aplicação pode ser usado para
emitir `CREATE DATABASE`.

Investigar a configuração atual.

Uma abordagem esperada é derivar da `DATABASE_URL` os mesmos:

```text
host
port
username
password
```

e conectar inicialmente a um banco administrativo apropriado, por exemplo:

```text
postgres
```

antes de criar o banco descartável.

Se o ambiente CI utilizar estratégia diferente, preservar compatibilidade.

Não hardcodar senha ou segredo.

---

# 9. Migrations

Todo banco descartável deve receber o mesmo conjunto de migrations necessário
para uma instalação real.

Não reutilizar schema parcialmente preparado do banco runtime.

Fluxo esperado:

```text
create database
→ migrate
→ test
→ drop database
```

A suíte deve começar de estado determinístico.

---

# 10. Execuções individuais de teste

A proteção não pode existir apenas em:

```text
npm test
npm run e2e
```

porque desenvolvedores/agentes também executam diretamente comandos como:

```text
node --test dist/algum.e2e.test.js
```

ou equivalentes.

Criar helper/guard reutilizável que os testes PostgreSQL possam importar ou que
seja aplicado por bootstrap comum.

Objetivo:

```text
mesmo execução direta
→ recusa banco runtime
```

Mapear os testes que realmente acessam PostgreSQL e aplicar a proteção de maneira
centralizada, evitando edição manual frágil de dezenas de arquivos se houver
solução arquitetural melhor.

---

# 11. Compatibilidade com testes sem PostgreSQL

Testes unitários que não dependem de banco não devem precisar provisionar
PostgreSQL desnecessariamente.

Separar corretamente:

```text
unit tests sem DB
```

de:

```text
integration/E2E com DB
```

se isso já fizer parte da arquitetura atual.

Não transformar toda execução trivial em dependência obrigatória de PostgreSQL
sem necessidade.

---

# 12. Concorrência

Dois processos de teste executados simultaneamente não podem compartilhar banco.

Cada execução deve utilizar nome exclusivo.

Não usar banco global fixo:

```text
naamive_test
```

para todas as execuções se isso permitir interferência entre runners.

---

# 13. Worker e agentes

Banco descartável de teste não deve ser processado pelo worker manual ligado ao
runtime `naamive`.

A task deve revisar se há algum mecanismo atual capaz de fazer worker manual
apontar acidentalmente para banco descartável.

Não alterar o contrato funcional do worker sem necessidade.

Não iniciar Codex/DeepSeek real durante testes que deveriam usar adaptadores
controlados/fixtures.

Preservar as garantias existentes dos runners E2E sobre agente controlado.

---

# 14. AGENTS.md

Adicionar regra permanente e curta ao `/AGENTS.md`.

A regra deve estabelecer:

```text
- Automated PostgreSQL tests MUST use disposable isolated databases.
- The runtime/manual database `naamive` MUST NEVER be used by automated tests.
- Do not point DATABASE_URL for a test at the runtime database.
- Use the repository test runner/helper.
- Never solve a failing test by deleting/resetting the runtime/manual database.
```

Usar a linguagem/padrão já adotado no AGENTS.md.

Não reescrever o arquivo inteiro.

---

# 15. Scripts/package.json

Revisar os scripts existentes.

Objetivo de UX:

```bash
npm test
```

deve ser seguro por padrão.

E:

```bash
npm run e2e
```

também.

O desenvolvedor não deve precisar lembrar:

```bash
export TEST_DB=...
createdb ...
npm run migrate ...
DATABASE_URL=...
```

para obter isolamento básico.

Se forem criados scripts auxiliares, nomes devem ser claros.

Exemplo conceitual:

```text
scripts/with-disposable-db.mjs
```

ou equivalente.

Não é obrigatório usar esse nome.

---

# 16. Proteção contra DATABASE_URL herdada do .env

O runtime utiliza `.env`.

Um runner de teste não pode simplesmente herdar:

```text
DATABASE_URL=.../naamive
```

e executar.

Mesmo que `.env` contenha o runtime DB, o runner deve:

```text
ler conexão base
→ criar banco descartável
→ sobrescrever DATABASE_URL apenas no processo de teste
```

A presença do `.env` não pode transformar testes em escrita no banco manual.

---

# 17. Cleanup seguro

Nunca executar algo equivalente a:

```text
DROP DATABASE naamive
TRUNCATE runtime...
DELETE todos os projetos...
```

como parte da suíte automática.

O runner só pode remover banco que ele próprio criou nesta execução.

Registrar internamente o nome criado e validar antes do `DROP DATABASE`.

Preferencialmente exigir prefixo de banco descartável e identidade da execução.

---

# 18. Testes obrigatórios da proteção

Adicionar cobertura automatizada para o próprio mecanismo de segurança.

No mínimo provar:

### Caso A — runtime recusado

Dada conexão com:

```text
database = naamive
```

o guard aborta antes de fixture/migration destrutiva de teste.

### Caso B — descartável aceito

Dado banco criado pelo runner:

```text
naamive_test_<id>
```

o guard permite a execução.

### Caso C — cleanup

Ao final de uma execução bem-sucedida:

```text
banco descartável não existe mais
```

### Caso D — cleanup após falha

Forçar teste/command failure e confirmar:

```text
banco descartável também é removido
```

salvo se `NAAMIVE_KEEP_TEST_DATABASE=1`.

### Caso E — keep explícito

Com opção de preservação:

```text
banco descartável permanece
```

e o runner informa o nome.

### Caso F — concorrência

Duas execuções obtêm bancos diferentes.

---

# 19. Regressão funcional

Depois da mudança, executar em ambiente descartável:

```text
npm test
npm run e2e
```

conforme permitido pelo AGENTS.md vigente.

Confirmar que o comportamento das suítes continua equivalente ao baseline,
descontadas falhas conhecidas/documentadas já existentes.

A task não deve "corrigir" testes de domínio apenas para fazê-los passar.

---

# 20. Verificação do banco runtime

Adicionar validação manual/automatizável de aceite:

Antes de uma suíte:

```sql
SELECT count(*) FROM projects;
```

capturar resultado do banco `naamive`.

Executar suíte automatizada.

Depois:

```sql
SELECT count(*) FROM projects;
```

O banco runtime deve permanecer exatamente inalterado.

Idealmente validar também que nenhum novo:

```text
project
job
operation
event
gate
artifact
auth grant project-scoped
```

foi criado no runtime pela suíte.

---

# 21. Dados atualmente contaminados

Esta task deve impedir novas contaminações.

Não apagar automaticamente os dados existentes do banco runtime durante a
implementação.

A limpeza atual do laboratório será feita separadamente e de forma consciente.

O agent pode fornecer ao final um comando SQL seguro sugerido para limpeza
manual, mas:

```text
NÃO executar limpeza destrutiva automaticamente.
```

---

# 22. Fora de escopo

Não incluir:

- mudança de banco de produção;
- Docker novo sem necessidade;
- alteração de domínio;
- alteração de lifecycle;
- correção do job zumbi `PROJECT_DISCOVERY v4`;
- correção de `PROJECT_INTAKE v1` / UI-01;
- reset automático do banco manual;
- mudança de credenciais do usuário `mhj`;
- remoção de auth;
- refatoração ampla de toda infraestrutura de testes.

Os findings de lifecycle/worker permanecem tasks separadas.

---

# 23. Arquivos prováveis

A solução pode afetar, conforme investigação:

```text
/AGENTS.md

naamive/runtime/node-web/package.json
naamive/runtime/node-web/scripts/run-tests.mjs
naamive/runtime/node-web/scripts/run-e2e.mjs
naamive/runtime/node-web/scripts/*
naamive/runtime/node-web/src/test-*.ts
naamive/runtime/node-web/src/db.ts
```

e novos helpers/tests de infraestrutura.

Evitar mudanças de produção fora do estritamente necessário para a proteção dos
testes.

---

# 24. Validação obrigatória do agent

Executar:

```text
npm run build
testes focados do novo safety guard
teste de provisionamento/cleanup
npm test em banco descartável
npm run e2e em banco descartável, se permitido pelo AGENTS.md
git diff --check
git status
git diff
```

Se uma suíte tiver baseline conhecido, reportar separadamente:

```text
known baseline
```

versus:

```text
new regression
```

Não mascarar falhas.

---

# 25. Critérios de aceite

A task só pode ser considerada pronta quando:

- `npm test` não escreve no banco `naamive`;
- `npm run e2e` não escreve no banco `naamive`;
- execução direta de teste PostgreSQL contra `naamive` é recusada;
- banco descartável é criado automaticamente;
- migrations são aplicadas automaticamente;
- banco é removido após sucesso;
- banco é removido após falha;
- preservação opcional exige opt-in;
- bancos concorrentes são distintos;
- runtime DB permanece inalterado;
- nenhum worker/agente real é acionado por fixture deixada no banco manual;
- regra correspondente existe no AGENTS.md;
- build e testes focados passam;
- nenhuma regressão nova foi introduzida.

---

# 26. Restrições operacionais do agent

Não fazer:

```text
commit
push
merge
rebase
reset
clean
```

Não apagar projetos existentes do banco `naamive`.

Não limpar auth.

Não alterar credenciais.

Não iniciar worker manual.

Não usar o banco `naamive` para "validar rapidamente" a implementação.

Todos os testes PostgreSQL desta própria task também devem utilizar banco
descartável.

---

# 27. Saída esperada do agent

Ao finalizar, responder com:

1. causa raiz encontrada;
2. mecanismo de safety guard implementado;
3. como os bancos descartáveis são criados e removidos;
4. arquivos alterados;
5. scripts/comandos finais para desenvolvedores;
6. testes executados e resultados;
7. prova de que o banco `naamive` não mudou;
8. qualquer baseline conhecido encontrado;
9. qualquer validação manual restante;
10. sugestão de comando separado para limpar os dados históricos contaminados,
    sem executá-lo.
