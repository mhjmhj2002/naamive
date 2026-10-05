import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  Necessidade,
  TipoNecessidade,
  StatusNecessidade,
  StatusProjeto,
  Projeto,
  TrabalhoCoordenado,
  CondicaoOperacionalTrabalho,
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioNecessidadePostgres,
  RepositorioProjetoPostgres,
  RepositorioCoordenacaoPostgres,
  ServicoAplicacaoProjeto,
  ServicoAplicacaoCoordenacao,
  AdaptadorAutenticacaoOwner,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  FilaTarefasMemoria,
  WorkerSegundoPlano,
  DespachanteAutonomoAgentes,
  PortaDespachoAgente,
  ResultadoDespachoAgente,
  criarServidorWeb,
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
        host: "127.0.0.1",
        port: addr.port,
        method: metodo,
        path: caminho,
        headers,
      },
      (res) => {
        let corpo = "";
        res.on("data", (chunk) => {
          corpo += chunk.toString("utf-8");
        });
        res.on("end", () => {
          let json: any = undefined;
          if (res.headers["content-type"]?.includes("application/json")) {
            try {
              json = JSON.parse(corpo);
            } catch (e) {
              // não é json válido
            }
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: corpo,
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

describe("DEB-TEC-001 — Fase 3 e Fase 4: Camada Web de Supervisão e Testes Integrados E2E", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoNecessidade: RepositorioNecessidadePostgres;
  let repoProjeto: RepositorioProjetoPostgres;
  let repoCoordenacao: RepositorioCoordenacaoPostgres;
  let servicoProjeto: ServicoAplicacaoProjeto;
  let servicoCoordenacao: ServicoAplicacaoCoordenacao;
  let autenticacaoOwner: AdaptadorAutenticacaoOwner;
  let portaProjeto: AdaptadorIntegracaoProjeto;
  let portaContexto: AdaptadorIntegracaoContexto;
  let filaTarefas: FilaTarefasMemoria;
  let despachanteAutonomo: DespachanteAutonomoAgentes;
  let worker: WorkerSegundoPlano;
  let server: http.Server;

  const projetoId = "proj-e2e-deb-tec-001";
  const acionamentosAgentes: { ator: string; token: string; codigo: string }[] = [];

  beforeEach(async () => {
    acionamentosAgentes.length = 0;
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
    conexao = new GerenciadorConexao(undefined, pgPool);

    const migrador = new ExecutorMigracoes(conexao);
    await migrador.executarMigracoes();

    repoNecessidade = new RepositorioNecessidadePostgres(conexao);
    repoProjeto = new RepositorioProjetoPostgres(conexao);
    repoCoordenacao = new RepositorioCoordenacaoPostgres(conexao);
    filaTarefas = new FilaTarefasMemoria();

    servicoProjeto = new ServicoAplicacaoProjeto(repoProjeto, repoNecessidade);
    servicoCoordenacao = new ServicoAplicacaoCoordenacao(repoCoordenacao, repoProjeto, filaTarefas);
    autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
    portaContexto = new AdaptadorIntegracaoContexto();

    // Semeia Necessidade
    const nec = new Necessidade({
      id: "nec-e2e-001",
      codigo: "N-001",
      titulo: "Autonomia do NAAMIVE",
      tipo: TipoNecessidade.NOVO_PRODUTO,
      problemaOuOportunidade: "Orquestração contínua",
      quemEAfetado: "Usuários e Agentes",
      resultadoPretendido: "Ciclo autônomo e2e",
      escopoInicial: "Escopo inicial",
      foraDeEscopo: "Fora de escopo",
      criterioDeAtendimento: "Atendimento completo",
      porQueIssoImporta: "Autonomia progressiva",
      restricoesOuDependencias: "Gates do Owner",
      origem: "DEB-TEC-001",
    });
    await repoNecessidade.salvar(nec);

    // Semeia Projeto
    const proj = new Projeto({
      id: projetoId,
      codigo: "P-001",
      necessidadeId: "nec-e2e-001",
      titulo: "Jornada Autônoma do NAAMIVE",
      status: StatusProjeto.FORMADO,
    });
    await repoProjeto.salvar(proj);

    // Mock da Porta de Despacho de Agentes
    const mockPortaDespacho: PortaDespachoAgente = {
      async despacharAgente(handoff): Promise<ResultadoDespachoAgente> {
        acionamentosAgentes.push({
          ator: handoff.atorDestinatario,
          token: handoff.tokenCorrelacao,
          codigo: handoff.conteudoHandoff.codigoTrabalho,
        });
        return {
          sucesso: true,
          tokenCorrelacao: handoff.tokenCorrelacao,
          ator: handoff.atorDestinatario,
          skill: handoff.skillDestinataria,
          resultadoObservavel: `Trabalho ${handoff.conteudoHandoff.codigoTrabalho} realizado com êxito pelo Ator ${handoff.atorDestinatario}.`,
        };
      },
    };

    despachanteAutonomo = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);

    worker = new WorkerSegundoPlano(
      filaTarefas,
      repoNecessidade,
      portaProjeto,
      portaContexto,
      { intervaloPollingMs: 50, modoAutonomoAtivo: true },
      servicoCoordenacao,
      undefined,
      undefined,
      despachanteAutonomo
    );

    server = criarServidorWeb({
      repositorio: repoNecessidade,
      autenticacaoOwner,
      portaProjeto,
      portaContexto,
      filaTarefas,
      servicoProjeto,
      repositorioProjeto: repoProjeto,
      servicoCoordenacao,
      repositorioCoordenacao: repoCoordenacao,
      workerSegundoPlano: worker,
      despachanteAutonomo,
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterEach(async () => {
    await worker.parar();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await conexao.encerrar();
  });

  it("Critério 1: Painel Web /coordenacao deve renderizar status do modo autônomo, histórico de handoffs e controles", async () => {
    // Cria um trabalho em PREPARADO
    const trb = new TrabalhoCoordenado({
      id: "trb-web-01",
      codigo: "IT-WEB-01",
      projetoId,
      titulo: "Desenvolvimento da Camada Web",
      objetivo: "Supervisão e controles",
      competenciaRequerida: "Engenharia de Software",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Interface responsiva",
      dependencias: [],
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });
    await repoCoordenacao.salvar(trb);

    // 1. GET /coordenacao em HTML
    const resHtml = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoId}`);
    expect(resHtml.statusCode).toBe(200);
    expect(resHtml.headers["content-type"]).toContain("text/html");
    expect(resHtml.body).toContain("Modo Autônomo de Agentes");
    expect(resHtml.body).toContain("ATIVO (CONTÍNUO)");
    expect(resHtml.body).toContain("Pausar Modo Autônomo");
    expect(resHtml.body).toContain("Processar Ciclo Agora");
    expect(resHtml.body).toContain("Painel de Handoffs e Despacho de Agentes");

    // 2. GET /coordenacao em JSON
    const resJson = await requisitar(
      server,
      "GET",
      `/coordenacao?projetoId=${projetoId}`,
      undefined,
      { Accept: "application/json" }
    );
    expect(resJson.statusCode).toBe(200);
    expect(resJson.json?.supervisao?.modoAutonomoAtivo).toBe(true);
    expect(Array.isArray(resJson.json?.supervisao?.handoffsRecentes)).toBe(true);
  });

  it("Critério 2: Alternância do Modo Autônomo via POST /coordenacao/modo-autonomo deve pausar e retomar o despachante", async () => {
    expect(worker.estaModoAutonomoAtivo).toBe(true);

    // Pausa o modo autônomo via API
    const resPausar = await requisitar(
      server,
      "POST",
      "/coordenacao/modo-autonomo",
      { projetoId, ativo: false },
      { Accept: "application/json" }
    );
    expect(resPausar.statusCode).toBe(200);
    expect(resPausar.json?.modoAutonomoAtivo).toBe(false);
    expect(worker.estaModoAutonomoAtivo).toBe(false);

    // Valida reflexo no HTML
    const resHtmlPausado = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoId}`);
    expect(resHtmlPausado.body).toContain("PAUSADO (SUPERVISÃO MANUAL)");
    expect(resHtmlPausado.body).toContain("Ativar Modo Autônomo");

    // Reativa o modo autônomo via formulário (redirecionamento 302)
    const resAtivar = await requisitar(
      server,
      "POST",
      "/coordenacao/modo-autonomo",
      { projetoId, ativo: "true" }
    );
    expect(resAtivar.statusCode).toBe(302);
    expect(worker.estaModoAutonomoAtivo).toBe(true);
  });

  it("Critério 3: Disparo manual de ciclo via POST /coordenacao/executar-ciclo deve acionar o despachante sob demanda", async () => {
    const trb = new TrabalhoCoordenado({
      id: "trb-ciclo-01",
      codigo: "IT-CICLO-01",
      projetoId,
      titulo: "Trabalho sob demanda",
      objetivo: "Executar ciclo",
      competenciaRequerida: "Engenharia de Software",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Concluído",
      dependencias: [],
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });
    await repoCoordenacao.salvar(trb);

    const resCiclo = await requisitar(
      server,
      "POST",
      "/coordenacao/executar-ciclo",
      { projetoId },
      { Accept: "application/json" }
    );

    expect(resCiclo.statusCode).toBe(200);
    expect(resCiclo.json?.ok).toBe(true);
    expect(resCiclo.json?.resultadoCiclo?.despachosRealizados).toBe(1);
    expect(acionamentosAgentes.length).toBe(1);

    const trbSalvo = await repoCoordenacao.obterPorId("trb-ciclo-01");
    expect(trbSalvo?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
  });

  it("Critério 4: Exibição de Gate Humano (Owner) e liberação ágil via POST /coordenacao/trabalhos/:id/decisao-owner", async () => {
    // Trabalho exclusivo do Owner
    const trbOwner = new TrabalhoCoordenado({
      id: "trb-gate-01",
      codigo: "EV-HOMOLOG-01",
      projetoId,
      titulo: "Homologação do Owner na Entrega de Valor",
      objetivo: "Decisão soberana do Owner",
      competenciaRequerida: "Governança Humana",
      atorRequerido: "Owner",
      criterioTermino: "homologado_pelo_owner",
      dependencias: [],
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });
    await repoCoordenacao.salvar(trbOwner);

    // Executa ciclo do despachante: deve conter o trabalho em AGUARDANDO_DECISAO_HUMANA
    await despachanteAutonomo.executarCicloAutonomo(projetoId);
    const trbContido = await repoCoordenacao.obterPorId("trb-gate-01");
    expect(trbContido?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);

    // Inspeciona HTML da tela /coordenacao: deve exibir cartão de Gate Humano com botão de liberação
    const resHtml = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoId}`);
    expect(resHtml.body).toContain("painel-gate-humano");
    expect(resHtml.body).toContain("Ponto de Interrupção Humana (Human-in-the-Loop) Requerido");
    expect(resHtml.body).toContain("btn-liberar-gate-EV-HOMOLOG-01");

    // Executa liberação do Gate com usuário autorizado 'mhj'
    const resLiberar = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${trbOwner.id}/decisao-owner`,
      {
        usuario: "mhj",
        diretriz: "Homologação soberana aprovada pelo Owner mhj",
      },
      { Accept: "application/json" }
    );

    expect(resLiberar.statusCode).toBe(200);
    expect(resLiberar.json?.ok).toBe(true);
    expect(resLiberar.json?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

    const trbLiberado = await repoCoordenacao.obterPorId("trb-gate-01");
    expect(trbLiberado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
  });

  it("Critério 5: Ciclo Contínuo E2E Integrado com Worker, Despachante Autônomo, Painel e Rastreabilidade M-004", async () => {
    // Cadeia completa com 3 trabalhos:
    // T1 (Executor Agêntico) -> T2 (Integrador Agêntico) -> T3 (Owner Humano)
    const t1 = new TrabalhoCoordenado({
      id: "trb-e2e-01",
      codigo: "IT-E2E-01",
      projetoId,
      titulo: "Execução Técnica de Código",
      objetivo: "Implementar e codificar",
      competenciaRequerida: "Engenharia de Software",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Código produzido",
      dependencias: [],
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });

    const t2 = new TrabalhoCoordenado({
      id: "trb-e2e-02",
      codigo: "IT-E2E-02",
      projetoId,
      titulo: "Integração e Testes Automatizados",
      objetivo: "Validar suíte integrada",
      competenciaRequerida: "Integração Técnica",
      atorRequerido: "Integrador da Realização",
      skillRequerida: "integracao-da-realizacao",
      criterioTermino: "Suíte integrada verde",
      dependencias: ["IT-E2E-01"],
      condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
    });

    const t3 = new TrabalhoCoordenado({
      id: "trb-e2e-03",
      codigo: "IT-E2E-03",
      projetoId,
      titulo: "Homologação do Owner da EV",
      objetivo: "Homologação soberana final",
      competenciaRequerida: "Governança Humana",
      atorRequerido: "Owner",
      criterioTermino: "homologado_pelo_owner",
      dependencias: ["IT-E2E-02"],
      condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
    });

    await repoCoordenacao.salvar(t1);
    await repoCoordenacao.salvar(t2);
    await repoCoordenacao.salvar(t3);

    // 1. Worker processa tarefa assíncrona DESPACHAR_HANDOFF_AUTONOMO
    await filaTarefas.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", { projetoId });
    const processado = await worker.executarCicloUnico();
    expect(processado).toBe(true);

    // T1 foi despachado e finalizado; T2 foi promovido para PREPARADO
    const t1Apos = await repoCoordenacao.obterPorId("trb-e2e-01");
    const t2Apos = await repoCoordenacao.obterPorId("trb-e2e-02");
    expect(t1Apos?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
    expect(t2Apos?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

    // 2. Segunda rodada do worker: processa T2 e promove T3 para PREPARADO e em seguida contém T3 (Owner)
    await filaTarefas.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", { projetoId });
    await worker.executarCicloUnico();

    const t2Final = await repoCoordenacao.obterPorId("trb-e2e-02");
    expect(t2Final?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);

    // Terceira rodada para avaliar T3
    await filaTarefas.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", { projetoId });
    await worker.executarCicloUnico();

    const t3Final = await repoCoordenacao.obterPorId("trb-e2e-03");
    expect(t3Final?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);

    // 3. Consulta ao painel web: deve listar todos os handoffs recentes na tabela de supervisão
    const resVisao = await requisitar(
      server,
      "GET",
      `/coordenacao?projetoId=${projetoId}`,
      undefined,
      { Accept: "application/json" }
    );
    expect(resVisao.statusCode).toBe(200);
    expect(resVisao.json?.supervisao?.handoffsRecentes?.length).toBeGreaterThanOrEqual(2);

    // Inspeciona HTML para garantir que o painel de handoffs e o gate humano estão visíveis
    const resHtmlFinal = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoId}`);
    expect(resHtmlFinal.body).toContain("painel-gate-humano");
    expect(resHtmlFinal.body).toContain("painel-handoffs-supervisao");
    expect(resHtmlFinal.body).toContain("IT-E2E-01");
    expect(resHtmlFinal.body).toContain("IT-E2E-02");

    // 4. Libera o Gate Humano do Owner via web
    const resLiberarFinal = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${t3.id}/decisao-owner`,
      {
        usuario: "mhj",
        diretriz: "Entrega de Valor homologada com sucesso pelo Owner mhj",
      },
      { Accept: "application/json" }
    );
    expect(resLiberarFinal.statusCode).toBe(200);
    expect(resLiberarFinal.json?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

    // Após liberação, o Gate Humano desaparece da tela
    const resHtmlPosLiberacao = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoId}`);
    expect(resHtmlPosLiberacao.body).not.toContain("painel-gate-humano");
  });
});
