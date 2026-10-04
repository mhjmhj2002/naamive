import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import { GerenciadorConexao } from "../src/infrastructure/database/conexao.js";
import { ExecutorMigracoes } from "../src/infrastructure/database/migrador.js";
import { carregarConfiguracao } from "../src/config/ambiente.js";

describe("IT-001 — Estrutura Base e Esquema Relacional PostgreSQL", () => {
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

  it("deve carregar configuração de ambiente com valores padrão ou variáveis de ambiente", () => {
    const config = carregarConfiguracao();
    expect(config).toBeDefined();
    expect(config.porta).toBeGreaterThan(0);
    expect(config.bancoDados.host).toBeDefined();
  });

  it("deve executar migrações relacionais criando tabelas com integridade", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    const migracoes = await executor.executarMigracoes();

    expect(migracoes.length).toBeGreaterThan(0);
    expect(migracoes[0]?.versao).toBe("001");
    expect(migracoes[0]?.sucesso).toBe(true);

    const executadas = await executor.obterMigracoesExecutadas();
    expect(executadas).toContain("001");

    // Verificar se idempotência funciona (executar novamente não repete)
    const migracoesRepetidas = await executor.executarMigracoes();
    expect(migracoesRepetidas.length).toBe(0);
  });

  it("deve suportar operações transacionais e inserção de dados no esquema relacional", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // Inserção transacional de Necessidade
    await gerenciadorConexao.transacao(async (cliente) => {
      await cliente.query(
        `INSERT INTO necessidade (
          id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
          resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
          por_que_isso_importa, restricoes_ou_dependencias, origem, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )`,
        [
          "nec-uuid-1",
          "N-001",
          "Conduzir necessidades até software entregue",
          "NOVO_PRODUTO",
          "Coordenação excessiva",
          "Desenvolvedores e agentes",
          "Fluxo autônomo e verificável",
          "Formação até entrega",
          "Substituir todas as ferramentas",
          "Trabalho pronto executável",
          "Reduzir desperdício",
          "Nenhuma conhecida",
          "Prática com IA",
          "EM_FORMACAO"
        ]
      );
    });

    const resultadoNec = await gerenciadorConexao.executarConsulta(
      "SELECT * FROM necessidade WHERE codigo = $1",
      ["N-001"]
    );
    expect(resultadoNec.rows.length).toBe(1);
    expect(resultadoNec.rows[0].status).toBe("EM_FORMACAO");

    // Inserção de histórico de atividades imutável
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO historico_atividades (
        id, necessidade_id, ator_competente, atividade, status_anterior, status_novo, detalhes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "hist-uuid-1",
        "nec-uuid-1",
        "Especialista em Formação da Necessidade",
        "Formação Inicial",
        null,
        "EM_FORMACAO",
        JSON.stringify({ acao: "Registro inicial" })
      ]
    );

    // Inserção de Resultado do Processo
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO resultados_processo (
        id, necessidade_id, ator_competente, tipo_resultado, conteudo
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "res-uuid-1",
        "nec-uuid-1",
        "Auditor da Necessidade",
        "QUALIFICAVEL",
        JSON.stringify({ parecer: "Formação atende aos critérios iniciais" })
      ]
    );

    // Inserção de Decisão Material do Owner (exige usuário autenticado)
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO decisoes_owner (
        id, necessidade_id, decisao, usuario_autenticado, justificativa
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "dec-uuid-1",
        "nec-uuid-1",
        "APROVADO",
        "mhj",
        "Aprovado para início do projeto"
      ]
    );

    // Inserção de Compromisso Consolidado vinculado à decisão
    await gerenciadorConexao.executarConsulta(
      `INSERT INTO compromissos (
        id, necessidade_id, problema_assumido, resultado_pretendido, escopo_assumido,
        fora_de_escopo, criterio_de_atendimento, restricoes_a_preservar,
        contexto_relevante, decisao_id, usuario_aprovador
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        "comp-uuid-1",
        "nec-uuid-1",
        "Coordenação excessiva",
        "Fluxo autônomo e verificável",
        "Formação até entrega",
        "Substituir todas as ferramentas",
        "Trabalho pronto executável",
        "Nenhuma conhecida",
        "Prática com IA",
        "dec-uuid-1",
        "mhj"
      ]
    );

    // Consulta e validação de relacionamentos e integridade referencial
    const consultaCompromisso = await gerenciadorConexao.executarConsulta(
      `SELECT c.*, d.usuario_autenticado, d.decisao, n.codigo AS codigo_necessidade
       FROM compromissos c
       JOIN decisoes_owner d ON c.decisao_id = d.id
       JOIN necessidade n ON c.necessidade_id = n.id
       WHERE n.codigo = $1`,
      ["N-001"]
    );

    expect(consultaCompromisso.rows.length).toBe(1);
    expect(consultaCompromisso.rows[0].usuario_aprovador).toBe("mhj");
    expect(consultaCompromisso.rows[0].decisao).toBe("APROVADO");
    expect(consultaCompromisso.rows[0].codigo_necessidade).toBe("N-001");
  });

  it("deve reverter transação em caso de erro mantendo integridade", async () => {
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    await expect(
      gerenciadorConexao.transacao(async (cliente) => {
        await cliente.query(
          `INSERT INTO necessidade (
            id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
            resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
            por_que_isso_importa, restricoes_ou_dependencias, origem, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )`,
          [
            "nec-rollback-1",
            "N-999",
            "Necessidade Teste Rollback",
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
            "EM_FORMACAO"
          ]
        );
        throw new Error("Erro forçado para acionar rollback");
      })
    ).rejects.toThrow("Erro forçado para acionar rollback");

    const resultado = await gerenciadorConexao.executarConsulta(
      "SELECT * FROM necessidade WHERE codigo = $1",
      ["N-999"]
    );
    expect(resultado.rows.length).toBe(0);
  });
});
