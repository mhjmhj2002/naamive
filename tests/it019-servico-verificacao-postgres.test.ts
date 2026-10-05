import { describe, it, expect, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioVerificacaoPostgres,
  RepositorioVerificacaoMemoria,
  ServicoVerificacao,
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
  MetodoObservacao,
  ConclusaoVerificacao,
  WorkerSegundoPlano,
  FilaTarefasMemoria,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  RepositorioNecessidadeMemoria,
  RecursoNaoEncontradoErro,
} from "../src/index.js";

describe("IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoVerificacaoPostgres: RepositorioVerificacaoPostgres;

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

    repoVerificacaoPostgres = new RepositorioVerificacaoPostgres(conexao);
  });

  describe("Critério 1: Repositório PostgreSQL Transacional (CRUD e Integridade)", () => {
    it("deve persistir e recuperar Resultado de Software por id e por código", async () => {
      const res = ResultadoSoftware.criar({
        codigoReferencia: "RES-EV005-001",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "commit-abc1234",
        descricao: "Build e pacotes de verificação do M-005 compilados",
        declaradoPor: "Engenheiro de Software",
      });

      await repoVerificacaoPostgres.salvarResultado(res);

      const porId = await repoVerificacaoPostgres.obterResultadoPorId(res.id);
      expect(porId).not.toBeNull();
      expect(porId?.codigoReferencia).toBe("RES-EV005-001");
      expect(porId?.versaoArtefato).toBe("commit-abc1234");
      expect(porId?.moduloOrigem).toBe("M-005");

      const porCodigo = await repoVerificacaoPostgres.obterResultadoPorCodigo("RES-EV005-001");
      expect(porCodigo).not.toBeNull();
      expect(porCodigo?.id).toBe(res.id);

      const lista = await repoVerificacaoPostgres.listarResultados({
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
      });
      expect(lista).toHaveLength(1);
    });

    it("deve persistir e recuperar Critérios Verificáveis vinculados ao Resultado", async () => {
      const res = ResultadoSoftware.criar({
        codigoReferencia: "RES-EV005-002",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0.0",
        descricao: "Resultado de teste de critérios",
        declaradoPor: "Engenheiro de Software",
      });
      await repoVerificacaoPostgres.salvarResultado(res);

      const crit = CriterioVerificavel.criar({
        codigo: "CRIT-001-COMPILACAO",
        resultadoSoftwareId: res.id,
        origemNormativa: "Plano de Realização EV-005",
        descricaoComportamento: "O código deve compilar estritamente sem erros no TypeScript",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "tsc --noEmit com exit code 0",
        limitesOuTolerancias: "Zero erros tolerados",
      });

      await repoVerificacaoPostgres.salvarCriterio(crit);

      const porId = await repoVerificacaoPostgres.obterCriterioPorId(crit.id);
      expect(porId).not.toBeNull();
      expect(porId?.codigo).toBe("CRIT-001-COMPILACAO");
      expect(porId?.metodoObservacao).toBe(MetodoObservacao.SUITE_AUTOMATIZADA);

      const porCodigo = await repoVerificacaoPostgres.obterCriterioPorCodigo("CRIT-001-COMPILACAO");
      expect(porCodigo).not.toBeNull();
      expect(porCodigo?.id).toBe(crit.id);

      const listaCrit = await repoVerificacaoPostgres.listarCriteriosPorResultado(res.id);
      expect(listaCrit).toHaveLength(1);
      expect(listaCrit[0].id).toBe(crit.id);
    });

    it("deve persistir Evidências com JSONB e respeitar integridade relacional", async () => {
      const res = ResultadoSoftware.criar({
        codigoReferencia: "RES-EV005-003",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0.0",
        descricao: "Resultado para evidências",
        declaradoPor: "Engenheiro de Software",
      });
      await repoVerificacaoPostgres.salvarResultado(res);

      const crit = CriterioVerificavel.criar({
        codigo: "CRIT-002-TESTES",
        resultadoSoftwareId: res.id,
        origemNormativa: "Plano de Realização EV-005",
        descricaoComportamento: "Todos os testes devem passar",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "100% de testes verdes",
      });
      await repoVerificacaoPostgres.salvarCriterio(crit);

      const evid = EvidenciaVerificacao.criar({
        criterioId: crit.id,
        procedimentoExecutado: "Execução vitest run",
        resultadoObservado: "18 arquivos e 126 testes verdes",
        dadosDetalhados: { totalArquivos: 18, totalTestes: 126, falhas: 0 },
        sucesso: true,
        coletadoPor: "Engenheiro de Software",
      });

      await repoVerificacaoPostgres.salvarEvidencia(evid);

      const porId = await repoVerificacaoPostgres.obterEvidenciaPorId(evid.id);
      expect(porId).not.toBeNull();
      expect(porId?.sucesso).toBe(true);
      expect(porId?.dadosDetalhados).toEqual({ totalArquivos: 18, totalTestes: 126, falhas: 0 });

      const listaEvidPorCrit = await repoVerificacaoPostgres.listarEvidenciasPorCriterio(crit.id);
      expect(listaEvidPorCrit).toHaveLength(1);

      const listaEvidPorRes = await repoVerificacaoPostgres.listarEvidenciasPorResultado(res.id);
      expect(listaEvidPorRes).toHaveLength(1);
    });

    it("deve persistir e recuperar Laudos Técnicos com integridade e idempotência", async () => {
      const res = ResultadoSoftware.criar({
        codigoReferencia: "RES-EV005-004",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0.0",
        descricao: "Resultado para laudo",
        declaradoPor: "Engenheiro de Software",
      });
      await repoVerificacaoPostgres.salvarResultado(res);

      const crit = CriterioVerificavel.criar({
        codigo: "CRIT-003-HTTP",
        resultadoSoftwareId: res.id,
        origemNormativa: "Plano de Realização EV-005",
        descricaoComportamento: "Rota HTTP deve responder 200",
        metodoObservacao: MetodoObservacao.INSPECAO_HTTP,
        condicaoSatisfacao: "Status 200 e HTML válido",
      });
      await repoVerificacaoPostgres.salvarCriterio(crit);

      const laudo = LaudoVerificacao.criar({
        resultadoSoftwareId: res.id,
        criterioId: crit.id,
        conclusao: ConclusaoVerificacao.CRITERIO_DEMONSTRADO,
        fundamentacaoTecnica: "Inspeção HTTP confirmou status 200 OK com payload responsivo",
        evidenciasUtilizadas: ["evid-1", "evid-2"],
        divergenciasApontadas: null,
        emitidoPor: "Verificador da Entrega de Valor",
      });

      await repoVerificacaoPostgres.salvarLaudo(laudo);

      const porId = await repoVerificacaoPostgres.obterLaudoPorId(laudo.id);
      expect(porId).not.toBeNull();
      expect(porId?.conclusao).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
      expect(porId?.evidenciasUtilizadas).toEqual(["evid-1", "evid-2"]);

      const porResECrit = await repoVerificacaoPostgres.obterLaudoPorResultadoECriterio(
        res.id,
        crit.id
      );
      expect(porResECrit).not.toBeNull();
      expect(porResECrit?.id).toBe(laudo.id);

      // Atualização idempotente do laudo
      const laudoAtualizado = new LaudoVerificacao({
        id: laudo.id,
        resultadoSoftwareId: res.id,
        criterioId: crit.id,
        conclusao: ConclusaoVerificacao.CRITERIO_DEMONSTRADO,
        fundamentacaoTecnica: "Fundamentação técnica revisada e expandida",
        evidenciasUtilizadas: ["evid-1", "evid-2", "evid-3"],
        divergenciasApontadas: null,
        emitidoPor: "Verificador da Entrega de Valor",
      });

      await repoVerificacaoPostgres.salvarLaudo(laudoAtualizado);
      const recuperadoRevisado = await repoVerificacaoPostgres.obterLaudoPorResultadoECriterio(
        res.id,
        crit.id
      );
      expect(recuperadoRevisado?.fundamentacaoTecnica).toBe(
        "Fundamentação técnica revisada e expandida"
      );
      expect(recuperadoRevisado?.evidenciasUtilizadas).toHaveLength(3);
    });

    it("deve falhar ao tentar salvar critério, evidência ou laudo para entidades inexistentes (FK)", async () => {
      const critInvalido = CriterioVerificavel.criar({
        codigo: "CRIT-ORF-001",
        resultadoSoftwareId: "id-resultado-inexistente",
        origemNormativa: "Norma",
        descricaoComportamento: "Descricao",
        metodoObservacao: MetodoObservacao.OPERACIONAL,
        condicaoSatisfacao: "Condicao",
      });

      await expect(repoVerificacaoPostgres.salvarCriterio(critInvalido)).rejects.toThrow(
        /Resultado de Software 'id-resultado-inexistente' não existe/
      );

      const evidInvalida = EvidenciaVerificacao.criar({
        criterioId: "criterio-inexistente",
        procedimentoExecutado: "Teste",
        resultadoObservado: "Observado",
        sucesso: true,
        coletadoPor: "Tester",
      });

      await expect(repoVerificacaoPostgres.salvarEvidencia(evidInvalida)).rejects.toThrow(
        /Critério Verificável 'criterio-inexistente' não existe/
      );
    });
  });

  describe("Critério 2: Casos de Uso do ServicoVerificacao", () => {
    let servico: ServicoVerificacao;
    let portaContexto: AdaptadorIntegracaoContexto;
    let fila: FilaTarefasMemoria;

    beforeEach(() => {
      portaContexto = new AdaptadorIntegracaoContexto();
      fila = new FilaTarefasMemoria();
      servico = new ServicoVerificacao(repoVerificacaoPostgres, undefined, portaContexto, fila);
    });

    it("deve orquestrar registro de resultado, cadastro de critérios e coleta de evidências", async () => {
      const res = await servico.registrarResultadoSoftware({
        codigoReferencia: "RES-EV005-APP",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "commit-def5678",
        descricao: "Resultado de aplicação web e serviços",
        declaradoPor: "Engenheiro de Software",
      });
      expect(res.id).toBeDefined();

      const crit1 = await servico.cadastrarCriterioVerificavel({
        codigo: "CRIT-APP-01",
        resultadoSoftwareId: res.id,
        origemNormativa: "Especificação Técnica M-005",
        descricaoComportamento: "Camada web deve carregar sem erros",
        metodoObservacao: MetodoObservacao.INSPECAO_HTTP,
        condicaoSatisfacao: "Status HTTP 200",
      });
      expect(crit1.id).toBeDefined();

      const evid1 = await servico.registrarEvidenciaVerificacao({
        criterioId: crit1.id,
        procedimentoExecutado: "GET /verificacao",
        resultadoObservado: "Status 200 OK retornado",
        dadosDetalhados: { status: 200, contentType: "text/html" },
        sucesso: true,
        coletadoPor: "Suíte Automatizada",
      });
      expect(evid1.id).toBeDefined();

      // Avaliação de conformidade
      const avaliacao = await servico.avaliarConformidadeResultado(
        res.id,
        "Verificador da Entrega de Valor"
      );
      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
      expect(avaliacao.laudoAgregado.demonstrados).toBe(1);
      expect(avaliacao.laudosIndividuais).toHaveLength(1);
      expect(avaliacao.eventoContextoRegistrado).toBe(true);

      // Verificação da Matriz de Conformidade
      const matriz = await servico.obterMatrizConformidade(res.id);
      expect(matriz.resultado.id).toBe(res.id);
      expect(matriz.criterios).toHaveLength(1);
      expect(matriz.evidencias).toHaveLength(1);
      expect(matriz.laudos).toHaveLength(1);
      expect(matriz.laudoAgregado.conclusaoGeral).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);
    });

    it("deve apontar EVIDENCIA_INSUFICIENTE para critérios sem evidência (Não Presunção)", async () => {
      const res = await servico.registrarResultadoSoftware({
        codigoReferencia: "RES-EV005-VAZIO",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0.0",
        descricao: "Resultado sem evidências",
        declaradoPor: "Engenheiro de Software",
      });

      await servico.cadastrarCriterioVerificavel({
        codigo: "CRIT-SEM-EVID",
        resultadoSoftwareId: res.id,
        origemNormativa: "Norma",
        descricaoComportamento: "Exige evidência",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Deve ser testado",
      });

      const avaliacao = await servico.avaliarConformidadeResultado(
        res.id,
        "Verificador da Entrega de Valor"
      );
      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(
        ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE
      );
      expect(avaliacao.laudoAgregado.insuficientes).toBe(1);
      expect(avaliacao.laudosIndividuais[0].conclusao).toBe(
        ConclusaoVerificacao.EVIDENCIA_INSUFICIENTE
      );
    });

    it("deve apontar DIVERGENCIA_ENCONTRADA quando houver evidências contraditórias", async () => {
      const res = await servico.registrarResultadoSoftware({
        codigoReferencia: "RES-EV005-CONFLITO",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0.0",
        descricao: "Resultado com conflito de evidências",
        declaradoPor: "Engenheiro de Software",
      });

      const crit = await servico.cadastrarCriterioVerificavel({
        codigo: "CRIT-CONFLITO",
        resultadoSoftwareId: res.id,
        origemNormativa: "Norma de Conflito",
        descricaoComportamento: "Comportamento estável",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Sem falhas",
      });

      // Evidência 1: sucesso
      await servico.registrarEvidenciaVerificacao({
        criterioId: crit.id,
        procedimentoExecutado: "Teste 1",
        resultadoObservado: "Sucesso",
        sucesso: true,
        coletadoPor: "Tester",
      });

      // Evidência 2: falha
      await servico.registrarEvidenciaVerificacao({
        criterioId: crit.id,
        procedimentoExecutado: "Teste 2",
        resultadoObservado: "Falha de timeout",
        sucesso: false,
        coletadoPor: "Tester",
      });

      const avaliacao = await servico.avaliarConformidadeResultado(
        res.id,
        "Verificador da Entrega de Valor"
      );
      expect(avaliacao.laudoAgregado.conclusaoGeral).toBe(
        ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA
      );
      expect(avaliacao.laudoAgregado.divergencias).toBe(1);
      expect(avaliacao.laudosIndividuais[0].conclusao).toBe(
        ConclusaoVerificacao.DIVERGENCIA_ENCONTRADA
      );
    });

    it("deve lançar RecursoNaoEncontradoErro ao operar sobre resultado inexistente", async () => {
      await expect(
        servico.cadastrarCriterioVerificavel({
          codigo: "CRIT-NAO-EXISTE",
          resultadoSoftwareId: "inexistente-123",
          origemNormativa: "Norma",
          descricaoComportamento: "Desc",
          metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
          condicaoSatisfacao: "Cond",
        })
      ).rejects.toThrow(RecursoNaoEncontradoErro);

      await expect(
        servico.avaliarConformidadeResultado("inexistente-123", "Verificador")
      ).rejects.toThrow(RecursoNaoEncontradoErro);
    });
  });

  describe("Critério 3: Integração de Rastreabilidade com M-004 e Worker em Background", () => {
    it("deve registrar eventos de rastreabilidade de resultado, critério e laudo na portaContexto", async () => {
      const portaContexto = new AdaptadorIntegracaoContexto();
      const servico = new ServicoVerificacao(repoVerificacaoPostgres, undefined, portaContexto);

      const res = await servico.registrarResultadoSoftware({
        codigoReferencia: "RES-EV005-RASTREADO",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v2.0.0",
        descricao: "Rastreabilidade completa",
        declaradoPor: "Engenheiro de Software",
      });

      const historicoRes = await portaContexto.obterHistoricoContexto(res.id);
      expect(historicoRes).toHaveLength(1);
      expect(historicoRes[0].tipoEvento).toBe("RESULTADO_SOFTWARE_REGISTRADO");

      const crit = await servico.cadastrarCriterioVerificavel({
        codigo: "CRIT-RASTREIO",
        resultadoSoftwareId: res.id,
        origemNormativa: "Norma Rastreio",
        descricaoComportamento: "Comportamento",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Ok",
      });

      const historicoCrit = await portaContexto.obterHistoricoContexto(crit.id);
      expect(historicoCrit).toHaveLength(1);
      expect(historicoCrit[0].tipoEvento).toBe("CRITERIO_VERIFICAVEL_CADASTRADO");

      await servico.registrarEvidenciaVerificacao({
        criterioId: crit.id,
        procedimentoExecutado: "Teste de Rastreio",
        resultadoObservado: "Ok",
        sucesso: true,
        coletadoPor: "Tester",
      });

      await servico.avaliarConformidadeResultado(res.id, "Verificador da Entrega de Valor");

      const historicoPosLaudo = await portaContexto.obterHistoricoContexto(res.id);
      expect(historicoPosLaudo).toHaveLength(2);
      expect(historicoPosLaudo[1].tipoEvento).toBe("LAUDO_CONFORMIDADE_EMITIDO");
      expect(historicoPosLaudo[1].dados.conclusaoGeral).toBe(
        ConclusaoVerificacao.CRITERIO_DEMONSTRADO
      );
    });

    it("deve executar reavaliação de conformidade assíncrona no WorkerSegundoPlano", async () => {
      const fila = new FilaTarefasMemoria();
      const portaContexto = new AdaptadorIntegracaoContexto();
      const portaProjeto = new AdaptadorIntegracaoProjeto();
      const repoNecessidade = new RepositorioNecessidadeMemoria();
      const servico = new ServicoVerificacao(repoVerificacaoPostgres, undefined, portaContexto, fila);

      const worker = new WorkerSegundoPlano(
        fila,
        repoNecessidade,
        portaProjeto,
        portaContexto,
        { intervaloPollingMs: 50 },
        undefined,
        undefined,
        servico
      );

      const res = await servico.registrarResultadoSoftware({
        codigoReferencia: "RES-EV005-WORKER",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v3.0.0",
        descricao: "Resultado assíncrono para o worker",
        declaradoPor: "Engenheiro de Software",
      });

      const crit = await servico.cadastrarCriterioVerificavel({
        codigo: "CRIT-WORKER",
        resultadoSoftwareId: res.id,
        origemNormativa: "Norma Worker",
        descricaoComportamento: "Teste assíncrono",
        metodoObservacao: MetodoObservacao.OPERACIONAL,
        condicaoSatisfacao: "Executado em background",
      });

      await servico.registrarEvidenciaVerificacao({
        criterioId: crit.id,
        procedimentoExecutado: "Background Run",
        resultadoObservado: "Sucesso",
        sucesso: true,
        coletadoPor: "Worker de Teste",
      });

      // Enfileira reavaliação em background
      const tarefaId = await servico.agendarReavaliacaoBackground(res.id);
      expect(tarefaId).not.toBeNull();

      // Executa um ciclo do worker
      const processou = await worker.executarCicloUnico();
      expect(processou).toBe(true);

      // Verifica se o laudo foi emitido e persistido pelo worker
      const laudo = await repoVerificacaoPostgres.obterLaudoPorResultadoECriterio(res.id, crit.id);
      expect(laudo).not.toBeNull();
      expect(laudo?.conclusao).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);

      // Verifica evento de telemetria gerado pelo worker
      const historico = await portaContexto.obterHistoricoContexto(res.id);
      const eventoWorker = historico.find((e) => e.tipoEvento === "CONFORMIDADE_SOFTWARE_REAVALIADA");
      expect(eventoWorker).toBeDefined();
      expect(eventoWorker?.dados.demonstrados).toBe(1);
    });
  });

  describe("Critério 4: RepositorioVerificacaoMemoria", () => {
    it("deve atender todas as operações em memória com consistência e integridade", async () => {
      const repoMem = new RepositorioVerificacaoMemoria();

      const res = ResultadoSoftware.criar({
        codigoReferencia: "RES-MEM-001",
        moduloOrigem: "M-005",
        entregaValorCodigo: "EV-005",
        versaoArtefato: "v1.0-mem",
        descricao: "Teste em memória",
        declaradoPor: "Engenheiro de Software",
      });
      await repoMem.salvarResultado(res);

      const crit = CriterioVerificavel.criar({
        codigo: "CRIT-MEM-001",
        resultadoSoftwareId: res.id,
        origemNormativa: "Norma Mem",
        descricaoComportamento: "Comportamento",
        metodoObservacao: MetodoObservacao.SUITE_AUTOMATIZADA,
        condicaoSatisfacao: "Passar",
      });
      await repoMem.salvarCriterio(crit);

      const evid = EvidenciaVerificacao.criar({
        criterioId: crit.id,
        procedimentoExecutado: "Teste Mem",
        resultadoObservado: "Ok",
        sucesso: true,
        coletadoPor: "Tester",
      });
      await repoMem.salvarEvidencia(evid);

      const laudo = LaudoVerificacao.criar({
        resultadoSoftwareId: res.id,
        criterioId: crit.id,
        conclusao: ConclusaoVerificacao.CRITERIO_DEMONSTRADO,
        fundamentacaoTecnica: "Passou no teste em memória",
        evidenciasUtilizadas: [evid.id],
        emitidoPor: "Verificador",
      });
      await repoMem.salvarLaudo(laudo);

      const recuperadoLaudo = await repoMem.obterLaudoPorResultadoECriterio(res.id, crit.id);
      expect(recuperadoLaudo?.conclusao).toBe(ConclusaoVerificacao.CRITERIO_DEMONSTRADO);

      const todosCriterios = await repoMem.listarTodosCriterios();
      expect(todosCriterios).toHaveLength(1);

      const todosLaudos = await repoMem.listarTodosLaudos();
      expect(todosLaudos).toHaveLength(1);
    });
  });
});
