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
  RepositorioVerificacaoPostgres,
  ServicoAplicacaoProjeto,
  ServicoAplicacaoCoordenacao,
  ServicoContexto,
  ServicoVerificacao,
  AdaptadorAutenticacaoOwner,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  FilaTarefasMemoria,
  WorkerSegundoPlano,
  criarServidorWeb,
  MetodoObservacao,
  ConclusaoVerificacao,
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
              // não é JSON válido
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

    req.on("error", (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

describe("IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoVerificacao: RepositorioVerificacaoPostgres;
  let repoContexto: RepositorioContextoPostgres;
  let servicoVerificacao: ServicoVerificacao;
  let filaTarefas: FilaTarefasMemoria;
  let worker: WorkerSegundoPlano;
  let servidor: http.Server;

  beforeEach(async () => {
    // 1. Configura emulador relacional pg-mem
    dbMem = newDb();
    let backup: any = null;
    const origQuery = dbMem.public.query.bind(dbMem.public);
    (dbMem.public as any).query = function (text: any) {
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
    conexao = new GerenciadorConexao(undefined, pgPool);

    const migrador = new ExecutorMigracoes(conexao);
    await migrador.executarMigracoes();

    const repoNecessidade = new RepositorioNecessidadePostgres(conexao);
    const repoProjeto = new RepositorioProjetoPostgres(conexao);
    const repoCoordenacao = new RepositorioCoordenacaoPostgres(conexao);
    repoContexto = new RepositorioContextoPostgres(conexao);
    repoVerificacao = new RepositorioVerificacaoPostgres(conexao);

    filaTarefas = new FilaTarefasMemoria();

    const portaContexto = new AdaptadorIntegracaoContexto();
    servicoVerificacao = new ServicoVerificacao(
      repoVerificacao,
      undefined,
      portaContexto,
      filaTarefas
    );

    const servicoProjeto = new ServicoAplicacaoProjeto(repoProjeto, repoNecessidade);
    const servicoCoordenacao = new ServicoAplicacaoCoordenacao(repoCoordenacao, repoProjeto, filaTarefas);
    const servicoContexto = new ServicoContexto(repoContexto, undefined, filaTarefas);
    const autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    const portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);

    worker = new WorkerSegundoPlano(
      filaTarefas,
      repoNecessidade,
      portaProjeto,
      portaContexto,
      { intervaloPollingMs: 50 },
      servicoCoordenacao,
      servicoContexto,
      servicoVerificacao
    );
    worker.iniciar();

    servidor = criarServidorWeb({
      repositorio: repoNecessidade,
      autenticacaoOwner,
      portaProjeto,
      portaContexto,
      filaTarefas,
      servicoProjeto,
      repositorioProjeto: repoProjeto,
      servicoCoordenacao,
      repositorioCoordenacao: repoCoordenacao,
      servicoContexto,
      repositorioContexto: repoContexto,
      servicoVerificacao,
      repositorioVerificacao: repoVerificacao,
    });

    await new Promise<void>((resolve) => {
      servidor.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterEach(async () => {
    await worker.parar();
    await new Promise<void>((resolve) => {
      servidor.close(() => resolve());
    });
  });

  it("Critério 1: Navegação Web Responsiva — deve renderizar o painel /verificacao com Bootstrap 5 e métricas consolidadas", async () => {
    const res = await requisitar(servidor, "GET", "/verificacao");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Verificação do Resultado de Software (M-005)");
    expect(res.body).toContain("Matriz Consolidada de Conformidade Técnica");
    expect(res.body).toContain("Critérios Demonstrados");
    expect(res.body).toContain("Evidência Insuficiente");
    expect(res.body).toContain("Divergências Encontradas");
    expect(res.body).toContain("/verificacao");
  });

  it("Critério 2: Registro e Detalhes da Matriz — deve registrar resultado de software e renderizar /verificacao/:id com critérios e badges de conclusão", async () => {
    // 1. Cadastra Resultado de Software via API JSON
    const resRegistro = await requisitar(
      servidor,
      "POST",
      "/verificacao/resultados",
      {
        codigoReferencia: "RES-EV005-TESTE",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "1.0.0",
        descricao: "Build do motor de verificação de software",
        declaradoPor: "Engenheiro de Software",
      },
      { Accept: "application/json" }
    );

    expect(resRegistro.statusCode).toBe(201);
    expect(resRegistro.json.codigoReferencia).toBe("RES-EV005-TESTE");
    const resultadoId = resRegistro.json.id;

    // 2. Cadastra Critério Verificável
    const resCriterio = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/criterios`,
      {
        codigo: "CRIT-WEB-001",
        origemNormativa: "EV-005 Critério 1",
        descricaoComportamento: "Rotas HTTP e templates renderizam sem erro",
        metodoObservacao: MetodoObservacao.INSPECAO_HTTP,
        condicaoSatisfacao: "Status 200 retornado e HTML com Bootstrap",
      },
      { Accept: "application/json" }
    );

    expect(resCriterio.statusCode).toBe(201);
    expect(resCriterio.json.codigo).toBe("CRIT-WEB-001");
    const criterioId = resCriterio.json.id;

    // 3. Consulta Detalhes HTML do Laudo
    const resHtml = await requisitar(servidor, "GET", `/verificacao/${resultadoId}`);
    expect(resHtml.statusCode).toBe(200);
    expect(resHtml.body).toContain("RES-EV005-TESTE");
    expect(resHtml.body).toContain("CRIT-WEB-001");
    expect(resHtml.body).toContain("INSPECAO_HTTP");
    expect(resHtml.body).toContain("EVIDENCIA_INSUFICIENTE"); // Inicialmente sem evidência
  });

  it("Critério 3: Coleta de Evidência e Avaliação Estrita — deve confrontar evidências e atualizar laudo para CRITERIO_DEMONSTRADO", async () => {
    // 1. Cria resultado e critério
    const resReg = await requisitar(
      servidor,
      "POST",
      "/verificacao/resultados",
      {
        codigoReferencia: "RES-AVALIACAO-DEMO",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "1.0.0",
        descricao: "Módulo com evidências empíricas bem-sucedidas",
      },
      { Accept: "application/json" }
    );
    const resultadoId = resReg.json.id;

    const resCrit = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/criterios`,
      {
        codigo: "CRIT-AUTOMATIZADO-01",
        origemNormativa: "EV-005 Critério 2",
        descricaoComportamento: "Suíte automatizada de testes",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "100% de testes verdes",
      },
      { Accept: "application/json" }
    );
    const criterioId = resCrit.json.id;

    // 2. Registra Evidência com Sucesso
    const resEvidencia = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/evidencias`,
      {
        criterioId,
        procedimentoExecutado: "Execução vitest run tests/it020.test.ts",
        resultadoObservado: "5 testes executados com 100% de aprovação",
        sucesso: true,
        coletadoPor: "Vitest CLI",
      },
      { Accept: "application/json" }
    );
    expect(resEvidencia.statusCode).toBe(201);

    // 3. Executa Avaliação de Conformidade via POST
    const resAvaliacao = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/avaliar`,
      { emitidoPor: "Verificador da Entrega de Valor" },
      { Accept: "application/json" }
    );

    expect(resAvaliacao.statusCode).toBe(200);
    expect(resAvaliacao.json.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
    expect(resAvaliacao.json.laudoAgregado.demonstrados).toBe(1);
    expect(resAvaliacao.json.laudoAgregado.insuficientes).toBe(0);

    // 4. Inspeciona a página HTML de verificação
    const resHtml = await requisitar(servidor, "GET", `/verificacao/${resultadoId}`);
    expect(resHtml.statusCode).toBe(200);
    expect(resHtml.body).toContain("CRITERIO_DEMONSTRADO");
    expect(resHtml.body).toContain("5 testes executados com 100% de aprovação");
  });

  it("Critério 4: Reavaliação Assíncrona no Worker — deve agendar no worker e reconciliar conformidade", async () => {
    // 1. Cria resultado e critério
    const resReg = await requisitar(
      servidor,
      "POST",
      "/verificacao/resultados",
      {
        codigoReferencia: "RES-WORKER-RECONCILIACAO",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "2.0.0",
        descricao: "Reconciliação assíncrona pelo worker",
      },
      { Accept: "application/json" }
    );
    const resultadoId = resReg.json.id;

    const resCrit = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/criterios`,
      {
        codigo: "CRIT-WORKER-01",
        origemNormativa: "Norma M-005",
        descricaoComportamento: "Verificação assíncrona periódica",
        metodoObservacao: MetodoObservacao.OPERACIONAL,
        condicaoSatisfacao: "Worker processa sem erros",
      },
      { Accept: "application/json" }
    );
    const criterioId = resCrit.json.id;

    // Registra evidência positiva
    await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/evidencias`,
      {
        criterioId,
        procedimentoExecutado: "Polling assíncrono",
        resultadoObservado: "Processado pelo background job",
        sucesso: true,
        coletadoPor: "Worker",
      },
      { Accept: "application/json" }
    );

    // 2. Aciona POST de reavaliação em background
    const resAgendar = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/reavaliar-background`,
      {},
      { Accept: "application/json" }
    );

    expect(resAgendar.statusCode).toBe(200);
    expect(resAgendar.json.ok).toBe(true);
    expect(resAgendar.json.tarefaId).toBeDefined();

    // 3. Aguarda o worker processar
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 4. Inspeciona se o laudo foi persistido pelo worker
    const resDetalhe = await requisitar(
      servidor,
      "GET",
      `/verificacao/${resultadoId}`,
      undefined,
      { Accept: "application/json" }
    );

    expect(resDetalhe.statusCode).toBe(200);
    expect(resDetalhe.json.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
  });

  it("Critério 5: Detecção de Divergências — deve refletir divergências na matriz e exibir alert badges correspondentes", async () => {
    const resReg = await requisitar(
      servidor,
      "POST",
      "/verificacao/resultados",
      {
        codigoReferencia: "RES-COM-DIVERGENCIA",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "0.9.0",
        descricao: "Resultado com falha técnica comprovada",
      },
      { Accept: "application/json" }
    );
    const resultadoId = resReg.json.id;

    const resCrit = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/criterios`,
      {
        codigo: "CRIT-FALHA-01",
        origemNormativa: "EV-005",
        descricaoComportamento: "Comportamento com teste falhando",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Sem falhas",
      },
      { Accept: "application/json" }
    );
    const criterioId = resCrit.json.id;

    // Registra evidências conflitantes (uma de sucesso e uma de falha para o mesmo critério)
    await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/evidencias`,
      {
        criterioId,
        procedimentoExecutado: "Execução preliminar local",
        resultadoObservado: "Teste passou na máquina do desenvolvedor",
        sucesso: true,
        coletadoPor: "Desenvolvedor",
      },
      { Accept: "application/json" }
    );

    await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/evidencias`,
      {
        criterioId,
        procedimentoExecutado: "Execução no pipeline CI",
        resultadoObservado: "AssertionError: esperado true, recebido false",
        sucesso: false,
        coletadoPor: "Runner CI",
      },
      { Accept: "application/json" }
    );

    // Avalia
    const resAvaliar = await requisitar(
      servidor,
      "POST",
      `/verificacao/${resultadoId}/avaliar`,
      { emitidoPor: "Verificador Técnico" },
      { Accept: "application/json" }
    );

    expect(resAvaliar.statusCode).toBe(200);
    expect(resAvaliar.json.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA);
    expect(resAvaliar.json.laudoAgregado.divergencias).toBe(1);

    // Inspeciona página HTML
    const resHtml = await requisitar(servidor, "GET", `/verificacao/${resultadoId}`);
    expect(resHtml.statusCode).toBe(200);
    expect(resHtml.body).toContain("DIVERGENCIA_ENCONTRADA");
    expect(resHtml.body).toContain("AssertionError");
  });
});
