import { describe, it, expect, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioContextoPostgres,
  RepositorioContextoMemoria,
  ServicoContexto,
  RegistroProveniencia,
  VinculoCausal,
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
  InvarianteVioladaErro,
  RecursoNaoEncontradoErro,
  WorkerSegundoPlano,
  FilaTarefasMemoria,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  RepositorioNecessidadeMemoria,
} from "../src/index.js";

describe("IT-015 — Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoContextoPostgres: RepositorioContextoPostgres;

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

    repoContextoPostgres = new RepositorioContextoPostgres(conexao);
  });

  describe("Critério 1: Repositório Transacional PostgreSQL (registros e vínculos)", () => {
    it("deve persistir e recuperar registro de proveniência com JSONB e integridade", async () => {
      const registro = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
        entidadeId: "ev-004-id",
        codigoReferencia: "EV-004",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Auditor da Entrega de Valor",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: {
          resultado: "FORMACAO_SUFICIENTE",
          baseline: "Baseline Essencial",
        },
        vigente: true,
      });

      await repoContextoPostgres.salvarRegistro(registro);

      const recuperado = await repoContextoPostgres.obterRegistroPorId(registro.id);
      expect(recuperado).not.toBeNull();
      expect(recuperado?.codigoReferencia).toBe("EV-004");
      expect(recuperado?.autorResponsavel).toBe("Auditor da Entrega de Valor");
      expect(recuperado?.dadosContexto).toEqual({
        resultado: "FORMACAO_SUFICIENTE",
        baseline: "Baseline Essencial",
      });
      expect(recuperado?.vigente).toBe(true);

      const porCodigo = await repoContextoPostgres.obterRegistrosPorCodigo("EV-004");
      expect(porCodigo).toHaveLength(1);
      expect(porCodigo[0].id).toBe(registro.id);
    });

    it("deve persistir vínculo causal direcionado e respeitar integridade referencial", async () => {
      const regOrigem = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.MODULO,
        entidadeId: "m-004-id",
        codigoReferencia: "M-004",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "Owner",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { aprovado: true },
      });

      const regDestino = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
        entidadeId: "ev-004-id",
        codigoReferencia: "EV-004",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Especialista em Formação",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "FORMADA" },
      });

      await repoContextoPostgres.salvarRegistro(regOrigem);
      await repoContextoPostgres.salvarRegistro(regDestino);

      const vinculo = VinculoCausal.criar(
        regOrigem.id,
        regDestino.id,
        TipoRelacaoCausal.HABILITADO_POR,
        "EV-004 delimitada e habilitada pelo módulo M-004"
      );

      await repoContextoPostgres.salvarVinculo(vinculo);

      const vinculoRecuperado = await repoContextoPostgres.obterVinculoPorId(vinculo.id);
      expect(vinculoRecuperado).not.toBeNull();
      expect(vinculoRecuperado?.origemRegistroId).toBe(regOrigem.id);
      expect(vinculoRecuperado?.destinoRegistroId).toBe(regDestino.id);
      expect(vinculoRecuperado?.tipoRelacao).toBe(TipoRelacaoCausal.HABILITADO_POR);

      const incidentesOrigem = await repoContextoPostgres.listarVinculosPorRegistro(regOrigem.id);
      expect(incidentesOrigem).toHaveLength(1);

      const incidentesDestino = await repoContextoPostgres.listarVinculosPorRegistro(regDestino.id);
      expect(incidentesDestino).toHaveLength(1);
    });

    it("deve rejeitar vínculo causal se a origem ou destino não existirem", async () => {
      const regOrigem = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.MODULO,
        entidadeId: "m-004-id",
        codigoReferencia: "M-004",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "Owner",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      });
      await repoContextoPostgres.salvarRegistro(regOrigem);

      const vinculoInvalido = VinculoCausal.criar(
        regOrigem.id,
        "id-inexistente-destino",
        TipoRelacaoCausal.ORIGINADO_DE
      );

      await expect(repoContextoPostgres.salvarVinculo(vinculoInvalido)).rejects.toThrow(
        /registro de destino 'id-inexistente-destino' não existe/i
      );
    });
  });

  describe("Critério 2: Idempotência de Preservação e Unicidade de Vínculos", () => {
    it("deve permitir atualização idempotente de registro mantendo ID único", async () => {
      const reg = RegistroProveniencia.criar({
        id: "id-fixo-idempotente",
        entidadeTipo: TipoEntidadeContexto.ITEM_DE_TRABALHO,
        entidadeId: "it-015-id",
        codigoReferencia: "IT-015",
        tipoRegistro: TipoRegistroProveniencia.TRANSICAO_STATUS,
        autorResponsavel: "Engenheiro de Software",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "EM_EXECUCAO" },
        vigente: true,
      });

      await repoContextoPostgres.salvarRegistro(reg);

      // Atualiza com novos dados de contexto preservando o id
      const regAtualizado = new RegistroProveniencia({
        id: "id-fixo-idempotente",
        entidadeTipo: TipoEntidadeContexto.ITEM_DE_TRABALHO,
        entidadeId: "it-015-id",
        codigoReferencia: "IT-015",
        tipoRegistro: TipoRegistroProveniencia.TRANSICAO_STATUS,
        autorResponsavel: "Engenheiro de Software",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "CONCLUIDO" },
        vigente: true,
      });

      await repoContextoPostgres.salvarRegistro(regAtualizado);

      const todos = await repoContextoPostgres.listarRegistros({
        codigoReferencia: "IT-015",
      });
      expect(todos).toHaveLength(1);
      expect(todos[0].dadosContexto).toEqual({ status: "CONCLUIDO" });
    });

    it("deve garantir unicidade de vínculo causal direcionado (origem, destino, tipo)", async () => {
      const regA = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001-id",
        codigoReferencia: "P-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "Owner",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      });
      const regB = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.MODULO,
        entidadeId: "m-004-id",
        codigoReferencia: "M-004",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Especialista em Formação",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      });
      await repoContextoPostgres.salvarRegistro(regA);
      await repoContextoPostgres.salvarRegistro(regB);

      const vinc1 = VinculoCausal.criar(regA.id, regB.id, TipoRelacaoCausal.ORIGINADO_DE, "Justificativa 1");
      const vinc2 = VinculoCausal.criar(regA.id, regB.id, TipoRelacaoCausal.ORIGINADO_DE, "Justificativa 2 atualizada");

      await repoContextoPostgres.salvarVinculo(vinc1);
      await repoContextoPostgres.salvarVinculo(vinc2);

      const todos = await repoContextoPostgres.listarTodosVinculos();
      expect(todos).toHaveLength(1);
      expect(todos[0].justificativa).toBe("Justificativa 2 atualizada");
    });
  });

  describe("Critério 3: Serviço de Aplicação Operacional (Casos de Uso Completos)", () => {
    let servico: ServicoContexto;

    beforeEach(() => {
      servico = new ServicoContexto(repoContextoPostgres);
    });

    it("deve executar o ciclo de preservação, vínculo causal e recuperação por finalidade", async () => {
      // 1. Preserva N-001
      const regN = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.NECESSIDADE,
        entidadeId: "n-001-id",
        codigoReferencia: "N-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { decisao: "APROVADO", compromisso: true },
      });

      // 2. Preserva P-001
      const regP = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001-id",
        codigoReferencia: "P-001",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Especialista em Formação de Projeto",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "FORMADO" },
      });

      // 3. Vincula N-001 -> P-001
      await servico.estabelecerVinculoCausal(
        regN.id,
        regP.id,
        TipoRelacaoCausal.ORIGINADO_DE,
        "Projeto originado do compromisso aprovado da necessidade"
      );

      // 4. Preserva EV-004
      const regEV = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
        entidadeId: "ev-004-id",
        codigoReferencia: "EV-004",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Auditor da Entrega de Valor",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { resultado: "FORMACAO_SUFICIENTE" },
      });

      // 5. Vincula P-001 -> EV-004
      await servico.estabelecerVinculoCausal(
        regP.id,
        regEV.id,
        TipoRelacaoCausal.SUSTENTADO_POR,
        "EV-004 integra a direção do projeto P-001"
      );

      // 6. Recupera contexto para EXECUTAR_ITEM
      const pacote = await servico.recuperarContextoPorFinalidade({
        finalidade: FinalidadeContexto.EXECUTAR_ITEM,
        codigoReferencia: "EV-004",
      });

      expect(pacote.finalidadeDeclarada).toBe(FinalidadeContexto.EXECUTAR_ITEM);
      expect(pacote.alvoPrincipal?.codigo).toBe("EV-004");
      expect(pacote.diagnosticoGeral).toBe(DiagnosticoContexto.CONSISTENTE);
      expect(pacote.cadeiaAscendencia).toHaveLength(2); // EV-004 -> P-001 e P-001 -> N-001
    });

    it("deve marcar o registro antigo como superado ao estabelecer vínculo com tipo SUBSTITUI", async () => {
      const regAntigo = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.GOVERNANCA,
        entidadeId: "dec-gov-001",
        codigoReferencia: "DEB-GOV-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "Owner",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "ABERTO" },
        vigente: true,
      });

      const regNovo = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.GOVERNANCA,
        entidadeId: "dec-gov-001-resolvido",
        codigoReferencia: "DEB-GOV-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "Owner",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { status: "RESOLVIDO" },
        vigente: true,
      });

      // Vínculo SUBSTITUI: regNovo substitui regAntigo
      await servico.estabelecerVinculoCausal(
        regNovo.id,
        regAntigo.id,
        TipoRelacaoCausal.SUBSTITUI,
        "Decisão homologatória definitiva do Owner supera a indefinição anterior"
      );

      const regAntigoRecarregado = await repoContextoPostgres.obterRegistroPorId(regAntigo.id);
      const regNovoRecarregado = await repoContextoPostgres.obterRegistroPorId(regNovo.id);

      expect(regAntigoRecarregado?.vigente).toBe(false);
      expect(regNovoRecarregado?.vigente).toBe(true);
    });

    it("deve obter trilha de rastreabilidade genealógica com ascendência e alertas", async () => {
      const regN = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.NECESSIDADE,
        entidadeId: "n-001-id",
        codigoReferencia: "N-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { homologado: true },
      });

      const regP = await servico.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001-id",
        codigoReferencia: "P-001",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Formador",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { direcao: "CONSOLIDADA" },
      });

      await servico.estabelecerVinculoCausal(regN.id, regP.id, TipoRelacaoCausal.ORIGINADO_DE);

      const trilhaP = await servico.obterTrilhaRastreabilidade("P-001");
      expect(trilhaP.alvo?.codigoReferencia).toBe("P-001");
      expect(trilhaP.elosAscendencia).toHaveLength(1);
      expect(trilhaP.elosAscendencia[0].codigoOrigem).toBe("N-001");
      expect(trilhaP.diagnostico).toBe(DiagnosticoContexto.CONSISTENTE);

      // Consulta de código não existente deve retornar lacuna
      const trilhaInexistente = await servico.obterTrilhaRastreabilidade("INEXISTENTE-999");
      expect(trilhaInexistente.alvo).toBeNull();
      expect(trilhaInexistente.diagnostico).toBe(DiagnosticoContexto.LACUNA_DETECTADA);
      expect(trilhaInexistente.alertas).toHaveLength(1);
    });
  });

  describe("Critério 4: Worker Desacoplado Integrado e Auditoria em Background", () => {
    it("deve executar auditoria de consistência de contexto via worker", async () => {
      const fila = new FilaTarefasMemoria();
      const repoNec = new RepositorioNecessidadeMemoria();
      const portaProj = new AdaptadorIntegracaoProjeto();
      const portaCtx = new AdaptadorIntegracaoContexto();

      const servicoContexto = new ServicoContexto(repoContextoPostgres, undefined, fila);

      const worker = new WorkerSegundoPlano(
        fila,
        repoNec,
        portaProj,
        portaCtx,
        { intervaloPollingMs: 50 },
        undefined,
        servicoContexto
      );

      // Prepara dados no banco relacional
      const reg = await servicoContexto.preservarRegistro({
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001-auditoria",
        codigoReferencia: "P-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { auditado: true },
      });

      // Solicita auditoria em background
      const tarefaId = await servicoContexto.agendarAuditoriaBackground("p-001-auditoria");
      expect(tarefaId).not.toBeNull();

      // Executa ciclo do worker
      const processou = await worker.executarCicloUnico();
      expect(processou).toBe(true);

      // Verifica histórico gravado na porta de rastreabilidade
      const historico = await portaCtx.obterHistoricoContexto("p-001-auditoria");
      expect(historico.length).toBeGreaterThanOrEqual(1);
      const eventoAuditoria = historico.find((e) => e.tipoEvento === "AUDITORIA_CONTEXTO_CONCLUIDA");
      expect(eventoAuditoria).toBeDefined();
      expect(eventoAuditoria?.dados.diagnosticoGeral).toBe(DiagnosticoContexto.CONSISTENTE);
      expect(eventoAuditoria?.dados.totalAuditados).toBe(1);
    });
  });
});
