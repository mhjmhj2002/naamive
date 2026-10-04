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

describe("IT-012 — Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada", () => {
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
  let worker: WorkerSegundoPlano;
  let server: http.Server;

  const projetoIdPadrao = "proj-e2e-coord-001";

  beforeEach(async () => {
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

    // Seed N-001 e P-001 para satisfazer restrições relacionais de chave estrangeira
    const nec = new Necessidade({
      id: "nec-e2e-001",
      codigo: "N-001",
      titulo: "Demanda Canônica NAAMIVE",
      tipo: TipoNecessidade.NOVO_PRODUTO,
      problemaOuOportunidade: "Coordenação manual",
      quemEAfetado: "Equipes de IA",
      resultadoPretendido: "Condução autônoma",
      escopoInicial: "Escopo inicial",
      foraDeEscopo: "Fora de escopo",
      criterioDeAtendimento: "Critério de atendimento",
      porQueIssoImporta: "Relevância técnica",
      restricoesOuDependencias: "Nenhuma",
      origem: "Seed Teste",
    });
    await repoNecessidade.salvar(nec);

    const proj = new Projeto({
      id: projetoIdPadrao,
      codigo: "P-001",
      necessidadeId: "nec-e2e-001",
      titulo: "Jornada Autônoma do NAAMIVE",
      status: StatusProjeto.FORMADO,
    });
    await repoProjeto.salvar(proj);

    filaTarefas = new FilaTarefasMemoria();
    servicoProjeto = new ServicoAplicacaoProjeto(repoProjeto, repoNecessidade);
    servicoCoordenacao = new ServicoAplicacaoCoordenacao(repoCoordenacao, repoProjeto, filaTarefas);
    autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
    portaContexto = new AdaptadorIntegracaoContexto();

    worker = new WorkerSegundoPlano(
      filaTarefas,
      repoNecessidade,
      portaProjeto,
      portaContexto,
      { intervaloPollingMs: 50 },
      servicoCoordenacao
    );
    worker.iniciar();

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
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterEach(async () => {
    await worker.parar();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("Critério 1: Navegação Web Responsiva — deve renderizar o painel /coordenacao e listar trabalhos", async () => {
    // Cadastra 2 trabalhos: um PREPARADO e um POSSIVEL com dependência
    await servicoCoordenacao.cadastrarTrabalho({
      codigo: "TRAB-001",
      projetoId: projetoIdPadrao,
      titulo: "Fundação Técnica de Banco de Dados",
      objetivo: "Criar migrações relacionais",
      competenciaRequerida: "Engenharia de Dados",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Migrações executadas com 100% de sucesso",
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });

    await servicoCoordenacao.cadastrarTrabalho({
      codigo: "TRAB-002",
      projetoId: projetoIdPadrao,
      titulo: "Interface Responsiva HTTP",
      objetivo: "Criar telas Bootstrap 5",
      competenciaRequerida: "Engenharia Web",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Telas renderizadas com sucesso",
      dependencias: ["TRAB-001"],
      condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
    });

    // Requisição GET /coordenacao
    const res = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoIdPadrao}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Coordenação do Trabalho Preparado");
    expect(res.body).toContain("TRAB-001");
    expect(res.body).toContain("TRAB-002");
    expect(res.body).toContain("Próximo Avanço Válido Identificado Deterministicamente");
    expect(res.body).toContain("Delegar Próximo Avanço");

    // Requisição via API JSON
    const resJson = await requisitar(server, "GET", `/coordenacao?projetoId=${projetoIdPadrao}`, undefined, {
      Accept: "application/json",
    });
    expect(resJson.statusCode).toBe(200);
    expect(resJson.json.totalTrabalhos).toBe(2);
    expect(resJson.json.proximoAvancoValido.codigo).toBe("TRAB-001");
  });

  it("Critério 2: Despacho com Um Clique — deve delegar próximo avanço emitindo handoff e atualizando para EM_EXECUCAO", async () => {
    const trab = await servicoCoordenacao.cadastrarTrabalho({
      codigo: "TRAB-010",
      projetoId: projetoIdPadrao,
      titulo: "Implementação do Núcleo de Domínio",
      objetivo: "Construir entidades puras",
      competenciaRequerida: "Desenvolvimento TypeScript",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Testes unitários aprovados",
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });

    // Dispara POST /coordenacao/trabalhos/:id/despachar
    const resDespacho = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${trab.id}/despachar`,
      {
        projetoId: projetoIdPadrao,
        executorDesignado: "Engenheiro-Agente-01",
      },
      { Accept: "application/json" }
    );

    expect(resDespacho.statusCode).toBe(200);
    expect(resDespacho.json.codigoTrabalho).toBe("TRAB-010");
    expect(resDespacho.json.tokenCorrelacao).toMatch(/^hdof-trab-010-/);

    // Consulta os detalhes do trabalho após o despacho
    const resDetalhes = await requisitar(
      server,
      "GET",
      `/coordenacao/trabalhos/${trab.id}`,
      undefined,
      { Accept: "application/json" }
    );
    expect(resDetalhes.statusCode).toBe(200);
    expect(resDetalhes.json.trabalho._condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);
    expect(resDetalhes.json.handoffAtivo).not.toBeNull();
    expect(resDetalhes.json.handoffAtivo.tokenCorrelacao).toBe(resDespacho.json.tokenCorrelacao);
  });

  it("Critério 3: Exibição do Handoff com Contexto Recuperável — deve inspecionar pacote estruturado", async () => {
    const trab = await servicoCoordenacao.cadastrarTrabalho({
      codigo: "TRAB-020",
      projetoId: projetoIdPadrao,
      titulo: "Construção de Testes de Integração",
      objetivo: "Validar persistência relacional",
      competenciaRequerida: "Qualidade de Software",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Suíte com 100% de sucesso",
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });

    const handoff = await servicoCoordenacao.despacharProximoAvanco(trab.id, {
      projeto: "P-001",
      necessidade: "N-001",
      modulo: "M-003",
      entregaDeValor: "EV-003",
      documentosNormativos: ["documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md"],
    });

    // Inspeciona rota GET /coordenacao/handoffs/:id
    const resHandoffHtml = await requisitar(server, "GET", `/coordenacao/handoffs/${handoff.handoffId}`);
    expect(resHandoffHtml.statusCode).toBe(200);
    expect(resHandoffHtml.body).toContain("Pacote Estruturado do Handoff");
    expect(resHandoffHtml.body).toContain(handoff.tokenCorrelacao);
    expect(resHandoffHtml.body).toContain("Contexto Recuperável do Handoff");
    expect(resHandoffHtml.body).toContain("TRAB-020");

    // Inspeciona via API JSON
    const resHandoffJson = await requisitar(
      server,
      "GET",
      `/coordenacao/handoffs/${handoff.handoffId}`,
      undefined,
      { Accept: "application/json" }
    );
    expect(resHandoffJson.statusCode).toBe(200);
    expect(resHandoffJson.json.handoff.tokenCorrelacao).toBe(handoff.tokenCorrelacao);
    expect(resHandoffJson.json.handoff.conteudoHandoff.referenciasContexto.projeto).toBe("P-001");
  });

  it("Critério 4: Decisão Soberana do Owner e Desbloqueio — deve proteger com identidade autenticada 'mhj'", async () => {
    const trab = await servicoCoordenacao.cadastrarTrabalho({
      codigo: "TRAB-030",
      projetoId: projetoIdPadrao,
      titulo: "Homologação de Mudança Crítica",
      objetivo: "Aguardar direcionamento estratégico",
      competenciaRequerida: "Governança",
      atorRequerido: "Owner",
      criterioTermino: "Decisão documentada",
      condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
    });

    // Bloqueia com pendência do Owner
    trab.aguardarDecisaoHumana("Dilema de compatibilidade arquitetural dependente de decisão do Owner");
    await repoCoordenacao.salvar(trab);

    // Tentativa 1: Usuário não autorizado (deve ser rejeitado com 403)
    const resInvalido = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${trab.id}/decisao-owner`,
      {
        usuario: "invasor",
        diretriz: "Aprovar tudo sem autoridade",
      },
      { Accept: "application/json" }
    );
    expect(resInvalido.statusCode).toBe(403);

    // Tentativa 2: Usuário Owner soberano ('mhj')
    const resValido = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${trab.id}/decisao-owner`,
      {
        usuario: "mhj",
        diretriz: "Autorizo a realização técnica com isolamento completo e sem regressões.",
      },
      { Accept: "application/json" }
    );
    expect(resValido.statusCode).toBe(200);
    expect(resValido.json.ok).toBe(true);
    expect(resValido.json.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

    // Confirma persistência
    const trabAtualizado = await repoCoordenacao.obterPorId(trab.id);
    expect(trabAtualizado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
    expect(trabAtualizado?.motivoBloqueio).toBeNull();
  });

  it("Critério 5: Ciclo Completo End-to-End da EV-003 via Camada Web — Despacho, Retorno e Desbloqueio Sucessor", async () => {
    // 1. Cadastra Trabalho A (preparado) e Trabalho B (depende de A)
    const trabA = await servicoCoordenacao.cadastrarTrabalho({
      codigo: "ETAPA-A",
      projetoId: projetoIdPadrao,
      titulo: "Etapa de Infraestrutura",
      objetivo: "Subir banco de dados",
      competenciaRequerida: "DevOps",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Infra disponível",
      condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
    });

    const trabB = await servicoCoordenacao.cadastrarTrabalho({
      codigo: "ETAPA-B",
      projetoId: projetoIdPadrao,
      titulo: "Etapa de Negócio",
      objetivo: "Executar regras",
      competenciaRequerida: "Desenvolvimento",
      atorRequerido: "Engenheiro de Software",
      skillRequerida: "execucao-do-item-de-trabalho",
      criterioTermino: "Regras executadas",
      dependencias: ["ETAPA-A"],
      condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
    });

    // 2. Despacha ETAPA-A via HTTP
    const resDespachoA = await requisitar(
      server,
      "POST",
      `/coordenacao/trabalhos/${trabA.id}/despachar`,
      { projetoId: projetoIdPadrao },
      { Accept: "application/json" }
    );
    expect(resDespachoA.statusCode).toBe(200);
    const tokenA = resDespachoA.json.tokenCorrelacao;

    // 3. Registra Retorno de sucesso de ETAPA-A via HTTP
    const resRetornoA = await requisitar(
      server,
      "POST",
      `/coordenacao/retornos`,
      {
        tokenCorrelacao: tokenA,
        sucesso: true,
        resultadoObservavel: "Infraestrutura provisionada com sucesso e validada.",
      },
      { Accept: "application/json" }
    );
    expect(resRetornoA.statusCode).toBe(200);
    expect(resRetornoA.json.condicaoOperacionalResultante).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
    expect(resRetornoA.json.trabalhosPromovidos).toContain("ETAPA-B");

    // 4. Verifica se ETAPA-B foi automaticamente promovida para PREPARADO e agora é o Próximo Avanço Válido
    const resVisao = await requisitar(
      server,
      "GET",
      `/coordenacao?projetoId=${projetoIdPadrao}`,
      undefined,
      { Accept: "application/json" }
    );
    expect(resVisao.statusCode).toBe(200);
    expect(resVisao.json.proximoAvancoValido.codigo).toBe("ETAPA-B");
    expect(resVisao.json.encerrados.map((t: any) => t._codigo || t.codigo)).toContain("ETAPA-A");

    // 5. Inspeciona a página HTML de detalhes de ETAPA-B comprovando dependência satisfeita
    const resDetalhesB = await requisitar(server, "GET", `/coordenacao/trabalhos/${trabB.id}`);
    expect(resDetalhesB.statusCode).toBe(200);
    expect(resDetalhesB.body).toContain("ETAPA-B");
    expect(resDetalhesB.body).toContain("Satisfeita");
    expect(resDetalhesB.body).toContain("Trabalho Preparado e Elegível para Despacho");
  });
});
