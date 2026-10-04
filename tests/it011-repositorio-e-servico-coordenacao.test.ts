import { describe, it, expect, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import type pg from "pg";
import {
  GerenciadorConexao,
  ExecutorMigracoes,
  RepositorioProjetoPostgres,
  RepositorioCoordenacaoPostgres,
  RepositorioCoordenacaoMemoria,
  ServicoAplicacaoCoordenacao,
  TrabalhoCoordenado,
  CondicaoOperacionalTrabalho,
  InvarianteVioladaErro,
  RecursoNaoEncontradoErro,
  WorkerSegundoPlano,
  FilaTarefasMemoria,
  AdaptadorIntegracaoProjeto,
  AdaptadorIntegracaoContexto,
  ServicoAplicacaoProjeto,
  RepositorioNecessidadeMemoria,
  RepositorioNecessidadePostgres,
  Necessidade,
  TipoNecessidade,
  Projeto,
  StatusProjeto,
} from "../src/index.js";

describe("IT-011 — Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background", () => {
  let dbMem: ReturnType<typeof newDb>;
  let pgPool: pg.Pool;
  let conexao: GerenciadorConexao;
  let repoProjeto: RepositorioProjetoPostgres;
  let repoCoordenacaoPostgres: RepositorioCoordenacaoPostgres;

  const projetoIdPadrao = "proj-coordenacao-001";

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
    repoCoordenacaoPostgres = new RepositorioCoordenacaoPostgres(conexao);
    const repoNec = new RepositorioNecessidadePostgres(conexao);

    // Pré-requisito 1: necessidade cadastrada no banco relacional para satisfazer a chave estrangeira fk_projetos_necessidade
    const nec = new Necessidade({
      id: "nec-001",
      codigo: "N-001",
      titulo: "Conduzir necessidades até software",
      tipo: TipoNecessidade.NOVO_PRODUTO,
      problemaOuOportunidade: "Coordenação manual excessiva",
      quemEAfetado: "Equipes de engenharia",
      resultadoPretendido: "Condução autônoma",
      escopoInicial: "Escopo inicial",
      foraDeEscopo: "Fora de escopo",
      criterioDeAtendimento: "Critério de atendimento",
      porQueIssoImporta: "Importa muito",
      restricoesOuDependencias: "Nenhuma",
      origem: "Origem teste",
    });
    await repoNec.salvar(nec);

    // Pré-requisito 2: projeto cadastrado no banco relacional para satisfazer a chave estrangeira fk_trabalhos_projeto
    const projeto = new Projeto({
      id: projetoIdPadrao,
      codigo: "P-001",
      necessidadeId: "nec-001",
      titulo: "Jornada Autônoma do NAAMIVE",
      status: StatusProjeto.FORMADO,
    });
    await repoProjeto.salvar(projeto);
  });

  describe("Critério 1: Repositório Transacional PostgreSQL de Coordenação", () => {
    it("deve salvar e hidratar um TrabalhoCoordenado com fidelidade atômica no PostgreSQL", async () => {
      const trabalho = new TrabalhoCoordenado({
        id: "tc-001",
        codigo: "TC-001",
        projetoId: projetoIdPadrao,
        titulo: "Delimitação de Módulos",
        objetivo: "Estruturar o mapa canônico de módulos",
        competenciaRequerida: "Arquitetura",
        atorRequerido: "Especialista em Delimitação de Módulos",
        skillRequerida: ".agents/skills/modulo/delimitacao-de-modulos/SKILL.md",
        executorDesignado: "agente-arquiteto",
        criterioTermino: "Mapa de módulos salvo",
        dependencias: [],
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      await repoCoordenacaoPostgres.salvar(trabalho);

      const recuperado = await repoCoordenacaoPostgres.obterPorId("tc-001");
      expect(recuperado).not.toBeNull();
      expect(recuperado?.id).toBe("tc-001");
      expect(recuperado?.codigo).toBe("TC-001");
      expect(recuperado?.titulo).toBe("Delimitação de Módulos");
      expect(recuperado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
      expect(recuperado?.competenciaRequerida).toBe("Arquitetura");
      expect(recuperado?.atorRequerido).toBe("Especialista em Delimitação de Módulos");
      expect(recuperado?.skillRequerida).toBe(".agents/skills/modulo/delimitacao-de-modulos/SKILL.md");

      // Buscar por código
      const porCodigo = await repoCoordenacaoPostgres.obterPorCodigo("TC-001");
      expect(porCodigo).not.toBeNull();
      expect(porCodigo?.id).toBe("tc-001");
    });

    it("deve persistir Handoffs emitidos e seus Retornos de execução de forma relacional", async () => {
      const trabalho = new TrabalhoCoordenado({
        id: "tc-002",
        codigo: "TC-002",
        projetoId: projetoIdPadrao,
        titulo: "Formação da Entrega de Valor",
        objetivo: "Especificar EV-003",
        competenciaRequerida: "Engenharia de Requisitos",
        atorRequerido: "Especialista em Formação da Entrega de Valor",
        skillRequerida: ".agents/skills/entrega-de-valor/formacao-da-entrega-de-valor/SKILL.md",
        criterioTermino: "Documento de especificação concluído",
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      const token = "token-teste-123";
      trabalho.despacharHandoff(
        token,
        {
          projeto: "P-001",
          necessidade: "N-001",
          modulo: "M-003",
          entregaDeValor: "EV-003",
        },
        "agente-especialista"
      );

      // Salva trabalho com handoff despachado
      await repoCoordenacaoPostgres.salvar(trabalho);

      const buscadoPorToken = await repoCoordenacaoPostgres.obterHandoffPorToken(token);
      expect(buscadoPorToken).not.toBeNull();
      expect(buscadoPorToken?.handoff.tokenCorrelacao).toBe(token);
      expect(buscadoPorToken?.handoff.atorDestinatario).toBe("Especialista em Formação da Entrega de Valor");
      expect(buscadoPorToken?.trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);

      // Registrar retorno no trabalho e persistir
      trabalho.registrarRetorno(token, true, "Especificação da EV-003 concluída com sucesso.");
      await repoCoordenacaoPostgres.salvar(trabalho);

      const atualizadoComRetorno = await repoCoordenacaoPostgres.obterPorId("tc-002");
      expect(atualizadoComRetorno?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
      expect(atualizadoComRetorno?.handoffs.length).toBe(1);
      expect(atualizadoComRetorno?.handoffs[0]?.retorno).not.toBeNull();
      expect(atualizadoComRetorno?.handoffs[0]?.retorno?.sucesso).toBe(true);
      expect(atualizadoComRetorno?.handoffs[0]?.retorno?.resultadoObservavel).toBe(
        "Especificação da EV-003 concluída com sucesso."
      );
    });

    it("deve listar trabalhos por projeto e por condição operacional", async () => {
      const t1 = new TrabalhoCoordenado({
        id: "tc-list-1",
        codigo: "TC-L1",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho 1",
        objetivo: "Obj 1",
        competenciaRequerida: "Comp 1",
        atorRequerido: "Owner",
        criterioTermino: "Crit 1",
        condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
      });

      const t2 = new TrabalhoCoordenado({
        id: "tc-list-2",
        codigo: "TC-L2",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho 2",
        objetivo: "Obj 2",
        competenciaRequerida: "Comp 2",
        atorRequerido: "Owner",
        criterioTermino: "Crit 2",
        condicaoOperacional: CondicaoOperacionalTrabalho.PREPARADO,
      });

      await repoCoordenacaoPostgres.salvar(t1);
      await repoCoordenacaoPostgres.salvar(t2);

      const todosProjeto = await repoCoordenacaoPostgres.listarPorProjetoId(projetoIdPadrao);
      expect(todosProjeto.length).toBeGreaterThanOrEqual(2);

      const preparados = await repoCoordenacaoPostgres.listarPorCondicao(CondicaoOperacionalTrabalho.PREPARADO);
      expect(preparados.some((t) => t.codigo === "TC-L2")).toBe(true);
    });
  });

  describe("Critério 2: Casos de Uso no ServicoAplicacaoCoordenacao", () => {
    let servico: ServicoAplicacaoCoordenacao;
    let fila: FilaTarefasMemoria;

    beforeEach(() => {
      fila = new FilaTarefasMemoria();
      servico = new ServicoAplicacaoCoordenacao(repoCoordenacaoPostgres, repoProjeto, fila);
    });

    it("deve cadastrar trabalhos e validar integridade e unicidade", async () => {
      const trab = await servico.cadastrarTrabalho({
        codigo: "TC-CAD-1",
        projetoId: projetoIdPadrao,
        titulo: "Planejamento da Realização",
        objetivo: "Elaborar DAG de itens de trabalho",
        competenciaRequerida: "Planejamento",
        atorRequerido: "Especialista em Planejamento da Realização",
        skillRequerida: ".agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md",
        criterioTermino: "Plano de realização registrado",
      });

      expect(trab.id).toBeDefined();
      expect(trab.codigo).toBe("TC-CAD-1");
      expect(trab.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.POSSIVEL);

      // Rejeitar duplicidade de código
      await expect(
        servico.cadastrarTrabalho({
          codigo: "TC-CAD-1",
          projetoId: projetoIdPadrao,
          titulo: "Duplicado",
          objetivo: "Obj",
          competenciaRequerida: "Comp",
          atorRequerido: "Owner",
          criterioTermino: "Crit",
        })
      ).rejects.toThrow(InvarianteVioladaErro);
    });

    it("deve avaliar elegibilidade e promover trabalhos elegíveis de POSSIVEL para PREPARADO", async () => {
      // Cadastra trabalho sem dependências e com especialização completa
      const t1 = await servico.cadastrarTrabalho({
        codigo: "TC-FLOW-1",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho Inicial",
        objetivo: "Passo 1",
        competenciaRequerida: "Arquitetura",
        atorRequerido: "Especialista em Delimitação de Módulos",
        skillRequerida: ".agents/skills/modulo/delimitacao-de-modulos/SKILL.md",
        criterioTermino: "Passo 1 concluído",
      });

      // Cadastra trabalho sucessor dependente de TC-FLOW-1
      await servico.cadastrarTrabalho({
        codigo: "TC-FLOW-2",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho Sucessor",
        objetivo: "Passo 2",
        competenciaRequerida: "Formação",
        atorRequerido: "Especialista em Formação do Módulo",
        skillRequerida: ".agents/skills/modulo/formacao-do-modulo/SKILL.md",
        criterioTermino: "Passo 2 concluído",
        dependencias: ["TC-FLOW-1"],
      });

      const avaliacao = await servico.avaliarElegibilidadeTrabalhos(projetoIdPadrao);
      expect(avaliacao.totalTrabalhos).toBeGreaterThanOrEqual(2);

      // TC-FLOW-1 deve ter sido promovido para PREPARADO
      const t1Atualizado = await repoCoordenacaoPostgres.obterPorId(t1.id);
      expect(t1Atualizado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Próximo avanço válido deve ser TC-FLOW-1
      const proximo = await servico.obterProximoAvancoValido(projetoIdPadrao);
      expect(proximo).not.toBeNull();
      expect(proximo?.codigo).toBe("TC-FLOW-1");
    });

    it("deve despachar o próximo avanço emitindo Handoff e transicionar para EM_EXECUCAO de forma idempotente", async () => {
      const trab = await servico.cadastrarTrabalho({
        codigo: "TC-DESP-1",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho de Despacho",
        objetivo: "Testar despacho",
        competenciaRequerida: "Especialista",
        atorRequerido: "Owner",
        criterioTermino: "Concluído",
      });

      // Avalia elegibilidade para promover a PREPARADO
      await servico.avaliarElegibilidadeTrabalhos(projetoIdPadrao);

      const handoffEmitido = await servico.despacharProximoAvanco(
        trab.id,
        {
          projeto: "P-001",
          necessidade: "N-001",
        },
        "executor-1",
        "token-despacho-unico-1"
      );

      expect(handoffEmitido.tokenCorrelacao).toBe("token-despacho-unico-1");
      expect(handoffEmitido.codigoTrabalho).toBe("TC-DESP-1");

      const trabalhoAtual = await repoCoordenacaoPostgres.obterPorId(trab.id);
      expect(trabalhoAtual?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);

      // Idempotência: despachar novamente com o mesmo trabalho em execução retorna o mesmo handoff sem erro e sem duplicar
      const handoffRepetido = await servico.despacharProximoAvanco(
        trab.id,
        {
          projeto: "P-001",
        },
        "executor-1",
        "token-despacho-unico-1"
      );

      expect(handoffRepetido.handoffId).toBe(handoffEmitido.handoffId);
      expect(handoffRepetido.tokenCorrelacao).toBe("token-despacho-unico-1");
    });

    it("deve registrar retorno de execução com sucesso, encerrar trabalho e promover sucessor automaticamente", async () => {
      // 1. Criar trabalho dependente e antecedente
      const tAntecedente = await servico.cadastrarTrabalho({
        codigo: "TC-ANT-1",
        projetoId: projetoIdPadrao,
        titulo: "Antecedente",
        objetivo: "Antecedente",
        competenciaRequerida: "Comp",
        atorRequerido: "Owner",
        criterioTermino: "Crit",
      });

      const tSucessor = await servico.cadastrarTrabalho({
        codigo: "TC-SUC-1",
        projetoId: projetoIdPadrao,
        titulo: "Sucessor",
        objetivo: "Sucessor",
        competenciaRequerida: "Comp",
        atorRequerido: "Owner",
        criterioTermino: "Crit",
        dependencias: ["TC-ANT-1"],
      });

      // Avalia elegibilidade -> Antecedente vira PREPARADO, Sucessor fica POSSIVEL
      await servico.avaliarElegibilidadeTrabalhos(projetoIdPadrao);

      // Despacha Antecedente
      await servico.despacharProximoAvanco(
        tAntecedente.id,
        { projeto: "P-001" },
        "executor-x",
        "token-ant-1"
      );

      // 2. Registrar retorno com sucesso
      const resultadoRetorno = await servico.registrarRetornoExecucao("token-ant-1", {
        sucesso: true,
        resultadoObservavel: "Antecedente executado com 100% de sucesso.",
      });

      expect(resultadoRetorno.sucesso).toBe(true);
      expect(resultadoRetorno.condicaoOperacionalResultante).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
      expect(resultadoRetorno.trabalhosPromovidos).toContain("TC-SUC-1");

      // Verificar que o sucessor agora está PREPARADO
      const sucessorAtualizado = await repoCoordenacaoPostgres.obterPorId(tSucessor.id);
      expect(sucessorAtualizado?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Idempotência: registrar o mesmo retorno novamente não lança erro nem duplica
      const retornoDuplicado = await servico.registrarRetornoExecucao("token-ant-1", {
        sucesso: true,
        resultadoObservavel: "Ignorado",
      });
      expect(retornoDuplicado.condicaoOperacionalResultante).toBe(CondicaoOperacionalTrabalho.ENCERRADO);
    });

    it("deve lidar com falha de execução ou pendência de decisão humana do Owner", async () => {
      const trab = await servico.cadastrarTrabalho({
        codigo: "TC-FAIL-1",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho com Dilema",
        objetivo: "Executar",
        competenciaRequerida: "Comp",
        atorRequerido: "Owner",
        criterioTermino: "Crit",
      });

      await servico.avaliarElegibilidadeTrabalhos(projetoIdPadrao);
      await servico.despacharProximoAvanco(trab.id, { projeto: "P-001" }, "agente", "token-fail-1");

      // Retorno reportando pendência de Decisão Humana do Owner
      const resultado = await servico.registrarRetornoExecucao("token-fail-1", {
        sucesso: false,
        resultadoObservavel: "Impossível continuar sem confirmação de investimento.",
        pendenciasOuBloqueios: "Aguardando Decisão Humana do Owner sobre alocação de infraestrutura.",
      });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.condicaoOperacionalResultante).toBe(
        CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA
      );

      const trabAtual = await repoCoordenacaoPostgres.obterPorId(trab.id);
      expect(trabAtual?.condicaoOperacional).toBe(
        CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA
      );
      expect(trabAtual?.motivoBloqueio).toContain("Aguardando Decisão Humana");
    });
  });

  describe("Critério 3: Integração com WorkerSegundoPlano e Fila de Tarefas", () => {
    it("deve processar tarefa REAVALIAR_COORDENACAO no loop do worker sem impactar outras tarefas", async () => {
      const fila = new FilaTarefasMemoria();
      const repoNecMem = new RepositorioNecessidadeMemoria();
      const servicoProj = new ServicoAplicacaoProjeto(repoProjeto, repoNecMem);
      const portaProj = new AdaptadorIntegracaoProjeto(servicoProj);
      const portaCtx = new AdaptadorIntegracaoContexto();
      const servicoCoord = new ServicoAplicacaoCoordenacao(repoCoordenacaoPostgres, repoProjeto, fila);

      const worker = new WorkerSegundoPlano(
        fila,
        repoNecMem,
        portaProj,
        portaCtx,
        { intervaloPollingMs: 50 },
        servicoCoord
      );

      // Cadastrar trabalho que precisa ser promovido pelo worker
      await servicoCoord.cadastrarTrabalho({
        codigo: "TC-WORKER-1",
        projetoId: projetoIdPadrao,
        titulo: "Trabalho via Worker",
        objetivo: "Reavaliação contínua",
        competenciaRequerida: "Arquitetura",
        atorRequerido: "Owner",
        criterioTermino: "Critério atendido",
      });

      // Cadastrar uma tarefa genérica de contexto na fila
      await fila.enfileirar("RECONCILIACAO_CONTEXTO", {
        idOrigem: "teste",
        tipoEvento: "PING",
        dados: { ok: true },
      });

      // Executar ciclo único do worker para processar o cadastro/reavaliação
      const processou1 = await worker.executarCicloUnico();
      expect(processou1).toBe(true);

      const processou2 = await worker.executarCicloUnico();
      expect(processou2).toBe(true);

      expect(worker.totalProcessado).toBe(2);

      // O trabalho TC-WORKER-1 deve ter sido avaliado e promovido a PREPARADO
      const trab = await repoCoordenacaoPostgres.obterPorCodigo("TC-WORKER-1");
      expect(trab?.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
    });
  });
});
