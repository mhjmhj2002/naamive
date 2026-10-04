import { describe, it, expect } from "vitest";
import {
  Projeto,
  StatusProjeto,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  DecisaoMaterialOwnerProjeto,
  AtorCompetenteProjeto,
  TransicaoInvalidaErro,
  AutoridadeInvalidaErro,
  InvarianteVioladaErro,
  AutenticacaoRequeridaErro,
  DadosCriacaoProjeto,
} from "../src/index.js";

const dadosValidosProjeto: DadosCriacaoProjeto = {
  id: "proj-001",
  codigo: "P-001",
  necessidadeId: "nec-001",
  titulo: "Jornada Autônoma do NAAMIVE",
};

describe("IT-006 — Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação", () => {
  describe("Critério 1: Entidade de Domínio e Invariantes", () => {
    it("deve criar um Projeto no status EM_FORMACAO com histórico de bootstrap inicial", () => {
      const proj = new Projeto(dadosValidosProjeto);

      expect(proj.id).toBe("proj-001");
      expect(proj.codigo).toBe("P-001");
      expect(proj.necessidadeId).toBe("nec-001");
      expect(proj.titulo).toBe("Jornada Autônoma do NAAMIVE");
      expect(proj.status).toBe(StatusProjeto.EM_FORMACAO);
      expect(proj.historico.length).toBe(1);
      expect(proj.historico[0]?.atividade).toBe("Bootstrap e criação do Projeto");
      expect(proj.historico[0]?.statusNovo).toBe(StatusProjeto.EM_FORMACAO);
      expect(proj.etapas.length).toBe(0);
      expect(proj.auditorias.length).toBe(0);
      expect(proj.decisoes.length).toBe(0);
      expect(proj.direcao).toBeNull();
    });

    it("deve impedir criação de Projeto com dados inválidos ou ausência de vínculo 1:1", () => {
      expect(() => new Projeto({ ...dadosValidosProjeto, id: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new Projeto({ ...dadosValidosProjeto, codigo: "   " })).toThrow(InvarianteVioladaErro);
      expect(() => new Projeto({ ...dadosValidosProjeto, necessidadeId: "" })).toThrow(InvarianteVioladaErro);
      expect(() => new Projeto({ ...dadosValidosProjeto, titulo: "" })).toThrow(InvarianteVioladaErro);
    });

    it("deve permitir alteração de título pelo Owner com autenticação sem alterar id ou necessidadeId", () => {
      const proj = new Projeto(dadosValidosProjeto);

      proj.atualizarTitulo("Novo Nome da Jornada", "mhj");
      expect(proj.titulo).toBe("Novo Nome da Jornada");
      expect(proj.id).toBe("proj-001");
      expect(proj.necessidadeId).toBe("nec-001");
      expect(proj.codigo).toBe("P-001");

      const hist = proj.historico[proj.historico.length - 1];
      expect(hist?.atividade).toBe("Alteração do título do Projeto");
      expect(hist?.atorCompetente).toBe(AtorCompetenteProjeto.OWNER);

      // Tentar alterar sem autenticação
      expect(() => proj.atualizarTitulo("Outro Nome", "")).toThrow(AutenticacaoRequeridaErro);
      expect(() => proj.atualizarTitulo("", "mhj")).toThrow(InvarianteVioladaErro);
    });
  });

  describe("Critério 2: Máquina de Estados Conforme Norma e Etapas de Formação", () => {
    it("deve permitir que o Especialista em Formação registre as etapas sequenciais de formação", () => {
      const proj = new Projeto(dadosValidosProjeto);

      // Etapa 1: ENQUADRAMENTO
      const etapa1 = proj.registrarEtapaFormacao(
        AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
        EtapaFormacaoProjeto.ENQUADRAMENTO,
        {
          compromissoRecebido: "Atender necessidade de governança autônoma N-001",
          fronteiraInicial: "Foco na jornada utilizável",
        }
      );
      expect(etapa1.etapa).toBe(EtapaFormacaoProjeto.ENQUADRAMENTO);
      expect(proj.etapas.length).toBe(1);

      // Etapa 2: DESCOBERTA
      const etapa2 = proj.registrarEtapaFormacao(
        AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
        EtapaFormacaoProjeto.DESCOBERTA,
        {
          contexto: "Repositório com TypeScript e migrações PostgreSQL",
          riscos: ["Tratar suposições técnicas como fatos"],
        }
      );
      expect(etapa2.etapa).toBe(EtapaFormacaoProjeto.DESCOBERTA);
      expect(proj.etapas.length).toBe(2);

      // Etapa 3: DIREÇÃO DA SOLUÇÃO
      const etapa3 = proj.registrarEtapaFormacao(
        AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
        EtapaFormacaoProjeto.DIRECAO_DA_SOLUCAO,
        {
          direcaoProposta: "Fluxo centrado em entidades, transições explícitas e auditoria independente",
        }
      );
      expect(etapa3.etapa).toBe(EtapaFormacaoProjeto.DIRECAO_DA_SOLUCAO);
      expect(proj.etapas.length).toBe(3);

      // O status continua EM_FORMACAO durante as etapas
      expect(proj.status).toBe(StatusProjeto.EM_FORMACAO);
    });

    it("deve impedir registro de etapa por ator não competente ou com conteúdo vazio", () => {
      const proj = new Projeto(dadosValidosProjeto);

      expect(() =>
        proj.registrarEtapaFormacao(
          "Ator Qualquer",
          EtapaFormacaoProjeto.ENQUADRAMENTO,
          { info: "teste" }
        )
      ).toThrow(AutoridadeInvalidaErro);

      expect(() =>
        proj.registrarEtapaFormacao(
          AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
          EtapaFormacaoProjeto.ENQUADRAMENTO,
          {}
        )
      ).toThrow(InvarianteVioladaErro);
    });

    it("deve permitir que o Auditor registre FORMACAO_INSUFICIENTE mantendo status EM_FORMACAO", () => {
      const proj = new Projeto(dadosValidosProjeto);

      const auditoria = proj.registrarAuditoria(
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        TipoResultadoProcessoProjeto.FORMACAO_INSUFICIENTE,
        "Faltou clareza na etapa de Descoberta sobre os riscos operacionais."
      );

      expect(auditoria.resultado).toBe(TipoResultadoProcessoProjeto.FORMACAO_INSUFICIENTE);
      expect(proj.status).toBe(StatusProjeto.EM_FORMACAO);
      expect(proj.auditorias.length).toBe(1);
    });

    it("deve rejeitar auditoria por ator não competente ou com parecer vazio", () => {
      const proj = new Projeto(dadosValidosProjeto);

      expect(() =>
        proj.registrarAuditoria(
          AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
          TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
          "Parecer"
        )
      ).toThrow(AutoridadeInvalidaErro);

      expect(() =>
        proj.registrarAuditoria(
          AtorCompetenteProjeto.AUDITOR_PROJETO,
          TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
          ""
        )
      ).toThrow(InvarianteVioladaErro);
    });
  });

  describe("Critério 3: Consolidação da Direção do Projeto e Transição para FORMADO", () => {
    it("deve transicionar para FORMADO e consolidar a Direção do Projeto apenas após FORMACAO_SUFICIENTE", () => {
      const proj = new Projeto(dadosValidosProjeto);

      // Tentar concluir sem auditoria favorável prévia deve falhar
      expect(() =>
        proj.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
          compromissoOrigem: "Compromisso N-001",
          objetivoProjeto: "Objetivo",
          fronteiras: "Fronteiras",
          contextoRelevante: "Contexto",
        })
      ).toThrow(InvarianteVioladaErro);

      // Auditor emite FORMACAO_SUFICIENTE
      proj.registrarAuditoria(
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
        "Formação robusta, consistente e sem lacunas impeditivas."
      );

      // Concluir formação
      const direcao = proj.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
        compromissoOrigem: "Compromisso da Necessidade N-001",
        objetivoProjeto: "Transformar compromisso em software verificável",
        fronteiras: "Camada de Projeto sem inventar entidades de Módulo",
        contextoRelevante: "Node.js, PostgreSQL e DDD",
      });

      expect(proj.status).toBe(StatusProjeto.FORMADO);
      expect(proj.direcao).not.toBeNull();
      expect(proj.direcao?.objetivoProjeto).toBe("Transformar compromisso em software verificável");
      expect(direcao.compromissoOrigem).toBe("Compromisso da Necessidade N-001");

      // Tentar registrar nova etapa com o projeto em FORMADO deve falhar
      expect(() =>
        proj.registrarEtapaFormacao(
          AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
          EtapaFormacaoProjeto.ENQUADRAMENTO,
          { info: "Nova tentativa inválida" }
        )
      ).toThrow(TransicaoInvalidaErro);
    });

    it("deve falhar a conclusão da formação se faltar algum campo obrigatório da Direção", () => {
      const proj = new Projeto(dadosValidosProjeto);

      proj.registrarAuditoria(
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
        "Aprovado."
      );

      expect(() =>
        proj.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
          compromissoOrigem: "",
          objetivoProjeto: "Objetivo",
          fronteiras: "Fronteiras",
          contextoRelevante: "Contexto",
        })
      ).toThrow(InvarianteVioladaErro);
    });
  });

  describe("Critério 4: Cancelamento Exclusivo pelo Owner e Reconstituição", () => {
    it("deve permitir cancelamento excepcional exclusivamente pelo Owner com justificativa", () => {
      const proj = new Projeto(dadosValidosProjeto);

      const decisao = proj.cancelarPorDecisaoOwner(
        "mhj",
        "Mudança estratégica do portfólio corporativo."
      );

      expect(proj.status).toBe(StatusProjeto.CANCELADO);
      expect(decisao.decisao).toBe(DecisaoMaterialOwnerProjeto.CANCELAMENTO_APROVADO);
      expect(decisao.usuarioAutenticado).toBe("mhj");
      expect(proj.decisoes.length).toBe(1);

      // Não permite nova transição após status terminal CANCELADO
      expect(() =>
        proj.cancelarPorDecisaoOwner("mhj", "Outra tentativa")
      ).toThrow(TransicaoInvalidaErro);
    });

    it("deve impedir cancelamento sem usuário autenticado ou sem justificativa", () => {
      const proj = new Projeto(dadosValidosProjeto);

      expect(() => proj.cancelarPorDecisaoOwner("", "Justificativa")).toThrow(AutenticacaoRequeridaErro);
      expect(() => proj.cancelarPorDecisaoOwner("mhj", "   ")).toThrow(InvarianteVioladaErro);
    });

    it("deve reconstituir a entidade Projeto com todos os seus agregados e histórico", () => {
      const projOriginal = new Projeto(dadosValidosProjeto);
      projOriginal.registrarEtapaFormacao(
        AtorCompetenteProjeto.ESPECIALISTA_FORMACAO_PROJETO,
        EtapaFormacaoProjeto.ENQUADRAMENTO,
        { doc: "Enquadramento teste" }
      );
      projOriginal.registrarAuditoria(
        AtorCompetenteProjeto.AUDITOR_PROJETO,
        TipoResultadoProcessoProjeto.FORMACAO_SUFICIENTE,
        "Aprovado."
      );
      projOriginal.concluirFormacao(AtorCompetenteProjeto.AUDITOR_PROJETO, {
        compromissoOrigem: "Compromisso N-001",
        objetivoProjeto: "Objetivo",
        fronteiras: "Fronteiras",
        contextoRelevante: "Contexto",
      });

      const reconstituted = Projeto.reconstituir(
        {
          id: projOriginal.id,
          codigo: projOriginal.codigo,
          necessidadeId: projOriginal.necessidadeId,
          titulo: projOriginal.titulo,
        },
        projOriginal.status,
        projOriginal.criadoEm,
        projOriginal.atualizadoEm,
        [...projOriginal.etapas],
        [...projOriginal.auditorias],
        [...projOriginal.decisoes],
        [...projOriginal.historico],
        projOriginal.direcao
      );

      expect(reconstituted.id).toBe(projOriginal.id);
      expect(reconstituted.status).toBe(StatusProjeto.FORMADO);
      expect(reconstituted.etapas.length).toBe(1);
      expect(reconstituted.auditorias.length).toBe(1);
      expect(reconstituted.direcao?.objetivoProjeto).toBe("Objetivo");
    });
  });
});
