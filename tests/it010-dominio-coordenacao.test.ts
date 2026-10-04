import { describe, it, expect } from "vitest";
import {
  TrabalhoCoordenado,
  HandoffCoordenacao,
  RetornoCoordenacao,
  CondicaoOperacionalTrabalho,
  MotorCoordenacaoTrabalho,
  InvarianteVioladaErro,
  TransicaoInvalidaErro,
  DadosCriacaoTrabalhoCoordenado,
} from "../src/index.js";

const dadosValidosTrabalho: DadosCriacaoTrabalhoCoordenado = {
  id: "trab-001",
  codigo: "TC-001",
  projetoId: "proj-001",
  titulo: "Delimitação de Módulos",
  objetivo: "Estruturar o mapa de módulos do projeto",
  competenciaRequerida: "Arquitetura de Software",
  atorRequerido: "Especialista em Delimitação de Módulos",
  skillRequerida: ".agents/skills/modulo/delimitacao-de-modulos/SKILL.md",
  executorDesignado: "agente-arquiteto",
  criterioTermino: "Mapa de módulos canônico registrado com sucesso",
  dependencias: [],
};

describe("IT-010 — Núcleo de Domínio de Coordenação, Motor de Elegibilidade e Invariante de Especialização", () => {
  describe("Critério 1: Entidades Puras e Imutabilidade", () => {
    it("deve criar um TrabalhoCoordenado com condição operacional inicial padrão POSSIVEL e histórico registrado", () => {
      const trabalho = new TrabalhoCoordenado(dadosValidosTrabalho);

      expect(trabalho.id).toBe("trab-001");
      expect(trabalho.codigo).toBe("TC-001");
      expect(trabalho.projetoId).toBe("proj-001");
      expect(trabalho.titulo).toBe("Delimitação de Módulos");
      expect(trabalho.objetivo).toBe("Estruturar o mapa de módulos do projeto");
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.POSSIVEL);
      expect(trabalho.competenciaRequerida).toBe("Arquitetura de Software");
      expect(trabalho.atorRequerido).toBe("Especialista em Delimitação de Módulos");
      expect(trabalho.skillRequerida).toBe(".agents/skills/modulo/delimitacao-de-modulos/SKILL.md");
      expect(trabalho.executorDesignado).toBe("agente-arquiteto");
      expect(trabalho.criterioTermino).toBe("Mapa de módulos canônico registrado com sucesso");
      expect(trabalho.dependencias.length).toBe(0);
      expect(trabalho.handoffs.length).toBe(0);
      expect(trabalho.historico.length).toBe(1);
      expect(trabalho.historico[0]?.atividade).toBe("Criação do Trabalho Coordenado");
      expect(trabalho.historico[0]?.condicaoNova).toBe(CondicaoOperacionalTrabalho.POSSIVEL);
    });

    it("deve rejeitar criação de TrabalhoCoordenado com atributos obrigatórios ausentes", () => {
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, id: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, codigo: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, projetoId: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, titulo: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, objetivo: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, competenciaRequerida: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, atorRequerido: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new TrabalhoCoordenado({ ...dadosValidosTrabalho, criterioTermino: "" })).toThrow(InvarianteVioladaErro);
    });

    it("deve criar HandoffCoordenacao e RetornoCoordenacao com integridade e imutabilidade de retornos", () => {
      const trabalho = new TrabalhoCoordenado(dadosValidosTrabalho);
      trabalho.marcarComoPreparado();

      const handoff = trabalho.despacharHandoff(
        "TOK-CORR-001",
        {
          projeto: "P-001",
          necessidade: "N-001",
          documentosNormativos: ["AGENTS.md", "README.md"],
        },
        "executor-1"
      );

      expect(handoff.tokenCorrelacao).toBe("TOK-CORR-001");
      expect(handoff.trabalhoId).toBe(trabalho.id);
      expect(handoff.atorDestinatario).toBe("Especialista em Delimitação de Módulos");
      expect(handoff.conteudoHandoff.referenciasContexto.projeto).toBe("P-001");
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);

      // Registrar retorno com sucesso
      const retorno = trabalho.registrarRetorno(
        "TOK-CORR-001",
        true,
        "Mapa de módulos entregue com sucesso e validado"
      );

      expect(retorno.sucesso).toBe(true);
      expect(retorno.handoffId).toBe(handoff.id);
      expect(handoff.retorno).toBe(retorno);
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);

      // Tentar anexar um segundo retorno ao mesmo handoff deve falhar por imutabilidade
      const retornoDuplicado = new RetornoCoordenacao({
        id: "ret-dup",
        handoffId: handoff.id,
        sucesso: true,
        resultadoObservavel: "Tentativa concorrente",
      });
      expect(() => handoff.anexarRetorno(retornoDuplicado)).toThrow(InvarianteVioladaErro);
    });
  });

  describe("Critério 2: Invariante de Especialização Garantido", () => {
    it("deve impedir que trabalho com Ator agêntico transicione para PREPARADO sem Skill correspondente", () => {
      const trabalhoSemSkill = new TrabalhoCoordenado({
        ...dadosValidosTrabalho,
        atorRequerido: "Especialista em Delimitação de Módulos",
        skillRequerida: null,
      });

      expect(() => trabalhoSemSkill.marcarComoPreparado()).toThrow(InvarianteVioladaErro);
      expect(() =>
        trabalhoSemSkill.despacharHandoff("TOK-1", { projeto: "P-001" })
      ).toThrow(TransicaoInvalidaErro); // Não está preparado
    });

    it("deve permitir que trabalho com Ator 'Owner' (humano) transicione para PREPARADO sem Skill", () => {
      const trabalhoOwner = new TrabalhoCoordenado({
        ...dadosValidosTrabalho,
        codigo: "TC-OWNER",
        atorRequerido: "Owner",
        skillRequerida: null,
      });

      trabalhoOwner.marcarComoPreparado();
      expect(trabalhoOwner.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      const handoff = trabalhoOwner.despacharHandoff("TOK-OWNER-1", { projeto: "P-001" });
      expect(handoff.atorDestinatario).toBe("Owner");
      expect(handoff.skillDestinataria).toBeNull();
      expect(trabalhoOwner.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);
    });

    it("deve permitir atualizar especialização técnica antes do encerramento", () => {
      const trabalho = new TrabalhoCoordenado({
        ...dadosValidosTrabalho,
        atorRequerido: "Especialista Temporário",
        skillRequerida: null,
      });

      expect(() => trabalho.marcarComoPreparado()).toThrow(InvarianteVioladaErro);

      trabalho.atribuirEspecializacao(
        "Engenheiro de Software",
        ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        "dev-1"
      );

      trabalho.marcarComoPreparado();
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
    });
  });

  describe("Critério 3: Máquina de Estados Operacionais e Rejeição de Saltos Inválidos", () => {
    it("deve seguir fluxo válido: POSSIVEL -> PREPARADO -> EM_EXECUCAO -> ENCERRADO", () => {
      const trabalho = new TrabalhoCoordenado(dadosValidosTrabalho);
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.POSSIVEL);

      trabalho.marcarComoPreparado();
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      trabalho.despacharHandoff("TOK-FLUXO", { projeto: "P-001" });
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);

      trabalho.registrarRetorno("TOK-FLUXO", true, "Concluído com sucesso");
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);

      // Rejeitar operações após ENCERRADO
      expect(() => trabalho.bloquear("tentativa")).toThrow(TransicaoInvalidaErro);
      expect(() => trabalho.aguardarDecisaoHumana("dilema")).toThrow(TransicaoInvalidaErro);
      expect(() => trabalho.marcarComoPreparado()).toThrow(TransicaoInvalidaErro);
      expect(() => trabalho.atribuirEspecializacao("Outro Ator")).toThrow(TransicaoInvalidaErro);
    });

    it("deve transicionar para BLOQUEADO ou AGUARDANDO_DECISAO_HUMANA a partir de falha no retorno", () => {
      // Caso 1: Falha comum transiciona para BLOQUEADO
      const trabalho1 = new TrabalhoCoordenado(dadosValidosTrabalho);
      trabalho1.marcarComoPreparado();
      trabalho1.despacharHandoff("TOK-FALHA-1", { projeto: "P-001" });
      trabalho1.registrarRetorno("TOK-FALHA-1", false, "Erro técnico de compilação", "Falha nos testes");
      expect(trabalho1.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.BLOQUEADO);
      expect(trabalho1.motivoBloqueio).toBe("Falha nos testes");

      // Caso 2: Falha envolvendo Owner transiciona para AGUARDANDO_DECISAO_HUMANA
      const trabalho2 = new TrabalhoCoordenado({ ...dadosValidosTrabalho, codigo: "TC-002" });
      trabalho2.marcarComoPreparado();
      trabalho2.despacharHandoff("TOK-FALHA-2", { projeto: "P-001" });
      trabalho2.registrarRetorno("TOK-FALHA-2", false, "Impasse estratégico", "Necessária decisão humana do Owner");
      expect(trabalho2.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);

      // Uma vez saneado o bloqueio, pode voltar a PREPARADO
      trabalho2.marcarComoPreparado();
      expect(trabalho2.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);
      expect(trabalho2.motivoBloqueio).toBeNull();
    });

    it("deve permitir bloqueio explícito e suspensão para decisão humana", () => {
      const trabalho = new TrabalhoCoordenado(dadosValidosTrabalho);
      trabalho.bloquear("Falta de infraestrutura externa");
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.BLOQUEADO);
      expect(trabalho.motivoBloqueio).toBe("Falta de infraestrutura externa");

      trabalho.aguardarDecisaoHumana("Owner precisa aprovar custo de servidor");
      expect(trabalho.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA);
      expect(trabalho.motivoBloqueio).toBe("Owner precisa aprovar custo de servidor");
    });
  });

  describe("Critério 4: Motor de Elegibilidade e Cálculo do Próximo Avanço Válido", () => {
    it("deve identificar dependências e calcular o próximo avanço determinístico no grafo de trabalhos", () => {
      const trab1 = new TrabalhoCoordenado({
        id: "t1",
        codigo: "TC-001",
        projetoId: "proj-1",
        titulo: "Trabalho Base",
        objetivo: "Fazer fundação",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        criterioTermino: "Base criada",
        dependencias: [],
      });

      const trab2 = new TrabalhoCoordenado({
        id: "t2",
        codigo: "TC-002",
        projetoId: "proj-1",
        titulo: "Trabalho Intermediário",
        objetivo: "Fazer lógica",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        criterioTermino: "Lógica implementada",
        dependencias: ["TC-001"],
      });

      const trab3 = new TrabalhoCoordenado({
        id: "t3",
        codigo: "TC-003",
        projetoId: "proj-1",
        titulo: "Trabalho Final",
        objetivo: "Fazer entrega",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        criterioTermino: "Final entregue",
        dependencias: ["TC-002"],
      });

      const lista = [trab1, trab2, trab3];

      // Estado 1: Nenhum trabalho encerrado
      const eval1 = MotorCoordenacaoTrabalho.avaliarElegibilidade("proj-1", lista);
      expect(eval1.proximoAvancoValido?.codigo).toBe("TC-001");
      expect(eval1.diagnosticos[0]?.elegivel).toBe(true);
      expect(eval1.diagnosticos[1]?.elegivel).toBe(false);
      expect(eval1.diagnosticos[1]?.dependenciasPendentes).toContain("TC-001");
      expect(eval1.diagnosticos[2]?.elegivel).toBe(false);

      // Promover elegíveis
      const promovidos1 = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis("proj-1", lista);
      expect(promovidos1.length).toBe(1);
      expect(promovidos1[0]?.codigo).toBe("TC-001");
      expect(trab1.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Despachar e encerrar trab1
      trab1.despacharHandoff("TOK-T1", { projeto: "proj-1" });
      trab1.registrarRetorno("TOK-T1", true, "Base finalizada");
      expect(trab1.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.ENCERRADO);

      // Estado 2: trab1 ENCERRADO -> trab2 agora deve ser o próximo avanço
      const eval2 = MotorCoordenacaoTrabalho.avaliarElegibilidade("proj-1", lista);
      expect(eval2.proximoAvancoValido?.codigo).toBe("TC-002");
      expect(eval2.diagnosticos[1]?.elegivel).toBe(true);
      expect(eval2.diagnosticos[2]?.elegivel).toBe(false);

      // Promover elegíveis no Estado 2
      const promovidos2 = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis("proj-1", lista);
      expect(promovidos2.length).toBe(1);
      expect(promovidos2[0]?.codigo).toBe("TC-002");
      expect(trab2.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Despachar e encerrar trab2
      trab2.despacharHandoff("TOK-T2", { projeto: "proj-1" });
      trab2.registrarRetorno("TOK-T2", true, "Lógica finalizada");

      // Estado 3: trab2 ENCERRADO -> trab3 agora é o próximo avanço
      const eval3 = MotorCoordenacaoTrabalho.avaliarElegibilidade("proj-1", lista);
      expect(eval3.proximoAvancoValido?.codigo).toBe("TC-003");
      expect(eval3.diagnosticos[2]?.elegivel).toBe(true);

      const promovidos3 = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis("proj-1", lista);
      expect(promovidos3.length).toBe(1);
      expect(trab3.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.PREPARADO);

      // Despachar e encerrar trab3
      trab3.despacharHandoff("TOK-T3", { projeto: "proj-1" });
      trab3.registrarRetorno("TOK-T3", true, "Finalizado");

      // Estado 4: Todos encerrados -> proximoAvancoValido é null
      const eval4 = MotorCoordenacaoTrabalho.avaliarElegibilidade("proj-1", lista);
      expect(eval4.proximoAvancoValido).toBeNull();
      expect(eval4.trabalhosEncerrados.length).toBe(3);
    });

    it("deve isolar trabalhos bloqueados ou com pendência humana sem impedir trabalhos independentes paralelos", () => {
      const trabParalelo1 = new TrabalhoCoordenado({
        id: "tp1",
        codigo: "TC-P1",
        projetoId: "proj-2",
        titulo: "Trabalho Paralelo 1",
        objetivo: "Tarefa A",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        criterioTermino: "A concluída",
        dependencias: [],
      });

      const trabParalelo2 = new TrabalhoCoordenado({
        id: "tp2",
        codigo: "TC-P2",
        projetoId: "proj-2",
        titulo: "Trabalho Paralelo 2",
        objetivo: "Tarefa B",
        competenciaRequerida: "Engenharia",
        atorRequerido: "Engenheiro de Software",
        skillRequerida: ".agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md",
        criterioTermino: "B concluída",
        dependencias: [],
      });

      // Suspende trabParalelo1 aguardando decisão humana
      trabParalelo1.aguardarDecisaoHumana("Owner precisa aprovar arquitetura");

      const lista = [trabParalelo1, trabParalelo2];
      const resultado = MotorCoordenacaoTrabalho.avaliarElegibilidade("proj-2", lista);

      expect(resultado.trabalhosAguardandoDecisao.length).toBe(1);
      expect(resultado.trabalhosAguardandoDecisao[0]?.codigo).toBe("TC-P1");
      expect(resultado.diagnosticos[0]?.elegivel).toBe(false);

      // trabParalelo2 não depende de trabParalelo1, logo continua elegível e é o próximo avanço
      expect(resultado.diagnosticos[1]?.elegivel).toBe(true);
      expect(resultado.proximoAvancoValido?.codigo).toBe("TC-P2");
    });

    it("deve reconstituir TrabalhoCoordenado mantendo agregados, handoffs e histórico", () => {
      const trabOriginal = new TrabalhoCoordenado(dadosValidosTrabalho);
      trabOriginal.marcarComoPreparado();
      trabOriginal.despacharHandoff("TOK-REC", { projeto: "proj-001" });

      const reconstituted = TrabalhoCoordenado.reconstituir(
        {
          id: trabOriginal.id,
          codigo: trabOriginal.codigo,
          projetoId: trabOriginal.projetoId,
          titulo: trabOriginal.titulo,
          objetivo: trabOriginal.objetivo,
          competenciaRequerida: trabOriginal.competenciaRequerida,
          atorRequerido: trabOriginal.atorRequerido,
          skillRequerida: trabOriginal.skillRequerida,
          executorDesignado: trabOriginal.executorDesignado,
          criterioTermino: trabOriginal.criterioTermino,
          dependencias: [...trabOriginal.dependencias],
          motivoBloqueio: trabOriginal.motivoBloqueio,
        },
        trabOriginal.criadoEm,
        trabOriginal.atualizadoEm,
        trabOriginal.condicaoOperacional,
        [...trabOriginal.handoffs],
        [...trabOriginal.historico]
      );

      expect(reconstituted.id).toBe(trabOriginal.id);
      expect(reconstituted.codigo).toBe("TC-001");
      expect(reconstituted.condicaoOperacional).toBe(CondicaoOperacionalTrabalho.EM_EXECUCAO);
      expect(reconstituted.handoffs.length).toBe(1);
      expect(reconstituted.handoffs[0]?.tokenCorrelacao).toBe("TOK-REC");
      expect(reconstituted.historico.length).toBe(3);
    });
  });
});
