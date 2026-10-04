import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import { GerenciadorConexao } from "../src/infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "../src/infrastructure/database/migrador.js";

describe("IT-013 — Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações", () => {
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

  it("Critério 1: deve executar migração 006 e criar tabelas registros_proveniencia e vinculos_causais", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    const migracoes = await executor.executarMigracoes();

    expect(migracoes.some((m) => m.versao === "006")).toBe(true);

    const executadas = await executor.obterMigracoesExecutadas();
    expect(executadas).toContain("006");

    // Verificar se as tabelas de contexto existem
    const tabelas = ["registros_proveniencia", "vinculos_causais"];
    for (const tabela of tabelas) {
      const res = await gerenciadorConexao.executarConsulta(
        `SELECT COUNT(*) FROM ${tabela}`
      );
      expect(res.rows).toBeDefined();
    }
  });

  it("Critério 2 e 3: deve aplicar integridade referencial, constraints de unicidade direcionada e integridade epistêmica", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // 1. Inserir registro de proveniência de origem (ex: Necessidade N-001)
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO registros_proveniencia (
        id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
        autor_responsavel, classificacao_epistemica, dados_contexto, vigente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "prov-nec-1",
        "NECESSIDADE",
        "nec-123",
        "N-001",
        "DECISAO_HUMANA",
        "mhj",
        "CONHECIDO",
        JSON.stringify({ decisao: "APROVAR_COMPROMISSO", data: "2026-10-04" }),
        true
      ]
    );

    // 2. Inserir registro de proveniência de destino (ex: Projeto P-001)
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO registros_proveniencia (
        id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
        autor_responsavel, classificacao_epistemica, dados_contexto, vigente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "prov-proj-1",
        "PROJETO",
        "proj-456",
        "P-001",
        "RESULTADO_PROCESSO",
        "Especialista em Formação do Projeto",
        "CONHECIDO",
        JSON.stringify({ resultado: "FORMACAO_SUFICIENTE" }),
        true
      ]
    );

    // 3. Validar constraint de integridade epistêmica (CHECK)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO registros_proveniencia (
          id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
          autor_responsavel, classificacao_epistemica, dados_contexto, vigente
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          "prov-invalido",
          "PROJETO",
          "proj-456",
          "P-001",
          "RESULTADO_PROCESSO",
          "Ator",
          "EPISTEMICA_INVALIDA",
          JSON.stringify({}),
          true
        ]
      )
    ).rejects.toThrow();

    // 4. Estabelecer vínculo causal entre N-001 e P-001
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO vinculos_causais (
        id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "vinc-1",
        "prov-nec-1",
        "prov-proj-1",
        "HABILITADO_POR",
        "O Compromisso aprovado de N-001 habilitou formalmente a Formação de P-001"
      ]
    );

    // 5. Validar unicidade direcionada (uq_vinculo_direcionado)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO vinculos_causais (
          id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          "vinc-duplicado",
          "prov-nec-1",
          "prov-proj-1",
          "HABILITADO_POR", // Mesma origem, destino e tipo_relacao
          "Tentativa duplicada"
        ]
      )
    ).rejects.toThrow();

    // 6. Validar integridade referencial: exclusão com vínculo deve ser impedida (ON DELETE RESTRICT)
    await expect(
      gerenciadorConexao.executarConsulta(
        `DELETE FROM registros_proveniencia WHERE id = $1`,
        ["prov-nec-1"]
      )
    ).rejects.toThrow();

    // 7. Validar distinção de vigência (registro superado e novo vigente com relação SUBSTITUI)
    await gerenciadorConexao.executarConsulta(
      `UPDATE registros_proveniencia SET vigente = FALSE WHERE id = $1`,
      ["prov-proj-1"]
    );

    await gerenciadorConexao.executarConsulta(
      `INSERT INTO registros_proveniencia (
        id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
        autor_responsavel, classificacao_epistemica, dados_contexto, vigente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "prov-proj-2",
        "PROJETO",
        "proj-456",
        "P-001",
        "RESULTADO_PROCESSO",
        "Especialista em Formação do Projeto",
        "CONHECIDO",
        JSON.stringify({ resultado: "FORMACAO_SUFICIENTE_RETIFICADA" }),
        true
      ]
    );

    await gerenciadorConexao.executarConsulta(
      `INSERT INTO vinculos_causais (
        id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "vinc-2",
        "prov-proj-2",
        "prov-proj-1",
        "SUBSTITUI",
        "Novo resultado substitui a versão preliminar anterior mantendo histórico explicativo"
      ]
    );

    // 8. Consulta de junção completa e verificação
    const resVigentes = await gerenciadorConexao.executarConsulta<{
      id: string;
      codigo_referencia: string;
      vigente: boolean;
    }>(
      `SELECT id, codigo_referencia, vigente FROM registros_proveniencia WHERE codigo_referencia = 'P-001' ORDER BY registrado_em ASC`
    );

    expect(resVigentes.rows.length).toBe(2);
    expect(resVigentes.rows[0].vigente).toBe(false);
    expect(resVigentes.rows[1].vigente).toBe(true);

    const resCadeia = await gerenciadorConexao.executarConsulta<{
      origem_cod: string;
      destino_cod: string;
      tipo_relacao: string;
    }>(
      `SELECT r_orig.codigo_referencia AS origem_cod,
              r_dest.codigo_referencia AS destino_cod,
              v.tipo_relacao
       FROM vinculos_causais v
       JOIN registros_proveniencia r_orig ON r_orig.id = v.origem_registro_id
       JOIN registros_proveniencia r_dest ON r_dest.id = v.destino_registro_id
       WHERE v.id = 'vinc-1'`
    );

    expect(resCadeia.rows[0].origem_cod).toBe("N-001");
    expect(resCadeia.rows[0].destino_cod).toBe("P-001");
    expect(resCadeia.rows[0].tipo_relacao).toBe("HABILITADO_POR");
  });
});
