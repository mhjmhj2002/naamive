# Configuração e Ambiente do NAAMIVE

## 1. Pré-requisitos de Execução

- **Node.js:** Versão 24.0.0 ou superior (suporte nativo a ESM e recursos modernos de JavaScript).
- **NPM:** Gerenciador de pacotes compatível com Node.js (incluso na instalação padrão).
- **PostgreSQL (Opcional):** Instância local ou remota de PostgreSQL 14+. Caso não haja banco PostgreSQL rodando no host, o sistema faz **fallback automático transparente** para o emulador relacional `pg-mem`, permitindo execução imediata sem containers.

---

## 2. Portas e Conflitos de Ambiente no Host

> [!WARNING]
> **Atenção para conflitos de portas locais:**
> É comum existirem outros serviços ou containers Docker ocupando a porta `3000` (ex: dashboards, outros backends) ou a porta `5432` no host local.

Para garantir convivência pacífica e inicialização sem erros de `EADDRINUSE`:
- A **porta padrão** da aplicação web do NAAMIVE é **`3001`**.
- O servidor possui **mecanismo de fallback automático**: se a porta configurada (seja `3001` ou qualquer outra indicada em `PORT`) estiver ocupada, o bootstrap detectará o erro `EADDRINUSE` e buscará automaticamente a próxima porta livre (`3002`, `3003`, etc.).
- A porta alocada é sempre informada no log de inicialização do terminal.

---

## 3. Variáveis de Ambiente Suportadas

O sistema carrega automaticamente variáveis a partir do arquivo `.env` ou `.env.local` na raiz do projeto (via `dotenv`), ou herdadas do shell:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3001` | Porta TCP na qual o servidor HTTP escuta requisições web. |
| `NODE_ENV` | `development` | Ambiente de execução (`development`, `test`, `production`). |
| `DATABASE_URL` | *(vazio)* | URL completa de conexão PostgreSQL (ex: `postgres://user:pass@localhost:5432/naamive`). Tem precedência sobre as variáveis individuais abaixo. |
| `DB_HOST` | `127.0.0.1` | Endereço do host do banco de dados PostgreSQL. |
| `DB_PORT` | `5432` | Porta do PostgreSQL. |
| `DB_NAME` | `naamive` | Nome da base de dados relacional. |
| `DB_USER` | `postgres` | Usuário do banco de dados. |
| `DB_PASSWORD` | *(vazio)* | Senha do usuário do banco de dados. |
| `DB_MAX_CONNECTIONS`| `10` | Quantidade máxima de conexões simultâneas no pool. |

---

## 4. Instruções para o `.env.local`

Para customizar as configurações de seu ambiente de desenvolvimento sem interferir no controle de versão Git, crie um arquivo `.env.local` na raiz do projeto com o seguinte formato:

```bash
# Porta da aplicação web (padrão 3001 para evitar conflito com a 3000)
PORT=3001

# Ambiente
NODE_ENV=development

# Conexão com banco PostgreSQL (caso utilize container local na porta 5432 ou externa)
# DATABASE_URL=postgres://postgres:senha@localhost:5432/naamive
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_NAME=naamive
# DB_USER=postgres
# DB_PASSWORD=minhasenha
# DB_MAX_CONNECTIONS=10
```

Se nenhuma variável de banco for fornecida ou se o PostgreSQL local estiver inacessível, o NAAMIVE iniciará com o emulador relacional `pg-mem`, garantindo suporte completo a SQL, migrações e persistência em memória durante a sessão.
