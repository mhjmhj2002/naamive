import { describe, it, expect, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioProjetoPostgres,
  RepositorioCoordenacaoPostgres,
  RepositorioNecessidadePostgres,
  Necessidade,
  TipoNecessidade,
  Projeto,
  StatusProjeto,
  TrabalhoCoordenado,
  CondicaoOperacionalTrabalho,
  DespachanteAutonomoAgentes,
  PortaDespachoAgente,
  ResultadoDespachoAgente,
  WorkerSegundoPlano,
  FilaTarefasMemoria,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  ServicoAplicacaoProjeto,
  ServicoAplicacaoCoordenacao,
} from "../src/index.js";

describe("DEB-TEC-001 — Despachante Autônomo de Agentes e Integração com WorkerSegundoPlano", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoProjeto: RepositorioProjetoPostgres;
  let repoCoordenacao: RepositorioCoordenacaoPostgres;
  let repoNecessidade: RepositorioNecessidadePostgres;

  const projetoId = "proj-deb-tec-001";

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

    repoProjeto = new RepositorioProjetoPostgres(conexao);
    repoCoordenacao = new RepositorioCoordenacaoPostgres(conexao);
    repoNecessidade = new RepositorioNecessidadePostgres(conexao);

    // Necessidade base
    const nec = new Necessidade({
      id: "nec-deb-001",
      codigo: "N-001",
      titulo: "Autonomia Agêntica do NAAMIVE",
      tipo: TipoNecessidade.NOVO_PRODUTO,
      problemaOuOportunidade: "Dependência de acionamento manual no chat",
      quemEAfetado: "Equipe NAAMIVE",
      resultadoPretendido: "Despacho autônomo com contenção humana",
      escopoInicial: "Escopo inicial",
      foraDeEscopo: "Fora de escopo",
      criterioDeAtendimento: "Atendimento completo",
      porQueIssoImporta: "Autonomia progressiva",
      restricoesOuDependencias: "Invariante humano do Owner",
      origem: "DEB-TEC-001",
    });
    await repoNecessidade.salvar(nec);

    // Projeto base
    const projeto = new Projeto({
      id: projetoId,
      codigo: "P-001",
      necessidadeId: "nec-deb-001",
      titulo: "Jornada Autônoma do NAAMIVE",
      status: StatusProjeto.FORMADO,
    });
    await repoProjeto.salvar(projeto);
  });

  describe("Fase 1: DespachanteAutonomoAgentes (Domínio e Regras de Segurança)", () => {
    it("deve despachar handoff e encadear sucessores automaticamente em caso de sucesso agêntico", async () => {
      // Cria cadeia: Trabalho 1 (Executor) -> Trabalho 2 (Integrador)
      const t1 = new TrabalhoCoordenado({
        id: "trb-001",
        codigo: "IT-EXEC-01",
        projetoId,
        titulo: "Execução do Item de Trabalho",
        objetivo: "Implementar funcionalidade",
        competenciaRequerida: "Engenharia de Software",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: "execucao-do-item-de-trabalho",
        criterioTermino: "Código e testes produzidos",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      const t2 = new TrabalhoCoordenado({
        id: "trb-002",
        codigo: "IT-INTEG-01",
        projetoId,
        titulo: "Integração da Realização",
        objetivo: "Integrar e validar suíte",
        competenciaRequerida: "Integração Técnica",
        atorRequerido: "Integrador da Realização",
        skillRequerida: "integracao-da-realizacao",
        criterioTermino: "Suíte 100% verde",
        dependencias: ["IT-EXEC-01"],
        condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
      });

      await repoCoordenacao.salvar(t1);
      await repoCoordenacao.salvar(t2);

      const acionamentos: string[] = [];
      const mockPortaDespacho: PortaDespachoAgente = {
        async despacharAgente(handoff): Promise<ResultadoDespachoAgente> {
          acionamentos.push(handoff.atorDestinatario);
          return {
            sucesso: true,
            tokenCorrelacao: handoff.tokenCorrelacao,
            ator: handoff.atorDestinatario,
            skill: handoff.skillDestinataria,
            resultadoObservavel: `Atividade executada com êxito por ${handoff.atorDestinatario}.`,
          };
        },
      };

      const despachante = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);

      // Rodada 1: deve executar t1 (PREPARADO), promovendo t2 para PREPARADO
      const res1 = await despachante.executarCicloAutonomo(projetoId);
      expect(res1.despachosRealizados).toBe(1);
      expect(res1.handoffsDespachados[0]?.codigoTrabalho).toBe("IT-EXEC-01");
      expect(res1.retornosProcessados[0]?.sucesso).toBe(true);

      const t1Salvo = await repoCoordenacao.obterPorId("trb-001");
      expect(t1Salvo?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);

      const t2AposR1 = await repoCoordenacao.obterPorId("trb-002");
      expect(t2AposR1?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Rodada 2: deve agora executar t2 (PREPARADO)
      const res2 = await despachante.executarCicloAutonomo(projetoId);
      expect(res2.despachosRealizados).toBe(1);
      expect(res2.handoffsDespachados[0]?.codigoTrabalho).toBe("IT-INTEG-01");

      const t2Salvo = await repoCoordenacao.obterPorId("trb-002");
      expect(t2Salvo?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
      expect(acionamentos).toEqual(["Engenheiro de Software", "Integrador da Realização"]);
    });

    it("deve aplicar contenção estrita em AGUARDANDO_DECISAO_HUMANA quando a etapa for exclusiva do Owner", async () => {
      // Trabalho com Ator Requerido = Owner (ex: Homologação Soberana do Owner)
      const tOwner = new TrabalhoCoordenado({
        id: "trb-owner-01",
        codigo: "IT-HOMOLOG-01",
        projetoId,
        titulo: "Homologação do Owner da Entrega de Valor",
        objetivo: "Decisão Material Homologação pelo Owner",
        competenciaRequerida: "Autoridade Soberana de Negócio",
        atorRequerido: "Owner",
        skillRequerida: null,
        criterioTermino: "HOMOLOGADO_PELO_OWNER",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      await repoCoordenacao.salvar(tOwner);

      let chamouPorta = false;
      const mockPortaDespacho: PortaDespachoAgente = {
        async despacharAgente(_handoff): Promise<ResultadoDespachoAgente> {
          chamouPorta = true;
          return {
            sucesso: true,
            tokenCorrelacao: "invalido",
            ator: "Owner",
          };
        },
      };

      const despachante = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);
      const res = await despachante.executarCicloAutonomo(projetoId);

      // Deve conter imediatamente sem despachar na porta de agentes
      expect(chamouPorta).toBe(false);
      expect(res.despachosRealizados).toBe(0);
      expect(res.contencoesHumanas.length).toBe(1);
      expect(res.contencoesHumanas[0]?.codigoTrabalho).toBe("IT-HOMOLOG-01");

      const tOwnerSalvo = await repoCoordenacao.obterPorId("trb-owner-01");
      expect(tOwnerSalvo?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);
      expect(tOwnerSalvo?.motivoBloqueio).toContain("Ponto de Interrupção Humana Mandatório");
    });

    it("deve conter em AGUARDANDO_DECISAO_HUMANA quando o agente reportar pendência ou dilema para o Owner", async () => {
      const tAgente = new TrabalhoCoordenado({
        id: "trb-dilema-01",
        codigo: "IT-DILEMA-01",
        projetoId,
        titulo: "Análise de Arquitetura",
        objetivo: "Avaliar trade-offs técnicos",
        competenciaRequerida: "Arquitetura",
        atorRequerido: "Arquiteto de Software",
        skillRequerida: "execucao-do-item-de-trabalho",
        criterioTermino: "Diretriz aprovada",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      await repoCoordenacao.salvar(tAgente);

      const mockPortaDespacho: PortaDespachoAgente = {
        async despacharAgente(handoff): Promise<ResultadoDespachoAgente> {
          return {
            sucesso: false,
            tokenCorrelacao: handoff.tokenCorrelacao,
            ator: handoff.atorDestinatario,
            mensagemRetorno: "Divergência de custos identificada.",
            resultadoObservavel: "Impossível seguir sem confirmação orçamentária.",
            pendenciasOuBloqueios: "Aguardando Decisão Humana do Owner sobre custos de nuvem.",
          };
        },
      };

      const despachante = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);
      const res = await despachante.executarCicloAutonomo(projetoId);

      expect(res.despachosRealizados).toBe(1);
      expect(res.retornosProcessados[0]?.sucesso).toBe(false);
      expect(res.retornosProcessados[0]?.condicaoResultante).toBe(
        CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA
      );

      const tSalvo = await repoCoordenacao.obterPorId("trb-dilema-01");
      expect(tSalvo?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);
    });
  });

  describe("Fase 2: Integração com WorkerSegundoPlano e Fila de Tarefas", () => {
    it("deve processar tarefa DESPACHAR_HANDOFF_AUTONOMO no WorkerSegundoPlano integrando com telemetria causal", async () => {
      const fila = new FilaTarefasMemoria();
      const servicoProj = new ServicoAplicacaoProjeto(repoProjeto, repoNecessidade);
      const portaProj = new AdaptadorIntegracaoProjeto(servicoProj);
      const portaCtx = new AdaptadorIntegracaoContexto();
      const servicoCoord = new ServicoAplicacaoCoordenacao(repoCoordenacao, repoProjeto, fila);

      const tAuto = new TrabalhoCoordenado({
        id: "trb-worker-auto-01",
        codigo: "IT-WORKER-01",
        projetoId,
        titulo: "Verificação de Software Autônoma",
        objetivo: "Executar checagens automatizadas",
        competenciaRequerida: "Verificação Técnica",
        atorRequerido: "Verificador da Entrega de Valor",
        skillRequerida: "verificacao-da-entrega-de-valor",
        criterioTermino: "Laudo emitido",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });
      await repoCoordenacao.salvar(tAuto);

      const acionados: string[] = [];
      const mockPortaDespacho: PortaDespachoAgente = {
        async despacharAgente(handoff): Promise<ResultadoDespachoAgente> {
          acionados.push(handoff.atorDestinatario);
          return {
            sucesso: true,
            tokenCorrelacao: handoff.tokenCorrelacao,
            ator: handoff.atorDestinatario,
            skill: handoff.skillDestinataria,
            resultadoObservavel: "Laudo de verificação emitido com sucesso.",
          };
        },
      };

      const despachante = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);

      const worker = new WorkerSegundoPlano(
        fila,
        repoNecessidade,
        portaProj,
        portaCtx,
        { intervaloPollingMs: 50, modoAutonomoAtivo: true },
        servicoCoord,
        undefined,
        undefined,
        despachante
      );

      // Enfileira a tarefa de despacho autônomo
      await fila.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", {
        projetoId,
      });

      // Executa o ciclo único do worker
      const processou = await worker.executarCicloUnico();
      expect(processou).toBe(true);
      expect(worker.totalProcessado).toBe(1);

      // Verifica que o trabalho foi despachado e concluído
      const tAtual = await repoCoordenacao.obterPorId("trb-worker-auto-01");
      expect(tAtual?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
      expect(acionados).toEqual(["Verificador da Entrega de Valor"]);

      // Verifica telemetria de rastreabilidade no M-004
      const historicoCtx = await portaCtx.obterHistoricoContexto(projetoId);
      const eventoDespacho = historicoCtx.find((e) => e.tipoEvento === "DESPACHO_AUTONOMO_PROCESSADO");
      expect(eventoDespacho).toBeDefined();
      expect(eventoDespacho?.dados.despachosRealizados).toBe(1);
    });

    it("deve permitir pausar e reativar o modo autônomo no WorkerSegundoPlano", async () => {
      const fila = new FilaTarefasMemoria();
      const servicoProj = new ServicoAplicacaoProjeto(repoProjeto, repoNecessidade);
      const portaProj = new AdaptadorIntegracaoProjeto(servicoProj);
      const portaCtx = new AdaptadorIntegracaoContexto();
      const servicoCoord = new ServicoAplicacaoCoordenacao(repoCoordenacao, repoProjeto, fila);

      const tAuto = new TrabalhoCoordenado({
        id: "trb-worker-pause-01",
        codigo: "IT-PAUSE-01",
        projetoId,
        titulo: "Trabalho com Pausa",
        objetivo: "Não deve despachar se pausado",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: "execucao-do-item-de-trabalho",
        criterioTermino: "Critério",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });
      await repoCoordenacao.salvar(tAuto);

      let chamadas = 0;
      const mockPortaDespacho: PortaDespachoAgente = {
        async despacharAgente(_handoff): Promise<ResultadoDespachoAgente> {
          chamadas++;
          return { sucesso: true, tokenCorrelacao: "token", ator: "agente" };
        },
      };

      const despachante = new DespachanteAutonomoAgentes(repoCoordenacao, mockPortaDespacho);

      const worker = new WorkerSegundoPlano(
        fila,
        repoNecessidade,
        portaProj,
        portaCtx,
        { intervaloPollingMs: 50, modoAutonomoAtivo: false }, // Iniciado como PAUSADO
        servicoCoord,
        undefined,
        undefined,
        despachante
      );

      expect(worker.estaModoAutonomoAtivo).toBe(false);

      // Enfileira tarefa com modo pausado
      await fila.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", { projetoId });
      await worker.executarCicloUnico();

      // Nenhuma chamada deve ter ocorrido
      expect(chamadas).toBe(0);
      const tAindaPrep = await repoCoordenacao.obterPorId("trb-worker-pause-01");
      expect(tAindaPrep?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Reativa o modo autônomo
      worker.definirModoAutonomo(true);
      expect(worker.estaModoAutonomoAtivo).toBe(true);

      await fila.enfileirar("DESPACHAR_HANDOFF_AUTONOMO", { projetoId });
      await worker.executarCicloUnico();

      expect(chamadas).toBe(1);
      const tEncerrado = await repoCoordenacao.obterPorId("trb-worker-pause-01");
      expect(tEncerrado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
    });
  });
});
