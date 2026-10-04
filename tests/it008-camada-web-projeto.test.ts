import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  Necessidade,
  TipoNecessidade,
  StatusNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  AtorCompetenteNecessidade,
  ServicoCompromissoNecessidade,
  AdaptadorAutenticacaoOwner,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  FilaTarefasMemoria,
  WorkerSegundoPlano,
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioNecessidadePostgres,
  RepositorioProjetoPostgres,
  ServicoAplicacaoProjeto,
  StatusProjeto,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
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

describe("IT-008 — Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let gerenciadorConexao: GerenciadorConexao;
  let repositorioNecessidade: RepositorioNecessidadePostgres;
  let repositorioProjeto: RepositorioProjetoPostgres;
  let servicoProjeto: ServicoAplicacaoProjeto;
  let autenticacaoOwner: AdaptadorAutenticacaoOwner;
  let portaProjeto: AdaptadorIntegracaoProjeto;
  let portaContexto: AdaptadorIntegracaoContexto;
  let filaTarefas: FilaTarefasMemoria;
  let servidor: http.Server;

  beforeEach(async () => {
    // 1. Configurar PostgreSQL simulado transacional com pg-mem
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

    // 2. Aplicar migrações (001 a 004)
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    // 3. Instanciar infraestrutura e serviços
    repositorioNecessidade = new RepositorioNecessidadePostgres(gerenciadorConexao);
    repositorioProjeto = new RepositorioProjetoPostgres(gerenciadorConexao);
    servicoProjeto = new ServicoAplicacaoProjeto(repositorioProjeto, repositorioNecessidade);
    autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
    portaContexto = new AdaptadorIntegracaoContexto();
    filaTarefas = new FilaTarefasMemoria();

    // 4. Instanciar servidor web responsivo
    servidor = criarServidorWeb({
      repositorio: repositorioNecessidade,
      repositorioProjeto,
      servicoProjeto,
      autenticacaoOwner,
      portaProjeto,
      portaContexto,
      filaTarefas,
    });

    await new Promise<void>((resolve) => {
      servidor.listen(0, "127.0.0.1", () => resolve());
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      servidor.close(() => resolve());
    });
    await gerenciadorConexao.encerrar();
  });

  describe("Critério 1: Navegação Web Responsiva de Projetos", () => {
    it("deve renderizar a listagem de projetos via GET /projetos (vazia ou populada)", async () => {
      const res = await requisitar(servidor, "GET", "/projetos");
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.body).toContain("Projetos de Software (M-002)");
      expect(res.body).toContain("bootstrap@5.3.3");
      expect(res.body).toContain("Nenhum Projeto materializado");
    });

    it("deve renderizar a listagem com o projeto quando materializado", async () => {
      // Criar necessidade e bootstrap de projeto
      const nec = new Necessidade({
        id: "nec-web-01",
        codigo: "N-W01",
        titulo: "Demanda Web 01",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repositorioNecessidade.salvar(nec);

      const conf = await servicoProjeto.solicitarBootstrapProjeto({
        necessidadeId: "nec-web-01",
        codigoNecessidade: "N-W01",
        tituloProjeto: "Projeto Demanda Web 01",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      const res = await requisitar(servidor, "GET", "/projetos");
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("Projeto Demanda Web 01");
      expect(res.body).toContain("EM_FORMACAO");
      expect(res.body).toContain(`/projetos/${conf.projetoId}`);
    });

    it("deve renderizar a página de detalhes do projeto via GET /projetos/:id", async () => {
      const nec = new Necessidade({
        id: "nec-det-01",
        codigo: "N-D01",
        titulo: "Demanda Detalhes",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repositorioNecessidade.salvar(nec);

      const conf = await servicoProjeto.solicitarBootstrapProjeto({
        necessidadeId: "nec-det-01",
        codigoNecessidade: "N-D01",
        tituloProjeto: "Projeto Detalhes",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      const res = await requisitar(servidor, "GET", `/projetos/${conf.projetoId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("Projeto Detalhes");
      expect(res.body).toContain("EM_FORMACAO");
      expect(res.body).toContain("Etapas de Formação Técnica (M-002)");
      expect(res.body).toContain("Auditoria Independente do Projeto");
      expect(res.body).toContain("Vínculo com Necessidade de Origem (1:1)");
      expect(res.body).toContain("Demanda Detalhes");
    });
  });

  describe("Critério 2: Registro de Etapas, Auditoria e Exibição da Direção do Projeto", () => {
    it("deve registrar etapas de formação via POST /projetos/:id/etapas", async () => {
      const nec = new Necessidade({
        id: "nec-etapas-01",
        codigo: "N-E01",
        titulo: "Demanda Etapas",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repositorioNecessidade.salvar(nec);

      const conf = await servicoProjeto.solicitarBootstrapProjeto({
        necessidadeId: "nec-etapas-01",
        codigoNecessidade: "N-E01",
        tituloProjeto: "Projeto Etapas",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      const resEtapa = await requisitar(
        servidor,
        "POST",
        `/projetos/${conf.projetoId}/etapas`,
        {
          etapa: EtapaFormacaoProjeto.ENQUADRAMENTO,
          detalhe: "Enquadramento de escopo e objetivos concluído.",
        },
        { Accept: "application/json" }
      );

      expect(resEtapa.statusCode).toBe(200);
      expect(resEtapa.json.ok).toBe(true);

      // Inspecionar na tela de detalhes
      const resDetalhes = await requisitar(servidor, "GET", `/projetos/${conf.projetoId}`);
      expect(resDetalhes.body).toContain("ENQUADRAMENTO");
      expect(resDetalhes.body).toContain("Enquadramento de escopo e objetivos concluído.");
    });

    it("deve emitir parecer de auditoria e exibir a Direção do Projeto em destaque quando FORMADO", async () => {
      const nec = new Necessidade({
        id: "nec-aud-01",
        codigo: "N-A01",
        titulo: "Demanda Auditoria Direção",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repositorioNecessidade.salvar(nec);

      const conf = await servicoProjeto.solicitarBootstrapProjeto({
        necessidadeId: "nec-aud-01",
        codigoNecessidade: "N-A01",
        tituloProjeto: "Projeto Auditoria e Direção",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      // Emite parecer FORMACAO_SUFICIENTE via Web/HTTP
      const resAuditoria = await requisitar(
        servidor,
        "POST",
        `/projetos/${conf.projetoId}/parecer-auditoria`,
        {
          resultado: TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
          parecer: "Formação plenamente consistente com as diretrizes do NAAMIVE.",
          objetivoProjeto: "Construir o sistema com arquitetura hexagonal e alta coesão.",
        },
        { Accept: "application/json" }
      );

      expect(resAuditoria.statusCode).toBe(200);

      // Inspecionar detalhes: Deve exibir card da Direção do Projeto
      const resDetalhes = await requisitar(servidor, "GET", `/projetos/${conf.projetoId}`);
      expect(resDetalhes.statusCode).toBe(200);
      expect(resDetalhes.body).toContain("FORMADO");
      expect(resDetalhes.body).toContain("Direção do Projeto (Consolidada e Aprovada)");
      expect(resDetalhes.body).toContain("Construir o sistema com arquitetura hexagonal e alta coesão.");
      expect(resDetalhes.body).toContain("Disponível para Módulos");

      // Endpoint REST da Direção
      const resDirecaoApi = await requisitar(servidor, "GET", `/api/projetos/${conf.projetoId}/direcao`);
      expect(resDirecaoApi.statusCode).toBe(200);
      expect(resDirecaoApi.json.objetivoProjeto).toBe("Construir o sistema com arquitetura hexagonal e alta coesão.");
    });
  });

  describe("Critério 3: Cancelamento pelo Owner com Autenticação Estrita", () => {
    it("deve permitir cancelamento excepcional exclusivamente ao Owner autenticado (mhj)", async () => {
      const nec = new Necessidade({
        id: "nec-canc-01",
        codigo: "N-C01",
        titulo: "Demanda para Cancelar",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repositorioNecessidade.salvar(nec);

      const conf = await servicoProjeto.solicitarBootstrapProjeto({
        necessidadeId: "nec-canc-01",
        codigoNecessidade: "N-C01",
        tituloProjeto: "Projeto para Cancelamento",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      // 1. Tentar cancelar com usuário não autorizado -> deve falhar com HTTP 403
      const resInvasor = await requisitar(
        servidor,
        "POST",
        `/projetos/${conf.projetoId}/cancelar`,
        {
          usuario: "usuario_invalido",
          justificativa: "Cancelamento indevido",
        },
        { Accept: "application/json" }
      );

      expect(resInvasor.statusCode).toBe(403);
      expect(resInvasor.json.erro).toContain("Owner");

      // 2. Cancelar com credencial de Owner válida ("mhj") -> deve ter sucesso
      const resOwner = await requisitar(
        servidor,
        "POST",
        `/projetos/${conf.projetoId}/cancelar`,
        {
          usuario: "mhj",
          justificativa: "Cancelamento estratégico aprovado pelo Owner.",
        },
        { Accept: "application/json" }
      );

      expect(resOwner.statusCode).toBe(200);
      expect(resOwner.json.status).toBe(StatusProjeto.CANCELADO);

      // 3. Confirmar que na tela web agora consta como CANCELADO
      const resDetalhes = await requisitar(servidor, "GET", `/projetos/${conf.projetoId}`);
      expect(resDetalhes.statusCode).toBe(200);
      expect(resDetalhes.body).toContain("CANCELADO");
      expect(resDetalhes.body).toContain("Projeto Cancelado por Decisão Material do Owner");
    });
  });

  describe("Critério 4: Suíte Completa de Testes End-to-End da EV-002", () => {
    it("deve orquestrar a jornada integrada completa da EV-002 (Compromisso EV-001 -> Bootstrap M-002 -> Formação -> Auditoria -> Direção Consolidada)", async () => {
      // 1. Iniciar com Necessidade cadastrada e comprometida pelo Owner (EV-001)
      const resNec = await requisitar(
        servidor,
        "POST",
        "/necessidades",
        {
          id: "nec-e2e-ev002",
          codigo: "N-EV002",
          titulo: "Plataforma de Governança Autônoma",
          tipo: TipoNecessidade.NOVO_PRODUTO,
          problemaOuOportunidade: "Orquestrar formação de projetos sem intervenção manual dispersa.",
          quemEAfetado: "Engenheiros e Atores Agênticos.",
          resultadoPretendido: "Direção do Projeto sólida e homologável.",
          escopoInicial: "Módulo M-002 e EV-002.",
          foraDeEscopo: "Substituição completa de ferramentas.",
          criterioDeAtendimento: "Direção consolidada no banco relacional e acessível via Web.",
          porQueIssoImporta: "Fundação da jornada autônoma.",
          origem: "Iniciativa Estratégica.",
        },
        { Accept: "application/json" }
      );
      expect(resNec.statusCode).toBe(201);

      // Auditoria da Necessidade -> Qualificação -> Decisão do Owner
      await requisitar(servidor, "POST", "/necessidades/nec-e2e-ev002/parecer-auditoria", {
        tipoResultado: TipoResultadoProcesso.QUALIFICAVEL,
      });
      await requisitar(servidor, "POST", "/necessidades/nec-e2e-ev002/avancar-qualificacao", {});
      await requisitar(servidor, "POST", "/necessidades/nec-e2e-ev002/recomendacao-qualificacao", {
        tipoResultado: TipoResultadoProcesso.ASSUMIR_COMPROMISSO,
      });
      await requisitar(servidor, "POST", "/necessidades/nec-e2e-ev002/submeter-decisao", {});
      
      // Decisão do Owner aprova o compromisso
      const resDecisao = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-ev002/decisao-owner",
        {
          usuario: "mhj",
          decisao: DecisaoMaterialOwner.APROVADO,
          justificativa: "Aprovado para materialização de Projeto no M-002.",
        },
        { Accept: "application/json" }
      );
      expect(resDecisao.statusCode).toBe(200);

      // 2. Processamento assíncrono pelo Worker do bootstrap de Projeto no M-002
      const worker = new WorkerSegundoPlano(
        filaTarefas,
        repositorioNecessidade,
        portaProjeto,
        portaContexto
      );
      const workerProcessou = await worker.executarCicloUnico();
      expect(workerProcessou).toBe(true);

      // 3. Obter Projeto materializado a partir da Necessidade 1:1
      const projetoConfirmado = await servicoProjeto.obterProjetoPorNecessidadeId("nec-e2e-ev002");
      expect(projetoConfirmado).not.toBeNull();
      const projetoId = projetoConfirmado!.id;
      expect(projetoConfirmado?.status).toBe(StatusProjeto.EM_FORMACAO);

      // 4. Inspecionar tela da Necessidade: Card de EM_PROJETO contém botão para o Projeto
      const resWebNec = await requisitar(servidor, "GET", "/necessidades/nec-e2e-ev002");
      expect(resWebNec.body).toContain(`href="/projetos/${projetoId}"`);
      expect(resWebNec.body).toContain("Ver Projeto no M-002");

      // 5. Condução das Etapas de Formação pelo Especialista em Formação do Projeto
      await requisitar(servidor, "POST", `/projetos/${projetoId}/etapas`, {
        etapa: EtapaFormacaoProjeto.ENQUADRAMENTO,
        detalhe: "Enquadramento de objetivos e premissas técnicas.",
      });
      await requisitar(servidor, "POST", `/projetos/${projetoId}/etapas`, {
        etapa: EtapaFormacaoProjeto.DESCOBERTA,
        detalhe: "Mapeamento de riscos e requisitos de dados relacionais.",
      });
      await requisitar(servidor, "POST", `/projetos/${projetoId}/etapas`, {
        etapa: EtapaFormacaoProjeto.DIRECAO_DA_SOLUCAO,
        detalhe: "Diretrizes de arquitetura hexagonal e persistência PostgreSQL.",
      });

      // 6. Auditoria do Projeto: Auditor emite FORMACAO_SUFICIENTE e Direção
      const resAuditoriaFinal = await requisitar(
        servidor,
        "POST",
        `/projetos/${projetoId}/parecer-auditoria`,
        {
          resultado: TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
          parecer: "Formação completa e aderente a todos os invariantes normativos do NAAMIVE.",
          objetivoProjeto: "Consolidar a Direção Técnica e preparar o M-002 para decomposição de trabalho.",
        },
        { Accept: "application/json" }
      );
      expect(resAuditoriaFinal.statusCode).toBe(200);

      // 7. Visualização e Verificação da Direção do Projeto Consolidada na Web
      const resWebProjetoFinal = await requisitar(servidor, "GET", `/projetos/${projetoId}`);
      expect(resWebProjetoFinal.statusCode).toBe(200);
      expect(resWebProjetoFinal.body).toContain("FORMADO");
      expect(resWebProjetoFinal.body).toContain("Direção do Projeto (Consolidada e Aprovada)");
      expect(resWebProjetoFinal.body).toContain("Consolidar a Direção Técnica e preparar o M-002");
      expect(resWebProjetoFinal.body).toContain("Disponível para Módulos");

      // 8. Consulta na Listagem Geral de Projetos (/projetos)
      const resLista = await requisitar(servidor, "GET", "/projetos");
      expect(resLista.statusCode).toBe(200);
      expect(resLista.body).toContain(projetoConfirmado!.codigo);
      expect(resLista.body).toContain("FORMADO");
      expect(resLista.body).toContain("3 etapa(s)");

      // 9. API REST da Direção (/api/projetos/:id/direcao)
      const resApi = await requisitar(servidor, "GET", `/api/projetos/${projetoId}/direcao`);
      expect(resApi.statusCode).toBe(200);
      expect(resApi.json.objetivoProjeto).toContain("Consolidar a Direção Técnica");
      expect(resApi.json.fronteiras).toContain("M-002 / EV-002 delimitado");
    });
  });
});
