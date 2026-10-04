import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioNecessidadePostgres,
  RepositorioProjetoPostgres,
  RepositorioCoordenacaoPostgres,
  RepositorioContextoPostgres,
  ServicoAplicacaoProjeto,
  ServicoAplicacaoCoordenacao,
  ServicoContexto,
  AdaptadorAutenticacaoOwner,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  FilaTarefasMemoria,
  WorkerSegundoPlano,
  criarServidorWeb,
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
} from "../src/index.js";

/**
 * Utilitário HTTP para testes e asserções sem dependências externas.
 */
interface RespostaHttp<T = any> {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json?: T;
}

function requisitar(
  server: http.Server,
  metodo: string,
  caminho: string,
  dados?: Record<string, any>,
  headersCustom: Record<string, string> = {}
): Promise<RespostaHttp> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      return reject(new Error("Servidor não está escutando."));
    }

    const payload = dados ? JSON.stringify(dados) : undefined;
    const headers: Record<string, string> = {
      ...headersCustom,
    };

    if (payload && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path: caminho,
        method: metodo,
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk.toString("utf-8");
        });
        res.on("end", () => {
          let json: any = undefined;
          if (res.headers["content-type"]?.includes("application/json")) {
            try {
              json = JSON.parse(body);
            } catch {
              // Não foi possível converter para JSON
            }
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body,
            json,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

describe("IT-016 — Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada", () => {
  let conexao: GerenciadorConexao;
  let pgPool: pg.Pool;
  let repositorioNecessidade: RepositorioNecessidadePostgres;
  let repositorioProjeto: RepositorioProjetoPostgres;
  let repositorioCoordenacao: RepositorioCoordenacaoPostgres;
  let repositorioContexto: RepositorioContextoPostgres;
  let servicoProjeto: ServicoAplicacaoProjeto;
  let servicoCoordenacao: ServicoAplicacaoCoordenacao;
  let servicoContexto: ServicoContexto;
  let autenticacaoOwner: AdaptadorAutenticacaoOwner;
  let filaTarefas: FilaTarefasMemoria;
  let worker: WorkerSegundoPlano;
  let servidor: http.Server;

  beforeEach(async () => {
    // 1. Configura emulador PostgreSQL em memória
    const dbMem = newDb();
    let backup: any = null;
    const origQuery = dbMem.public.query.bind(dbMem.public);
    (dbMem.public as any).query = function (text: any) {
      if (typeof text === "string") {
        const trimmed = text.trim().toUpperCase();
        if (trimmed === "BEGIN") {
          backup = dbMem.backup();
          return { rows: [], rowCount: 0, command: "BEGIN", fields: [], location: null as any };
        }
        if (trimmed === "ROLLBACK") {
          if (backup) {
            backup.restore();
            backup = null;
          }
          return { rows: [], rowCount: 0, command: "ROLLBACK", fields: [], location: null as any };
        }
        if (trimmed === "COMMIT") {
          backup = null;
          return { rows: [], rowCount: 0, command: "COMMIT", fields: [], location: null as any };
        }
      }
      return origQuery(text);
    };

    const { Pool } = dbMem.adapters.createPg();
    pgPool = new Pool();
    conexao = new GerenciadorConexao(undefined, pgPool);

    // 2. Executa migrações completas do banco
    const executorMigracoes = new ExecutorMigracoes(conexao);
    await executorMigracoes.executarMigracoes();

    // 3. Inicializa repositórios e serviços
    repositorioNecessidade = new RepositorioNecessidadePostgres(conexao);
    repositorioProjeto = new RepositorioProjetoPostgres(conexao);
    repositorioCoordenacao = new RepositorioCoordenacaoPostgres(conexao);
    repositorioContexto = new RepositorioContextoPostgres(conexao);
    filaTarefas = new FilaTarefasMemoria();

    servicoProjeto = new ServicoAplicacaoProjeto(repositorioProjeto, repositorioNecessidade);
    servicoCoordenacao = new ServicoAplicacaoCoordenacao(
      repositorioCoordenacao,
      repositorioProjeto,
      filaTarefas
    );
    servicoContexto = new ServicoContexto(repositorioContexto, undefined, filaTarefas);

    autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    const portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
    const portaContexto = new AdaptadorIntegracaoContexto();

    // 4. Inicia worker
    worker = new WorkerSegundoPlano(
      filaTarefas,
      repositorioNecessidade,
      portaProjeto,
      portaContexto,
      { intervaloPollingMs: 50 },
      servicoCoordenacao,
      servicoContexto
    );
    worker.iniciar();

    // 5. Instancia servidor web com suporte a contexto e rastreabilidade
    servidor = criarServidorWeb({
      repositorio: repositorioNecessidade,
      autenticacaoOwner,
      portaProjeto,
      portaContexto,
      filaTarefas,
      servicoProjeto,
      repositorioProjeto,
      servicoCoordenacao,
      repositorioCoordenacao,
      servicoContexto,
      repositorioContexto,
    });

    await new Promise<void>((resolve) => {
      servidor.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterEach(async () => {
    await worker.parar();
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
  });

  it("Critério 1: Navegação Web Responsiva — deve renderizar o painel /rastreabilidade com Bootstrap 5 e métricas", async () => {
    const res = await requisitar(servidor, "GET", "/rastreabilidade");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("Contexto & Rastreabilidade");
    expect(res.body).toContain("/rastreabilidade");
    expect(res.body).toContain("EV-001, EV-002, EV-003 & EV-004");
    expect(res.body).toContain("Registros Auditados");
    expect(res.body).toContain("Vínculos Causais");
    expect(res.body).toContain("Inspecionar Trilha Genealógica");
  });

  it("Critério 2 e 4: Visualização da Linhagem Causal e Badges Epistêmicas — deve exibir árvore genealógica de entidade", async () => {
    // 1. Cadastra entidades e proveniências encadeadas
    const regNec = await servicoContexto.preservarRegistro({
      entidadeTipo: TipoEntidadeContexto.NECESSIDADE,
      entidadeId: "nec-001",
      codigoReferencia: "N-001",
      tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
      autorResponsavel: "mhj",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { compromisso: "Aprovado com alta prioridade" },
    });

    const regProj = await servicoContexto.preservarRegistro({
      entidadeTipo: TipoEntidadeContexto.PROJETO,
      entidadeId: "proj-001",
      codigoReferencia: "P-001",
      tipoRegistro: TipoRegistroProveniencia.TRANSICAO_STATUS,
      autorResponsavel: "EspecialistaEmFormacao",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { status: "FORMADO", nome: "Jornada Autônoma" },
    });

    const regEV = await servicoContexto.preservarRegistro({
      entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
      entidadeId: "ev-004",
      codigoReferencia: "EV-004",
      tipoRegistro: TipoRegistroProveniencia.EVIDENCIA,
      autorResponsavel: "EspecialistaEmFormacao",
      classificacaoEpistemica: ClassificacaoEpistemica.PROPOSTO,
      dadosContexto: { titulo: "Preservação de Contexto" },
    });

    // 2. Estabelece arestas causais: N-001 -> P-001 -> EV-004
    await servicoContexto.estabelecerVinculoCausal(
      regNec.id,
      regProj.id,
      TipoRelacaoCausal.ORIGINADO_DE,
      "Projeto originado a partir do Compromisso aprovado de N-001"
    );

    await servicoContexto.estabelecerVinculoCausal(
      regProj.id,
      regEV.id,
      TipoRelacaoCausal.HABILITADO_POR,
      "EV-004 delimitada e habilitada pelo escopo de P-001"
    );

    // 3. Consulta via Web HTML o detalhe de P-001
    const res = await requisitar(servidor, "GET", "/rastreabilidade/projeto/P-001");

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Inspeção Causal:");
    expect(res.body).toContain("P-001");
    // Ascendência: N-001
    expect(res.body).toContain("N-001");
    expect(res.body).toContain("ORIGINADO_DE");
    // Derivação: EV-004
    expect(res.body).toContain("EV-004");
    expect(res.body).toContain("HABILITADO_POR");
    // Badges epistêmicas
    expect(res.body).toContain("CONHECIDO");
    expect(res.body).toContain("Registro Vigente");
  });

  it("Critério 3: Filtro de Contexto por Finalidade — deve recuperar pacote proporcional sintetizado", async () => {
    // Semeia entidade
    await servicoContexto.preservarRegistro({
      entidadeTipo: TipoEntidadeContexto.ITEM_DE_TRABALHO,
      entidadeId: "it-016",
      codigoReferencia: "IT-016",
      tipoRegistro: TipoRegistroProveniencia.EVIDENCIA,
      autorResponsavel: "EngenheiroDeSoftware",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { status: "EM_EXECUCAO", tarefa: "Camada Web" },
    });

    // Consulta HTML com finalidade EXECUTAR_ITEM
    const resHtml = await requisitar(
      servidor,
      "GET",
      "/rastreabilidade/item_de_trabalho/IT-016?finalidade=EXECUTAR_ITEM"
    );

    expect(resHtml.statusCode).toBe(200);
    expect(resHtml.body).toContain("Pacote Contextual Sintetizado (EXECUTAR_ITEM)");
    expect(resHtml.body).toContain("CONSISTENTE");

    // Consulta JSON via Accept: application/json
    const resJson = await requisitar(
      servidor,
      "GET",
      "/rastreabilidade/item_de_trabalho/IT-016?finalidade=EXECUTAR_ITEM",
      undefined,
      { Accept: "application/json" }
    );

    expect(resJson.statusCode).toBe(200);
    expect(resJson.json).toBeDefined();
    expect(resJson.json.finalidadeEscolhida).toBe("EXECUTAR_ITEM");
    expect(resJson.json.pacoteProporcional.finalidadeDeclarada).toBe("EXECUTAR_ITEM");
    expect(resJson.json.pacoteProporcional.alvoPrincipal.codigo).toBe("IT-016");
    expect(resJson.json.trilha.codigoEntidade).toBe("IT-016");
  });

  it("Critério 4: Redirecionamento por busca rápida de código (/rastreabilidade/consulta)", async () => {
    const res = await requisitar(servidor, "GET", "/rastreabilidade/consulta?codigo=EV-004&finalidade=AUDITAR_FORMACAO");

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/rastreabilidade/entrega_de_valor/EV-004");
    expect(res.headers.location).toContain("finalidade=AUDITAR_FORMACAO");
  });

  it("Critério 5: Auditoria disparada via POST e Suíte Integrada da EV-004 End-to-End", async () => {
    // 1. Dispara auditoria via POST /rastreabilidade/auditar
    const resAudit = await requisitar(
      servidor,
      "POST",
      "/rastreabilidade/auditar",
      {},
      { Accept: "application/json" }
    );

    expect(resAudit.statusCode).toBe(200);
    expect(resAudit.json.ok).toBe(true);

    // 2. Consulta painel em formato JSON
    const resPainel = await requisitar(
      servidor,
      "GET",
      "/rastreabilidade",
      undefined,
      { Accept: "application/json" }
    );

    expect(resPainel.statusCode).toBe(200);
    expect(resPainel.json.relatorio).toBeDefined();
    expect(resPainel.json.relatorio.diagnosticoGeral).toBeDefined();
    expect(Array.isArray(resPainel.json.registrosRecentes)).toBe(true);
    expect(Array.isArray(resPainel.json.vinculosRecentes)).toBe(true);
  });
});
