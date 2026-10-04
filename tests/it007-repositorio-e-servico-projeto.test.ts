import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioProjetoPostgres,
  RepositorioProjetoMemoria,
  RepositorioNecessidadePostgres,
  ServicoAplicacaoProjeto,
  AdaptadorIntegracaoProjeto,
  Projeto,
  Necessidade,
  TipoNecessidade,
  StatusProjeto,
  StatusNecessidade,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  AtorCompetenteProjeto,
  AtorCompetenteNecessidade,
  TipoResultadoProcesso,
  DecisaoMaterialOwner,
  ServicoCompromissoNecessidade,
  WorkerSegundoPlano,
  FilaTarefasMemoria,
  AdaptadorIntegracaoContexto,
} from "../src/index.js";

describe("IT-007 — Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoProjetoPostgres: RepositorioProjetoPostgres;
  let repoNecessidadePostgres: RepositorioNecessidadePostgres;

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

    const executor = new ExecutorMigracoes(conexao);
    await executor.executarMigracoes();

    repoProjetoPostgres = new RepositorioProjetoPostgres(conexao);
    repoNecessidadePostgres = new RepositorioNecessidadePostgres(conexao);
  });

  afterEach(async () => {
    await conexao.encerrar();
  });

  describe("Critério 1: Repositório Transacional PostgreSQL de Projeto", () => {
    it("deve salvar e hidratar um Projeto completo com etapas, auditorias e direção", async () => {
      // 1. Criar necessidade prévia no banco
      const nec = new Necessidade({
        id: "nec-it007-01",
        codigo: "N-701",
        titulo: "Necessidade Teste IT-007",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema teste",
        quemEAfetado: "Equipe",
        resultadoPretendido: "Resultado teste",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });
      await repoNecessidadePostgres.salvar(nec);

      // 2. Criar Projeto e adicionar etapas, auditoria e concluir com direção
      const projeto = new Projeto({
        id: "proj-it007-01",
        codigo: "P-701",
        necessidadeId: "nec-it007-01",
        titulo: "Projeto Teste IT-007",
      });

      projeto.registrarEtapaFormacao(
        AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
        EtapaFormacaoProjeto.ENQUADRAMENTO,
        { escopo: "Enquadramento inicial", alinhamento: "Total" }
      );

      projeto.registrarAuditoria(
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
        "Formação cumpre todos os requisitos normativos da EV-002"
      );

      projeto.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
        compromissoOrigem: "Compromisso N-701",
        objetivoProjeto: "Objetivo do Projeto P-701",
        fronteiras: "M-002 delimitado",
        contextoRelevante: "Contexto persistido em PostgreSQL",
      });

      // 3. Salvar no repositório PostgreSQL
      await repoProjetoPostgres.salvar(projeto);

      // 4. Recuperar por ID e validar hidratação completa
      const recuperado = await repoProjetoPostgres.obterPorId("proj-it007-01");
      expect(recuperado).not.toBeNull();
      expect(recuperado?.id).toBe("proj-it007-01");
      expect(recuperado?.codigo).toBe("P-701");
      expect(recuperado?.necessidadeId).toBe("nec-it007-01");
      expect(recuperado?.status).toBe(StatusProjeto.FORMADO);
      expect(recuperado?.etapas.length).toBe(1);
      expect(recuperado?.etapas[0]?.etapa).toBe(EtapaFormacaoProjeto.ENQUADRAMENTO);
      expect(recuperado?.auditorias.length).toBe(1);
      expect(recuperado?.auditorias[0]?.resultado).toBe(TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE);
      expect(recuperado?.direcao).not.toBeNull();
      expect(recuperado?.direcao?.objetivoProjeto).toBe("Objetivo do Projeto P-701");

      // 5. Recuperar por Necessidade ID
      const porNec = await repoProjetoPostgres.obterPorNecessidadeId("nec-it007-01");
      expect(porNec?.id).toBe("proj-it007-01");

      // 6. Recuperar por Código
      const porCod = await repoProjetoPostgres.obterPorCodigo("P-701");
      expect(porCod?.id).toBe("proj-it007-01");

      // 7. Listar todos
      const todos = await repoProjetoPostgres.listarTodos();
      expect(todos.length).toBe(1);
    });

    it("deve suportar RepositorioProjetoMemoria com paridade funcional", async () => {
      const repoMemoria = new RepositorioProjetoMemoria();
      const projeto = new Projeto({
        id: "proj-mem-01",
        codigo: "P-999",
        necessidadeId: "nec-mem-01",
        titulo: "Projeto em Memória",
      });

      await repoMemoria.salvar(projeto);

      const porId = await repoMemoria.obterPorId("proj-mem-01");
      expect(porId?.codigo).toBe("P-999");

      const porNec = await repoMemoria.obterPorNecessidadeId("nec-mem-01");
      expect(porNec?.id).toBe("proj-mem-01");

      const porCod = await repoMemoria.obterPorCodigo("P-999");
      expect(porCod?.id).toBe("proj-mem-01");

      const todos = await repoMemoria.listarTodos();
      expect(todos.length).toBe(1);
    });
  });

  describe("Critério 2: Bootstrap Idempotente e Serviço de Aplicação de Projeto", () => {
    it("deve criar exatamente 1 Projeto no bootstrap e devolver jaExistente: true em chamadas repetidas", async () => {
      const servico = new ServicoAplicacaoProjeto(repoProjetoPostgres, repoNecessidadePostgres);

      // Inserir Necessidade base
      const nec = new Necessidade({
        id: "nec-boot-01",
        codigo: "N-801",
        titulo: "Demanda para Bootstrap",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Oportunidade",
        quemEAfetado: "Usuários",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Inovação",
      });
      await repoNecessidadePostgres.salvar(nec);

      // Primeira solicitação de bootstrap
      const conf1 = await servico.solicitarBootstrapProjeto({
        necessidadeId: "nec-boot-01",
        codigoNecessidade: "N-801",
        tituloProjeto: "Projeto da Demanda 801",
        problemaOrigem: "Oportunidade",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      expect(conf1.jaExistente).toBe(false);
      expect(conf1.necessidadeId).toBe("nec-boot-01");
      expect(conf1.projetoId).toBeDefined();

      // Segunda solicitação de bootstrap com mesma necessidadeId
      const conf2 = await servico.solicitarBootstrapProjeto({
        necessidadeId: "nec-boot-01",
        codigoNecessidade: "N-801",
        tituloProjeto: "Tentativa Duplicada",
        problemaOrigem: "Oportunidade",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      expect(conf2.jaExistente).toBe(true);
      expect(conf2.projetoId).toBe(conf1.projetoId);

      // Conferir que apenas 1 projeto foi criado no banco
      const todos = await repoProjetoPostgres.listarTodos();
      expect(todos.length).toBe(1);
      expect(todos[0]?.id).toBe(conf1.projetoId);
    });

    it("deve orquestrar as etapas de formação e auditoria pelo ServicoAplicacaoProjeto", async () => {
      const servico = new ServicoAplicacaoProjeto(repoProjetoPostgres, repoNecessidadePostgres);

      // Inserir Necessidade base nec-boot-02 para satisfazer chave estrangeira no PostgreSQL
      const nec2 = new Necessidade({
        id: "nec-boot-02",
        codigo: "N-802",
        titulo: "Projeto Formação Completa",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Equipes",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Planejamento",
      });
      await repoNecessidadePostgres.salvar(nec2);

      // Criar projeto base
      const conf = await servico.solicitarBootstrapProjeto({
        necessidadeId: "nec-boot-02",
        codigoNecessidade: "N-802",
        tituloProjeto: "Projeto Formação Completa",
        problemaOrigem: "Problema",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        usuarioAprovador: "mhj",
      });

      // Registrar Etapa de Enquadramento
      await servico.registrarEtapaFormacao(
        conf.projetoId,
        EtapaFormacaoProjeto.ENQUADRAMENTO,
        { visao: "Enquadramento documentado" }
      );

      // Registrar Etapa de Descoberta
      await servico.registrarEtapaFormacao(
        conf.projetoId,
        EtapaFormacaoProjeto.DESCOBERTA,
        { riscos: ["Risco técnico mapeado"] }
      );

      // Registrar Etapa de Direção da Solução
      await servico.registrarEtapaFormacao(
        conf.projetoId,
        EtapaFormacaoProjeto.DIRECAO_DA_SOLUCAO,
        { diretrizes: "Arquitetura limpa" }
      );

      // Registrar Auditoria FORMACAO_SUFICIENTE com Direção
      await servico.registrarParecerAuditoria(
        conf.projetoId,
        TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
        "Todas as etapas preenchidas com excelência",
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        {
          compromissoOrigem: "Compromisso N-802",
          objetivoProjeto: "Objetivo do Projeto",
          fronteiras: "M-002",
          contextoRelevante: "Contexto validado",
        }
      );

      const visao = await servico.obterProjetoPorId(conf.projetoId);
      expect(visao).not.toBeNull();
      expect(visao?.status).toBe(StatusProjeto.FORMADO);
      expect(visao?.etapas.length).toBe(3);
      expect(visao?.auditorias.length).toBe(1);
      expect(visao?.direcao).not.toBeNull();
      expect(visao?.direcao?.objetivoProjeto).toBe("Objetivo do Projeto");

      const dir = await servico.obterDirecaoProjeto(conf.projetoId);
      expect(dir?.fronteiras).toBe("M-002");
    });
  });

  describe("Critério 3 e 4: Sincronização M-001 <-> M-002 e Testes de Integração com Worker", () => {
    it("deve sincronizar a Necessidade para EM_PROJETO ao confirmar bootstrap via Adaptador e Worker", async () => {
      // 1. Criar e aprovar Necessidade N-001
      const nec = new Necessidade({
        id: "nec-sinc-01",
        codigo: "N-901",
        titulo: "Necessidade Sincronizada",
        tipo: TipoNecessidade.NOVO_PRODUTO,
        problemaOuOportunidade: "Problema",
        quemEAfetado: "Pessoas",
        resultadoPretendido: "Resultado",
        escopoInicial: "Escopo",
        foraDeEscopo: "Fora",
        criterioDeAtendimento: "Critério",
        porQueIssoImporta: "Importa",
        restricoesOuDependencias: "Nenhuma",
        origem: "Teste",
      });

      // Fluxo canônico até decisão e compromisso
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
        TipoResultadoProcesso.QUALIFICAVEL,
        {}
      );
      nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
        TipoResultadoProcesso.ASSUMIR_COMPROMISSO,
        {}
      );
      nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);
      nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "mhj", "Aprovado");
      ServicoCompromissoNecessidade.compor(nec);

      await repoNecessidadePostgres.salvar(nec);
      expect(nec.status).toBe(StatusNecessidade.AGUARDANDO_DECISAO);

      // 2. Configurar AdaptadorIntegracaoProjeto conectado ao ServicoAplicacaoProjeto
      const servicoProjeto = new ServicoAplicacaoProjeto(repoProjetoPostgres, repoNecessidadePostgres);
      const portaProjeto = new AdaptadorIntegracaoProjeto(servicoProjeto);
      const portaContexto = new AdaptadorIntegracaoContexto();
      const filaTarefas = new FilaTarefasMemoria();

      // 3. Worker processando fila em background
      const worker = new WorkerSegundoPlano(
        filaTarefas,
        repoNecessidadePostgres,
        portaProjeto,
        portaContexto
      );

      // Agendar tarefa de reconciliação de bootstrap
      await filaTarefas.enfileirar("BOOTSTRAP_PROJETO_M002", {
        necessidadeId: nec.id,
      });

      // Executar ciclo do worker
      const processado = await worker.executarCicloUnico();
      expect(processado).toBe(true);

      // 4. Verificar se Necessidade em PostgreSQL agora está no status EM_PROJETO
      const necAtualizada = await repoNecessidadePostgres.obterPorId(nec.id);
      expect(necAtualizada?.status).toBe(StatusNecessidade.EM_PROJETO);
      expect(necAtualizada?.projetoId).toBeDefined();

      // 5. Verificar se Projeto foi criado no banco
      const projetoCriado = await repoProjetoPostgres.obterPorNecessidadeId(nec.id);
      expect(projetoCriado).not.toBeNull();
      expect(projetoCriado?.id).toBe(necAtualizada?.projetoId);
      expect(projetoCriado?.status).toBe(StatusProjeto.EM_FORMACAO);

      // 6. Verificar rastreabilidade de contexto registrada no M-004
      const historicoContexto = await portaContexto.obterHistoricoContexto(nec.id);
      expect(historicoContexto.length).toBeGreaterThan(0);
      expect(historicoContexto[0]?.tipoEvento).toBe("BOOTSTRAP_PROJETO_CONCLUIDO");
    });
  });
});
