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
  RepositorioNecessidadeMemoria,
  criarServidorWeb,
} from "../src/index.js";

/**
 * Cliente HTTP utilitário nativo para testar o servidor web sem dependências externas.
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

describe("IT-004 — Camada Web Responsiva, Adaptadores HTTP e Suíte de Testes Locais", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let gerenciadorConexao: GerenciadorConexao;
  let repositorioPostgres: RepositorioNecessidadePostgres;
  let autenticacaoOwner: AdaptadorAutenticacaoOwner;
  let portaProjeto: AdaptadorIntegracaoProjeto;
  let portaContexto: AdaptadorIntegracaoContexto;
  let filaTarefas: FilaTarefasMemoria;
  let servidor: http.Server;

  beforeEach(async () => {
    // Configura PostgreSQL em memória transacional com pg-mem
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

    // Aplica migrações 001 e 002
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    repositorioPostgres = new RepositorioNecessidadePostgres(gerenciadorConexao);
    autenticacaoOwner = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);
    portaProjeto = new AdaptadorIntegracaoProjeto();
    portaContexto = new AdaptadorIntegracaoContexto();
    filaTarefas = new FilaTarefasMemoria();

    servidor = criarServidorWeb({
      repositorio: repositorioPostgres,
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

  describe("Critério 1: Interface Responsiva Operante e Rotas HTTP", () => {
    it("deve renderizar a página inicial com layout responsivo e lista vazia ou existente", async () => {
      const res = await requisitar(servidor, "GET", "/");
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.body).toContain("NAAMIVE");
      expect(res.body).toContain("Necessidades de Negócio");
      expect(res.body).toContain("bootstrap@5.3.3"); // Comprova template Bootstrap responsivo
    });

    it("deve renderizar o formulário de cadastro de nova necessidade via GET /nova", async () => {
      const res = await requisitar(servidor, "GET", "/nova");
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("Registrar Nova Necessidade");
      expect(res.body).toContain("<form action=\"/necessidades\" method=\"POST\"");
      expect(res.body).toContain("Salvar e Iniciar Formação");
    });

    it("deve rejeitar cadastro com dados obrigatórios ausentes retornando HTTP 400 com diagnósticos claros", async () => {
      const res = await requisitar(
        servidor,
        "POST",
        "/necessidades",
        {
          codigo: "",
          titulo: "",
        },
        { Accept: "text/html" }
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toContain("Foram encontrados os seguintes erros");
      expect(res.body).toContain("O código da necessidade é obrigatório");
      expect(res.body).toContain("O título da necessidade é obrigatório");
    });
  });

  describe("Critério 2: Decisão do Owner, Bloqueio de Não Autorizados e Compromisso", () => {
    it("deve impedir decisão material de aprovação se o usuário não for Owner autenticado (HTTP 403)", async () => {
      // Cria uma necessidade válida no banco
      const novaRes = await requisitar(
        servidor,
        "POST",
        "/necessidades",
        {
          id: "nec-sec-01",
          codigo: "N-SEC-01",
          titulo: "Segurança de Acesso e Autoridade",
          tipo: TipoNecessidade.EVOLUCAO_DE_PRODUTO,
          problemaOuOportunidade: "Garantir que apenas o Owner autenticado possa aprovar.",
          quemEAfetado: "Toda a organização.",
          resultadoPretendido: "Bloqueio estrito de atores não autorizados.",
          escopoInicial: "Validação de autoridade.",
          foraDeEscopo: "Outras decisões.",
          criterioDeAtendimento: "Retornar erro e não mudar status.",
          porQueIssoImporta: "Princípio fundamental de governança.",
          origem: "Auditoria de segurança.",
        },
        { Accept: "application/json" }
      );

      expect(novaRes.statusCode).toBe(201);

      // Tenta aprovar como um usuário sem autoridade
      const decisaoRes = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-sec-01/decisao-owner",
        {
          usuario: "invasor_desconhecido",
          decisao: DecisaoMaterialOwner.APROVADO,
          justificativa: "Tentativa indevida",
        },
        { Accept: "application/json" }
      );

      expect(decisaoRes.statusCode).toBe(403);
      expect(decisaoRes.json?.erro).toContain("competência de 'Owner'");

      // Verifica no banco de dados relacional se a necessidade permaneceu inalterada
      const necBanco = await repositorioPostgres.obterPorId("nec-sec-01");
      expect(necBanco?.status).toBe(StatusNecessidade.EM_FORMACAO);
      expect(necBanco?.decisoes.length).toBe(0);
      expect(necBanco?.compromisso).toBeNull();
    });

    it("deve impedir aprovação se a Necessidade ainda não estiver em AGUARDANDO_DECISAO (HTTP 400)", async () => {
      const nec = new Necessidade({
        id: "nec-trans-01",
        codigo: "N-TR01",
        titulo: "Transição Prematura Proibida",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Tentativa de pular etapas normativas.",
        quemEAfetado: "Governança.",
        resultadoPretendido: "Rejeição imediata sem corrupção.",
        escopoInicial: "Etapas.",
        foraDeEscopo: "N/A",
        criterioDeAtendimento: "Erro de transição.",
        porQueIssoImporta: "Regra de ouro do NAAMIVE.",
        origem: "Teste de Fogo.",
      });
      await repositorioPostgres.salvar(nec);

      // Tenta aprovar diretamente em EM_FORMACAO mesmo com credencial válida do Owner
      const decisaoRes = await requisitar(
        servidor,
        "POST",
        `/necessidades/${nec.id}/decisao-owner`,
        {
          usuario: "mhj",
          decisao: DecisaoMaterialOwner.APROVADO,
        },
        { Accept: "application/json" }
      );

      expect(decisaoRes.statusCode).toBe(400);
      expect(decisaoRes.json?.erro).toContain("só pode ser registrada quando a Necessidade estiver em AGUARDANDO_DECISAO");
    });
  });

  describe("Critério 3: Suíte Integrada de Testes de Ponta a Ponta da EV-001", () => {
    it("deve executar a jornada completa da EV-001 (Criação -> Formação -> Auditoria -> Qualificação -> Decisão do Owner -> Compromisso -> M-002)", async () => {
      // 1. Criação da Necessidade via Web/HTTP
      const resCriacao = await requisitar(
        servidor,
        "POST",
        "/necessidades",
        {
          id: "nec-e2e-001",
          codigo: "N-001",
          titulo: "NAAMIVE — Condução Autônoma de Necessidades",
          tipo: TipoNecessidade.NOVO_PRODUTO,
          problemaOuOportunidade: "Dificuldade em conduzir necessidades de negócio até resultados verificáveis de software.",
          quemEAfetado: "Equipes de engenharia e stakeholders de negócio.",
          resultadoPretendido: "Condução governada com separação de status e decisões explícitas do Owner.",
          escopoInicial: "Vertical de Necessidade, Módulos e Entregas de Valor.",
          foraDeEscopo: "Operações manuais sem rastreabilidade.",
          criterioDeAtendimento: "Software gerado com integridade referencial e 100% de testes locais aprovados.",
          porQueIssoImporta: "Permite escala autônoma com governança estrita.",
          origem: "Demanda do Owner.",
        },
        { Accept: "application/json" }
      );

      expect(resCriacao.statusCode).toBe(201);
      expect(resCriacao.json.status).toBe(StatusNecessidade.EM_FORMACAO);

      // 2. Consulta de detalhes via GET /necessidades/:id (Camada Web Responsiva)
      const resDetalhes1 = await requisitar(servidor, "GET", "/necessidades/nec-e2e-001");
      expect(resDetalhes1.statusCode).toBe(200);
      expect(resDetalhes1.body).toContain("NAAMIVE — Condução Autônoma de Necessidades");
      expect(resDetalhes1.body).toContain("EM_FORMACAO");

      // 3. Auditor da Necessidade emite parecer QUALIFICAVEL
      const resAuditoria = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-001/parecer-auditoria",
        { tipoResultado: TipoResultadoProcesso.QUALIFICAVEL },
        { Accept: "application/json" }
      );
      expect(resAuditoria.statusCode).toBe(200);

      // 4. Especialista em Formação conclui e avança para EM_QUALIFICACAO
      const resAvanco = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-001/avancar-qualificacao",
        {},
        { Accept: "application/json" }
      );
      expect(resAvanco.statusCode).toBe(200);
      expect(resAvanco.json.status).toBe(StatusNecessidade.EM_QUALIFICACAO);

      // 5. Especialista em Qualificação emite recomendação ASSUMIR_COMPROMISSO
      const resRecomendacao = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-001/recomendacao-qualificacao",
        { tipoResultado: TipoResultadoProcesso.ASSUMIR_COMPROMISSO },
        { Accept: "application/json" }
      );
      expect(resRecomendacao.statusCode).toBe(200);

      // 6. Submissão à Decisão do Owner -> status AGUARDANDO_DECISAO
      const resSubmissao = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-001/submeter-decisao",
        {},
        { Accept: "application/json" }
      );
      expect(resSubmissao.statusCode).toBe(200);
      expect(resSubmissao.json.status).toBe(StatusNecessidade.AGUARDANDO_DECISAO);

      // 7. Decisão Material Humana do Owner (usuário autenticado "mhj") -> APROVADO
      const resDecisao = await requisitar(
        servidor,
        "POST",
        "/necessidades/nec-e2e-001/decisao-owner",
        {
          usuario: "mhj",
          decisao: DecisaoMaterialOwner.APROVADO,
          justificativa: "Decisão favorável do Owner para iniciar a jornada autônoma.",
        },
        { Accept: "application/json" }
      );

      expect(resDecisao.statusCode).toBe(200);
      expect(resDecisao.json.compromisso).toBeDefined();
      expect(resDecisao.json.compromisso.usuarioAprovador).toBe("mhj");
      expect(resDecisao.json.compromisso.problemaAssumido).toContain("Dificuldade em conduzir necessidades");

      // 8. O worker em background desacoplado processa o job enfileirado de bootstrap
      const worker = new WorkerSegundoPlano(
        filaTarefas,
        repositorioPostgres,
        portaProjeto,
        portaContexto
      );

      // Executa o ciclo de processamento assíncrono
      const processou = await worker.executarCicloUnico();
      expect(processou).toBe(true);
      expect(worker.totalProcessado).toBe(1);

      // 9. Verificação de Integridade e Disponibilização no M-002
      // A Necessidade agora deve estar com status EM_PROJETO no banco PostgreSQL
      const necFinal = await repositorioPostgres.obterPorId("nec-e2e-001");
      expect(necFinal?.status).toBe(StatusNecessidade.EM_PROJETO);
      expect(necFinal?.compromisso).toBeDefined();

      // Confirma que exatamente 1 Projeto foi criado no M-002
      const projetoConfirmado = await portaProjeto.obterProjetoPorNecessidade("nec-e2e-001");
      expect(projetoConfirmado?.projetoId).toBe("proj-nec-e2e-001");

      // Rastreabilidade no M-004 preservada
      const eventosRastreabilidade = await portaContexto.obterHistoricoContexto("nec-e2e-001");
      expect(eventosRastreabilidade.length).toBeGreaterThanOrEqual(2);
      expect(eventosRastreabilidade.some((e) => e.tipoEvento === "DECISAO_OWNER_APROVADO")).toBe(true);
      expect(eventosRastreabilidade.some((e) => e.tipoEvento === "BOOTSTRAP_PROJETO_CONCLUIDO")).toBe(true);

      // 10. Consulta à camada web após o fluxo: Exibe o card de Compromisso Consolidado na tela
      const resWebFinal = await requisitar(servidor, "GET", "/necessidades/nec-e2e-001");
      expect(resWebFinal.statusCode).toBe(200);
      expect(resWebFinal.body).toContain("Compromisso da Necessidade (Consolidado)");
      expect(resWebFinal.body).toContain("Disponível para M-002");
      expect(resWebFinal.body).toContain("Aprovado formalmente por: <strong>mhj</strong>");

      // 11. Endpoint da API REST do Compromisso
      const resApiComp = await requisitar(servidor, "GET", "/api/compromissos/nec-e2e-001");
      expect(resApiComp.statusCode).toBe(200);
      expect(resApiComp.json.usuarioAprovador).toBe("mhj");
    });
  });

  describe("Critério 4: Verificação de Não Regressão e Integridade", () => {
    it("deve garantir que transição inválida em qualquer ponto não corrompe os dados persistidos", async () => {
      const nec = new Necessidade({
        id: "nec-reg-01",
        codigo: "N-REG01",
        titulo: "Integridade Transacional",
        tipo: TipoNecessidade.EVOLUCAO_DE_PRODUTO,
        problemaOuOportunidade: "Testar falhas sem corrupção.",
        quemEAfetado: "Operação.",
        resultadoPretendido: "Manutenção do estado consistente.",
        escopoInicial: "Testes.",
        foraDeEscopo: "N/A",
        criterioDeAtendimento: "Estado idêntico ao original.",
        porQueIssoImporta: "Robustez.",
        origem: "Teste não regressão.",
      });
      await repositorioPostgres.salvar(nec);

      // Tenta avançar para qualificação sem ter o parecer QUALIFICAVEL
      const resFalha = await requisitar(
        servidor,
        "POST",
        `/necessidades/${nec.id}/avancar-qualificacao`,
        {},
        { Accept: "application/json" }
      );

      expect(resFalha.statusCode).toBe(400);
      expect(resFalha.json.erro).toContain("obrigatório parecer prévio QUALIFICAVEL");

      // Confirma que permaneceu inalterada no PostgreSQL
      const necRecuperada = await repositorioPostgres.obterPorId(nec.id);
      expect(necRecuperada?.status).toBe(StatusNecessidade.EM_FORMACAO);
      expect(necRecuperada?.compromisso).toBeNull();
    });
  });
});
