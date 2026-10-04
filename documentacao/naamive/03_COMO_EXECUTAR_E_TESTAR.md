# Como Executar e Testar o NAAMIVE

Este guia fornece as instruções práticas para compilar o código TypeScript, executar a suíte de testes automatizados e iniciar a aplicação web completa com worker integrado.

---

## 1. Verificação Estrita de Tipagem (Typecheck)

Para validar a integridade estática dos contratos, modelos de domínio e adaptadores sem gerar arquivos compilados:

```bash
npm run typecheck
```

O comando executa `tsc --noEmit` e deve retornar código 0 (sem qualquer erro de tipagem).

---

## 2. Execução da Suíte de Testes Automatizados

A suíte de testes automatizados cobre desde o esquema relacional até a jornada completa de ponta a ponta na camada web:

```bash
# Executa todos os testes e exibe o resumo completo
npm test

# Ou em modo interativo (assistindo alterações de arquivos)
npm run test:watch
```

### O que a suíte valida:
1. `tests/it001-fundacao.test.ts`: Estrutura base, configuração de portas, migrações DDL e transações no PostgreSQL.
2. `tests/it002-dominio-necessidade.test.ts`: Regras de negócio da Necessidade, invariantes de transição, pareceres e consolidação de compromisso.
3. `tests/it003-worker-autenticacao-integracao.test.ts`: Worker em background, polling, autenticação do Owner e portas de integração idempotentes (M-002 e M-004).
4. `tests/it004-camada-web-responsiva.test.ts`: Rotas HTTP da interface web, renderização com Bootstrap 5, formulários e jornada completa da EV-001.
5. `tests/it005-esquema-relacional-projeto.test.ts` a `tests/it008-camada-web-projeto.test.ts`: Fundação relacional, domínio, serviços e camada web responsiva de Projetos (EV-002).
6. `tests/it009-esquema-relacional-coordenacao.test.ts` a `tests/it012-camada-web-coordenacao.test.ts`: Fundação relacional, motor de elegibilidade, serviços, worker e camada web responsiva de Coordenação do Trabalho (EV-003).

---

## 3. Compilação de Produção (Build)

Para compilar os arquivos TypeScript de `src/` para JavaScript ESM em `dist/`:

```bash
npm run build
```

Os arquivos transpilados serão depositados no diretório `dist/` com seus respectivos mapeamentos de declaração `.d.ts`.

---

## 4. Inicialização da Aplicação (Start)

Para subir o sistema completo (Servidor Web HTTP + Worker Assíncrono + Persistência Relacional):

```bash
npm start
```

Ou, caso deseje compilar e iniciar em um único passo:

```bash
npm run build && npm start
```

### O que acontece no bootstrap:
1. O sistema carrega as configurações de ambiente (porta padrão **3001**).
2. Conecta ao banco PostgreSQL ou ativa o emulador relacional `pg-mem`.
3. Executa as migrações DDL pendentes (`001` e `002`).
4. Semeia os dados canônicos da Necessidade **N-001** caso ainda não existam.
5. Inicia o **Worker em Segundo Plano** desacoplado.
6. Aloca a porta livre e inicia o **Servidor Web HTTP**.

---

## 5. Acesso no Navegador e Validação Local

Com o servidor rodando, abra o seu navegador no seguinte endereço:

```text
http://localhost:3001/
```

Você também pode verificar o status de subida via terminal com `curl`:

```bash
curl -I http://localhost:3001/
```

Resposta esperada:
```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```
