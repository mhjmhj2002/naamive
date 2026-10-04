import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import { GerenciadorConexao } from "../src/infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "../src/infrastructure/database/migrador.js";

describe("IT-005 — Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let gerenciadorConexao: GerenciadorConexao;

  beforeEach(() => {
    dbMem = newDb();
    let backup: any = null;
    const origQuery = dbMem.public.query.bind(dbMem.public);
    dbMem.public.query = function (text: any) {
      if (typeof text === "string") {
        const trimmed = text.trim().toUpperCase();
        if (trimmed === "BEGIN") {
          backup = dbMem.backup();
          return { rows: [], rowCount: 0, command: "BEGIN", fields: [] };
        }
        if (trimmed === "ROLLBACK") {
          if (backup) {
            backup.restore();
            backup = null;
          }
          return { rows: [], rowCount: 0, command: "ROLLBACK", fields: [] };
        }
        if (trimmed === "COMMIT") {
          backup = null;
          return { rows: [], rowCount: 0, command: "COMMIT", fields: [] };
        }
      }
      return origQuery(text);
    };

    const { Pool } = dbMem.adapters.createPg();
    pgPool = new Pool();
    gerenciadorConexao = new GerenciadorConexao(undefined, pgPool);
  });

  afterEach(async () => {
    await gerenciadorConexao.encerrar();
  });

  it("Critério 1: deve executar migração 003 e criar todas as tabelas de Projeto", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    const migracoes = await executor.executarMigracoes();

    expect(migracoes.some((m) => m.versao === "003")).toBe(true);

    const executadas = await executor.obterMigracoesExecutadas();
    expect(executadas).toContain("003");

    // Verificar se as 4 tabelas de projeto existem no banco
    const tabelas = ["projetos", "etapas_formacao_projeto", "auditorias_projeto", "direcoes_projeto"];
    for (const tabela of tabelas) {
      const res = await gerenciadorConexao.executarConsulta(
        `SELECT COUNT(*) FROM ${tabela}`
      );
      expect(res.rows).toBeDefined();
    }
  });

  it("Critério 2: deve garantir o invariante 1:1 impedindo mais de um Projeto para a mesma Necessidade", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // Inserir Necessidade base
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO necessidade (
        id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
        resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
        por_que_isso_importa, restricoes_ou_dependencias, origem, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        "nec-100",
        "N-100",
        "Necessidade Teste Projeto",
        "NOVO_PRODUTO",
        "Problema",
        "Quem",
        "Resultado",
        "Escopo",
        "Fora",
        "Critério",
        "Importância",
        "Restrições",
        "Origem",
        "EM_PROJETO"
      ]
    );

    // Inserir primeiro Projeto para a necessidade
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO projetos (
        id, codigo, necessidade_id, titulo, status
      ) VALUES ($1, $2, $3, $4, $5)`,
      ["proj-1", "P-100", "nec-100", "Projeto 1", "EM_FORMACAO"]
    );

    // Tentar inserir segundo Projeto com a mesma necessidade_id deve violar constraint UNIQUE
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO projetos (
          id, codigo, necessidade_id, titulo, status
        ) VALUES ($1, $2, $3, $4, $5)`,
        ["proj-2", "P-101", "nec-100", "Projeto Duplicado", "EM_FORMACAO"]
      )
    ).rejects.toThrow();
  });

  it("Critério 3: deve persistir etapas de formação, auditoria e direção com integridade referencial", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // Inserir Necessidade
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO necessidade (
        id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
        resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
        por_que_isso_importa, restricoes_ou_dependencias, origem, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        "nec-200",
        "N-200",
        "Necessidade Formação",
        "NOVO_PRODUTO",
        "Problema",
        "Quem",
        "Resultado",
        "Escopo",
        "Fora",
        "Critério",
        "Importância",
        "Restrições",
        "Origem",
        "EM_PROJETO"
      ]
    );

    // Inserir Projeto
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO projetos (
        id, codigo, necessidade_id, titulo, status
      ) VALUES ($1, $2, $3, $4, $5)`,
      ["proj-200", "P-200", "nec-200", "Projeto Jornada", "EM_FORMACAO"]
    );

    // Inserir Etapas de Formação
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO etapas_formacao_projeto (
        id, projeto_id, etapa, conteudo, registrado_por
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "etapa-1",
        "proj-200",
        "ENQUADRAMENTO",
        JSON.stringify({ visao: "Enquadramento inicial do projeto" }),
        "Especialista em Formação do Projeto"
      ]
    );

    // Inserir Auditoria do Projeto
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO auditorias_projeto (
        id, projeto_id, resultado, parecer, auditor
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "audit-1",
        "proj-200",
        "FORMACAO_SUFICIENTE",
        "Formação robusta com direção viável",
        "Auditor do Projeto"
      ]
    );

    // Inserir Direção do Projeto
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO direcoes_projeto (
        id, projeto_id, compromisso_origem, objetivo_projeto, fronteiras, contexto_relevante
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "dir-1",
        "proj-200",
        "Compromisso da Necessidade N-200",
        "Entregar o fluxo autônomo",
        "Módulos delimitados",
        "Contexto arquitetural"
      ]
    );

    // Consultar junção do Projeto com Direção e Auditoria
    const res = await gerenciadorConexao.executarConsulta(
      `SELECT p.codigo, p.titulo, d.objetivo_projeto, a.resultado AS resultado_auditoria
       FROM projetos p
       JOIN direcoes_projeto d ON d.projeto_id = p.id
       JOIN auditorias_projeto a ON a.projeto_id = p.id
       WHERE p.id = $1`,
      ["proj-200"]
    );

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].codigo).toBe("P-200");
    expect(res.rows[0].resultado_auditoria).toBe("FORMACAO_SUFICIENTE");
    expect(res.rows[0].objetivo_projeto).toBe("Entregar o fluxo autônomo");
  });
});
