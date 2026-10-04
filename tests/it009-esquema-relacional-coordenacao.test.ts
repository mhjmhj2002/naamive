import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import { GerenciadorConexao } from "../src/infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "../src/infrastructure/database/migrador.js";

describe("IT-009 — Esquema Relacional PostgreSQL de Coordenação do Trabalho e Migrações", () => {
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

  it("Critério 1: deve executar migração 005 e criar as tabelas de Coordenação do Trabalho", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    const migracoes = await executor.executarMigracoes();

    expect(migracoes.some((m) => m.versao === "005")).toBe(true);

    const executadas = await executor.obterMigracoesExecutadas();
    expect(executadas).toContain("005");

    // Verificar se as 3 tabelas de coordenação existem no banco
    const tabelas = [
      "trabalhos_coordenados",
      "handoffs_coordenacao",
      "retornos_coordenacao"
    ];
    for (const tabela of tabelas) {
      const res = await gerenciadorConexao.executarConsulta(
        `SELECT COUNT(*) FROM ${tabela}`
      );
      expect(res.rows).toBeDefined();
    }
  });

  it("Critério 2 e 3: deve aplicar integridade referencial, unicidade de código/token e restrições de condição operacional", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // 1. Criar dados preliminares necessários (Necessidade -> Projeto)
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO necessidade (
        id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
        resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
        por_que_isso_importa, restricoes_ou_dependencias, origem, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        "nec-coord-1",
        "N-COORD-001",
        "Necessidade Coordenação",
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

    await gerenciadorConexao.executarConsulta(
      `INSERT INTO projetos (
        id, codigo, necessidade_id, titulo, status
      ) VALUES ($1, $2, $3, $4, $5)`,
      ["proj-coord-1", "P-COORD-001", "nec-coord-1", "Projeto Coordenação", "FORMADO"]
    );

    // 2. Inserir trabalho coordenado válido
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO trabalhos_coordenados (
        id, codigo, projeto_id, titulo, objetivo, condicao_operacional,
        competencia_requerida, ator_requerido, skill_requerida, executor_designado,
        criterio_termino, dependencias
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        "trab-1",
        "TC-001",
        "proj-coord-1",
        "Delimitação de Módulos",
        "Definir mapa de módulos",
        "PREPARADO",
        "Arquitetura de Software",
        "Especialista em Delimitação de Módulos",
        ".agents/skills/modulo/delimitacao-de-modulos/SKILL.md",
        "agente-arquiteto",
        "Mapa de módulos consolidado e validado",
        JSON.stringify([])
      ]
    );

    // Validar unicidade do código de trabalho
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO trabalhos_coordenados (
          id, codigo, projeto_id, titulo, objetivo, condicao_operacional,
          competencia_requerida, ator_requerido, skill_requerida, executor_designado,
          criterio_termino, dependencias
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          "trab-2",
          "TC-001", // Código duplicado
          "proj-coord-1",
          "Outro Trabalho",
          "Objetivo",
          "POSSIVEL",
          "Comp",
          "Ator",
          null,
          null,
          "Critério",
          JSON.stringify([])
        ]
      )
    ).rejects.toThrow();

    // Validar constraint de condição operacional permitida
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO trabalhos_coordenados (
          id, codigo, projeto_id, titulo, objetivo, condicao_operacional,
          competencia_requerida, ator_requerido, skill_requerida, executor_designado,
          criterio_termino, dependencias
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          "trab-invalido",
          "TC-999",
          "proj-coord-1",
          "Trabalho Condição Inválida",
          "Objetivo",
          "STATUS_INVALIDO",
          "Comp",
          "Ator",
          null,
          null,
          "Critério",
          JSON.stringify([])
        ]
      )
    ).rejects.toThrow();

    // 3. Inserir Handoff coordenado vinculado ao trabalho
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO handoffs_coordenacao (
        id, trabalho_id, token_correlacao, ator_destinatario, skill_destinataria, conteudo_handoff
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "hand-1",
        "trab-1",
        "TOK-CORR-123456",
        "Especialista em Delimitação de Módulos",
        ".agents/skills/modulo/delimitacao-de-modulos/SKILL.md",
        JSON.stringify({ projeto: "P-COORD-001", diretriz: "Executar delimitação" })
      ]
    );

    // Validar unicidade do token_correlacao no handoff
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO handoffs_coordenacao (
          id, trabalho_id, token_correlacao, ator_destinatario, skill_destinataria, conteudo_handoff
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "hand-2",
          "trab-1",
          "TOK-CORR-123456", // Token duplicado
          "Outro Ator",
          null,
          JSON.stringify({})
        ]
      )
    ).rejects.toThrow();

    // 4. Inserir Retorno de Coordenação vinculado ao handoff
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO retornos_coordenacao (
        id, handoff_id, sucesso, resultado_observavel, pendencias_ou_bloqueios
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "ret-1",
        "hand-1",
        true,
        "Mapa de módulos entregue com sucesso",
        null
      ]
    );

    // 5. Testar integridade referencial: exclusão de trabalho com handoff deve ser impedida
    await expect(
      gerenciadorConexao.executarConsulta(
        `DELETE FROM trabalhos_coordenados WHERE id = $1`,
        ["trab-1"]
      )
    ).rejects.toThrow();

    // 6. Consultar junção completa do trabalho com handoff e retorno
    const res = await gerenciadorConexao.executarConsulta<{
      codigo: string;
      titulo: string;
      condicao_operacional: string;
      token_correlacao: string;
      sucesso: boolean;
      resultado_observavel: string;
    }>(
      `SELECT t.codigo, t.titulo, t.condicao_operacional,
              h.token_correlacao, r.sucesso, r.resultado_observavel
       FROM trabalhos_coordenados t
       JOIN handoffs_coordenacao h ON h.trabalho_id = t.id
       JOIN retornos_coordenacao r ON r.handoff_id = h.id
       WHERE t.id = $1`,
      ["trab-1"]
    );

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].codigo).toBe("TC-001");
    expect(res.rows[0].condicao_operacional).toBe("PREPARADO");
    expect(res.rows[0].token_correlacao).toBe("TOK-CORR-123456");
    expect(res.rows[0].sucesso).toBe(true);
    expect(res.rows[0].resultado_observavel).toBe("Mapa de módulos entregue com sucesso");
  });
});
