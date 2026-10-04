import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
  FilaTarefasPostgres,
  WorkerSegundoPlano,
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioNecessidadePostgres,
  AutoridadeInvalidaErro,
  AutenticacaoRequeridaErro,
} from "../src/index.js";

const dadosValidos = {
  id: "nec-it003-01",
  codigo: "N-003",
  titulo: "Worker e Integrações Desacopladas",
  tipo: TipoNecessidade.EVOLUCAO_DE_PRODUTO,
  problemaOuOportunidade: "Processamento contínuo em background desacoplado do ciclo HTTP.",
  quemEAfetado: "Operação do sistema e fluxos agênticos assíncronos.",
  resultadoPretendido: "Processar tarefas com integridade e idempotência nas portas de integração.",
  escopoInicial: "Worker, autenticação de Owner, portas M-002 e M-004.",
  foraDeEscopo: "Interfaces gráficas do usuário web.",
  criterioDeAtendimento: "Worker processa jobs e respeita regras de idempotência e autoridade.",
  porQueIssoImporta: "Garante robustez arquitetural e desacoplamento.",
  origem: "Planejamento EV-001 IT-003.",
};

describe("IT-003 — Worker em Background Desacoplado, Autenticação e Portas de Integração", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let gerenciadorConexao: GerenciadorConexao;
  let repositorioPostgres: RepositorioNecessidadePostgres;

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
    gerenciadorConexao = new GerenciadorConexao(undefined, pgPool);

    // Aplica migrações 001 e 002
    const executor = new ExecutorMigracoes(gerenciadorConexao);
    await executor.executarMigracoes();

    repositorioPostgres = new RepositorioNecessidadePostgres(gerenciadorConexao);
  });

  afterEach(async () => {
    await gerenciadorConexao.encerrar();
  });

  describe("Critério 1: Execução Contínua do Worker e Ciclo de Polling Assíncrono", () => {
    it("deve iniciar o worker, processar tarefas agendadas e parar graciosamente sem bloquear recursos", async () => {
      const filaMemoria = new FilaTarefasMemoria();
      const portaProjeto = new AdaptadorIntegracaoProjeto();
      const portaContexto = new AdaptadorIntegracaoContexto();

      const worker = new WorkerSegundoPlano(
        filaMemoria,
        repositorioPostgres,
        portaProjeto,
        portaContexto,
        { intervaloPollingMs: 20 }
      );

      expect(worker.estaExecutando).toBe(false);
      expect(worker.totalProcessado).toBe(0);

      // Enfileira tarefas
      await filaMemoria.enfileirar("RECONCILIACAO_CONTEXTO", {
        idOrigem: "nec-001",
        tipoEvento: "EVENTO_TESTE_1",
        dados: { chave: "valor" },
      });

      await filaMemoria.enfileirar("RECONCILIACAO_CONTEXTO", {
        idOrigem: "nec-001",
        tipoEvento: "EVENTO_TESTE_2",
        dados: { chave: "valor2" },
      });

      // Inicia o worker em background
      worker.iniciar();
      expect(worker.estaExecutando).toBe(true);

      // Aguarda processamento de ciclo contínuo
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Para graciosamente
      await worker.parar();
      expect(worker.estaExecutando).toBe(false);
      expect(worker.totalProcessado).toBe(2);

      // Verifica histórico de contexto no M-004
      const historico = await portaContexto.obterHistoricoContexto("nec-001");
      expect(historico.length).toBe(2);
      expect(historico[0]?.tipoEvento).toBe("EVENTO_TESTE_1");
      expect(historico[1]?.tipoEvento).toBe("EVENTO_TESTE_2");
    });

    it("deve operar com a fila persistida no PostgreSQL com isolamento transacional", async () => {
      const filaPostgres = new FilaTarefasPostgres(gerenciadorConexao);
      const tarefaEnfileirada = await filaPostgres.enfileirar("TAREFA_SQL", { teste: true });

      expect(tarefaEnfileirada.id).toBeDefined();
      expect(tarefaEnfileirada.status).toBe("PENDENTE");

      const proxima = await filaPostgres.obterProximaTarefa();
      expect(proxima).not.toBeNull();
      expect(proxima?.id).toBe(tarefaEnfileirada.id);
      expect(proxima?.status).toBe("PROCESSANDO");

      await filaPostgres.concluirTarefa(proxima!.id);

      const nenhumaPendente = await filaPostgres.obterProximaTarefa();
      expect(nenhumaPendente).toBeNull();
    });
  });

  describe("Critério 2: Autenticação Obrigatória do Owner e Proteção de Decisão Material", () => {
    it("deve permitir autenticação e validação para usuário com autoridade do Owner (ex: 'mhj')", async () => {
      const adaptadorAuth = new AdaptadorAutenticacaoOwner(["mhj", "owner"]);

      const credencial = await adaptadorAuth.autenticar({ usuario: "mhj" });
      expect(credencial.identificadorUsuario).toBe("mhj");
      expect(credencial.papeis).toContain("Owner");

      const valido = await adaptadorAuth.verificarIdentidadeOwner("mhj");
      expect(valido).toBe(true);

      const usuarioConfirmado = await adaptadorAuth.exigirIdentidadeOwner("mhj");
      expect(usuarioConfirmado).toBe("mhj");
    });

    it("deve rejeitar tentativas de autenticação sem identificador de usuário ou credencial inválida", async () => {
      const adaptadorAuth = new AdaptadorAutenticacaoOwner(["mhj"]);

      await expect(adaptadorAuth.autenticar(null)).rejects.toThrow(AutenticacaoRequeridaErro);
      await expect(adaptadorAuth.autenticar({ usuario: "" })).rejects.toThrow(AutenticacaoRequeridaErro);
      await expect(adaptadorAuth.autenticar({ usuario: "   " })).rejects.toThrow(AutenticacaoRequeridaErro);
      await expect(adaptadorAuth.exigirIdentidadeOwner("")).rejects.toThrow(AutenticacaoRequeridaErro);
    });

    it("deve rejeitar com erro explícito de autoridade qualquer usuário que não seja o Owner", async () => {
      const adaptadorAuth = new AdaptadorAutenticacaoOwner(["mhj"]);

      await expect(adaptadorAuth.autenticar({ usuario: "usuario_comum" })).rejects.toThrow(
        AutoridadeInvalidaErro
      );

      await expect(adaptadorAuth.exigirIdentidadeOwner("invasor")).rejects.toThrow(
        AutoridadeInvalidaErro
      );
    });
  });

  describe("Critério 3: Idempotência da Integração com M-002 e Rastreabilidade com M-004", () => {
    it("deve garantir que múltiplas solicitações de bootstrap de Projeto para a mesma Necessidade retornem o mesmo Projeto (invariante 1:1)", async () => {
      const portaProjeto = new AdaptadorIntegracaoProjeto();

      const solicitacao = {
        necessidadeId: "nec-001",
        codigoNecessidade: "N-001",
        tituloProjeto: "Projeto Autonomia NAAMIVE",
        problemaOrigem: "Problema teste",
        resultadoPretendido: "Resultado teste",
        escopoInicial: "Escopo inicial",
        usuarioAprovador: "mhj",
      };

      // Primeira chamada: cria o projeto
      const res1 = await portaProjeto.solicitarBootstrapProjeto(solicitacao);
      expect(res1.projetoId).toBe("proj-nec-001");
      expect(res1.jaExistente).toBe(false);

      // Segunda chamada idêntica: retorna o projeto existente sem duplicação
      const res2 = await portaProjeto.solicitarBootstrapProjeto(solicitacao);
      expect(res2.projetoId).toBe(res1.projetoId);
      expect(res2.jaExistente).toBe(true);

      // Consulta posterior por necessidadeId
      const consulta = await portaProjeto.obterProjetoPorNecessidade("nec-001");
      expect(consulta?.projetoId).toBe(res1.projetoId);
    });

    it("deve executar o fluxo completo do worker processando o bootstrap de projeto após compromisso da necessidade", async () => {
      const filaMemoria = new FilaTarefasMemoria();
      const portaProjeto = new AdaptadorIntegracaoProjeto();
      const portaContexto = new AdaptadorIntegracaoContexto();

      // Cria e prepara a necessidade no domínio até APROVADO com Compromisso
      const nec = new Necessidade(dadosValidos);
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.AUDITOR_NECESSIDADE,
        TipoResultadoProcesso.QUALIFICAVEL
      );
      nec.avancarParaQualificacao(AtorCompetenteNecessidade.ESPECIALISTA_FORMACAO);
      nec.registrarResultadoProcesso(
        AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO,
        TipoResultadoProcesso.ASSUMIR_COMPROMISSO
      );
      nec.submeterParaDecisao(AtorCompetenteNecessidade.ESPECIALISTA_QUALIFICACAO);
      nec.registrarDecisaoOwner(DecisaoMaterialOwner.APROVADO, "mhj", "Aprovado em teste");
      ServicoCompromissoNecessidade.compor(nec);

      // Salva no banco PostgreSQL simulado
      await repositorioPostgres.salvar(nec);

      // Enfileira job assíncrono de bootstrap do projeto
      await filaMemoria.enfileirar("BOOTSTRAP_PROJETO_M002", { necessidadeId: nec.id });

      const worker = new WorkerSegundoPlano(
        filaMemoria,
        repositorioPostgres,
        portaProjeto,
        portaContexto
      );

      // Executa o ciclo de processamento
      const processado = await worker.executarCicloUnico();
      expect(processado).toBe(true);

      // Verifica que a necessidade foi atualizada no banco para EM_PROJETO
      const necAtualizada = await repositorioPostgres.obterPorId(nec.id);
      expect(necAtualizada?.status).toBe(StatusNecessidade.EM_PROJETO);

      // Verifica rastreabilidade gravada no M-004
      const eventos = await portaContexto.obterHistoricoContexto(nec.id);
      expect(eventos.length).toBe(1);
      expect(eventos[0]?.tipoEvento).toBe("BOOTSTRAP_PROJETO_CONCLUIDO");
      expect(eventos[0]?.dados.projetoId).toBe(`proj-${nec.id}`);
    });
  });
});
