import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import { GerenciadorConexao } from "../src/infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "../src/infrastructure/database/migrador.js";

describe("IT-017 — Esquema Relacional PostgreSQL de Verificação de Software e Migrações", () => {
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

  it("Critério 1: deve executar migração 007 e criar tabelas resultados_software, criterios_verificaveis, evidencias_verificacao e laudos_verificacao", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    const migracoes = await executor.executarMigracoes();

    expect(migracoes.some((m) => m.versao === "007")).toBe(true);

    const executadas = await executor.obterMigracoesExecutadas();
    expect(executadas).toContain("007");

    // Verificar se as tabelas de verificação existem
    const tabelas = [
      "resultados_software",
      "criterios_verificaveis",
      "evidencias_verificacao",
      "laudos_verificacao"
    ];
    for (const tabela of tabelas) {
      const res = await gerenciadorConexao.executarConsulta(
        `SELECT COUNT(*) FROM ${tabela}`
      );
      expect(res.rows).toBeDefined();
    }
  });

  it("Critério 2 e 3: deve aplicar integridade referencial, unicidade e validação de constraints", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // 1. Inserir resultado de software (ex: EV-005 / RS-005)
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO resultados_software (
        id, codigo_referencia, modulo_origem, entrega_valor_codigo,
        versao_artefato, descricao, declarado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "res-soft-1",
        "RS-005",
        "M-005",
        "EV-005",
        "git-commit-abcdef",
        "Incremento de software integrado com módulo de verificação",
        "Integrador da Realização"
      ]
    );

    // 2. Tentar inserir duplicata de código de referência (uq_res_software_codigo)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO resultados_software (
          id, codigo_referencia, modulo_origem, entrega_valor_codigo,
          versao_artefato, descricao, declarado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "res-soft-2",
          "RS-005", // Código duplicado
          "M-005",
          "EV-005",
          "git-commit-123456",
          "Outra descrição",
          "Ator"
        ]
      )
    ).rejects.toThrow();

    // 3. Inserir critério verificável válido
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO criterios_verificaveis (
        id, codigo, resultado_software_id, origem_normativa,
        descricao_comportamento, metodo_observacao, condicao_satisfacao, limites_ou_tolerancias
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "crit-1",
        "CRIT-001",
        "res-soft-1",
        "EV-005/Especificacao",
        "Suíte de testes de persistência executa sem erros",
        "SUITE_AUTOMATIZADA",
        "100% de testes verdes",
        "Tolerância zero para falhas"
      ]
    );

    // 4. Validar constraint de método de observação inválido (chk_metodo_observacao)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO criterios_verificaveis (
          id, codigo, resultado_software_id, origem_normativa,
          descricao_comportamento, metodo_observacao, condicao_satisfacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "crit-invalido",
          "CRIT-INV",
          "res-soft-1",
          "EV-005",
          "Desc",
          "METODO_INEXISTENTE",
          "Cond"
        ]
      )
    ).rejects.toThrow();

    // 5. Inserir evidência associada ao critério
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO evidencias_verificacao (
        id, criterio_id, procedimento_executado, resultado_observado,
        dados_detalhados, sucesso, coletado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "evid-1",
        "crit-1",
        "Execução de npm test na suíte it017",
        "Todos os 3 testes passaram com sucesso",
        JSON.stringify({ duracaoMs: 120, testesPassados: 3, erros: 0 }),
        true,
        "Engenheiro de Software"
      ]
    );

    // 6. Inserir laudo de verificação associado ao resultado e critério
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO laudos_verificacao (
        id, resultado_software_id, criterio_id, conclusao,
        fundamentacao_tecnica, evidencias_utilizadas, divergencias_apontadas, emitido_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "laudo-1",
        "res-soft-1",
        "crit-1",
        "CRITERIO_DEMONSTRADO",
        "Evidências automatizadas confirmam execução com 100% de integridade relacional.",
        JSON.stringify(["evid-1"]),
        null,
        "Motor de Verificação de Software"
      ]
    );

    // 7. Validar unicidade do laudo por par (resultado, critério)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO laudos_verificacao (
          id, resultado_software_id, criterio_id, conclusao,
          fundamentacao_tecnica, evidencias_utilizadas, emitido_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "laudo-duplicado",
          "res-soft-1",
          "crit-1", // Mesmo par resultado/critério
          "CRITERIO_DEMONSTRADO",
          "Tentativa duplicada",
          JSON.stringify(["evid-1"]),
          "Motor"
        ]
      )
    ).rejects.toThrow();

    // 8. Validar constraint de conclusão técnica (chk_conclusao_verificacao)
    await expect(
      gerenciadorConexao.executarConsulta(
        `INSERT INTO laudos_verificacao (
          id, resultado_software_id, criterio_id, conclusao,
          fundamentacao_tecnica, emitido_por
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "laudo-invalido",
          "res-soft-1",
          "crit-1",
          "CONCLUSAO_INVALIDA",
          "Fundamentação",
          "Motor"
        ]
      )
    ).rejects.toThrow();

    // 9. Validar cascata ao excluir resultado_software (ON DELETE CASCADE)
    await gerenciadorConexao.executarConsulta(
      `DELETE FROM resultados_software WHERE id = $1`,
      ["res-soft-1"]
    );

    const resCrit = await gerenciadorConexao.executarConsulta(
      `SELECT COUNT(*) FROM criterios_verificaveis WHERE id = $1`,
      ["crit-1"]
    );
    expect(Number(resCrit.rows[0].count)).toBe(0);

    const resEvid = await gerenciadorConexao.executarConsulta(
      `SELECT COUNT(*) FROM evidencias_verificacao WHERE id = $1`,
      ["evid-1"]
    );
    expect(Number(resEvid.rows[0].count)).toBe(0);

    const resLaudo = await gerenciadorConexao.executarConsulta(
      `SELECT COUNT(*) FROM laudos_verificacao WHERE id = $1`,
      ["laudo-1"]
    );
    expect(Number(resLaudo.rows[0].count)).toBe(0);
  });
});
