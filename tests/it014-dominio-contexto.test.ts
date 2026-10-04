import { describe, it, expect } from "vitest";
import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
  FinalidadeContexto,
  DiagnosticoContexto,
} from "../src/domain/tipos-contexto.js";
import { RegistroProveniencia, VinculoCausal } from "../src/domain/contexto.js";
import { MotorRecuperacaoContexto } from "../src/domain/motor-contexto.js";
import { InvarianteVioladaErro } from "../src/domain/erros.js";

describe("IT-014 — Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional", () => {
  describe("Critério 1: Entidades Puras de Domínio (RegistroProveniencia e VinculoCausal)", () => {
    it("deve criar RegistroProveniencia válido com invariantes satisfeitas", () => {
      const reg = RegistroProveniencia.criar({
        entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
        entidadeId: "ev-004-uuid",
        codigoReferencia: "EV-004",
        tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
        autorResponsavel: "Auditor da Entrega de Valor",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { resultado: "FORMACAO_SUFICIENTE" },
      });

      expect(reg.id).toBeDefined();
      expect(reg.codigoReferencia).toBe("EV-004");
      expect(reg.vigente).toBe(true);
      expect(reg.classificacaoEpistemica).toBe(ClassificacaoEpistemica.CONHECIDO);
      expect(reg.dadosContexto).toEqual({ resultado: "FORMACAO_SUFICIENTE" });
    });

    it("deve lançar InvarianteVioladaErro ao instanciar RegistroProveniencia com campos inválidos", () => {
      expect(() => {
        new RegistroProveniencia({
          id: "",
          entidadeTipo: TipoEntidadeContexto.PROJETO,
          entidadeId: "p-001",
          codigoReferencia: "P-001",
          tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
          autorResponsavel: "mhj",
          classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        });
      }).toThrowError(InvarianteVioladaErro);

      expect(() => {
        RegistroProveniencia.criar({
          entidadeTipo: "INVALIDO" as any,
          entidadeId: "p-001",
          codigoReferencia: "P-001",
          tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
          autorResponsavel: "mhj",
          classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        });
      }).toThrowError(InvarianteVioladaErro);
    });

    it("deve criar VinculoCausal direcionado válido e proibir vínculo reflexivo", () => {
      const vinculo = VinculoCausal.criar(
        "origem-1",
        "destino-2",
        TipoRelacaoCausal.ORIGINADO_DE,
        "A Entrega de Valor originou-se do Projeto"
      );

      expect(vinculo.id).toBeDefined();
      expect(vinculo.origemRegistroId).toBe("origem-1");
      expect(vinculo.destinoRegistroId).toBe("destino-2");
      expect(vinculo.tipoRelacao).toBe(TipoRelacaoCausal.ORIGINADO_DE);

      // Invariante de anti-reflexividade
      expect(() => {
        VinculoCausal.criar("mesmo-id", "mesmo-id", TipoRelacaoCausal.DEPENDE_DE);
      }).toThrowError(InvarianteVioladaErro);
    });
  });

  describe("Critério 2: Motor de Recuperação Proporcional por Finalidade Declarada", () => {
    const motor = new MotorRecuperacaoContexto();

    const regNec = RegistroProveniencia.criar({
      id: "reg-nec-1",
      entidadeTipo: TipoEntidadeContexto.NECESSIDADE,
      entidadeId: "n-001",
      codigoReferencia: "N-001",
      tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
      autorResponsavel: "mhj",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { status: "EM_PROJETO", compromissoAprovado: true },
    });

    const regProj = RegistroProveniencia.criar({
      id: "reg-proj-1",
      entidadeTipo: TipoEntidadeContexto.PROJETO,
      entidadeId: "p-001",
      codigoReferencia: "P-001",
      tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
      autorResponsavel: "Auditor do Projeto",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { direcao: "FORMACAO_SUFICIENTE" },
    });

    const regEV = RegistroProveniencia.criar({
      id: "reg-ev-1",
      entidadeTipo: TipoEntidadeContexto.ENTREGA_DE_VALOR,
      entidadeId: "ev-003",
      codigoReferencia: "EV-003",
      tipoRegistro: TipoRegistroProveniencia.RESULTADO_PROCESSO,
      autorResponsavel: "Owner mhj",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { status: "CONCLUIDA" },
    });

    const regIT = RegistroProveniencia.criar({
      id: "reg-it-1",
      entidadeTipo: TipoEntidadeContexto.ITEM_DE_TRABALHO,
      entidadeId: "it-010",
      codigoReferencia: "IT-010",
      tipoRegistro: TipoRegistroProveniencia.HANDOFF,
      autorResponsavel: "Especialista em Coordenação",
      classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      dadosContexto: { tarefa: "Execução do motor" },
    });

    const vinculos = [
      VinculoCausal.criar("reg-nec-1", "reg-proj-1", TipoRelacaoCausal.ORIGINADO_DE),
      VinculoCausal.criar("reg-proj-1", "reg-ev-1", TipoRelacaoCausal.ORIGINADO_DE),
      VinculoCausal.criar("reg-ev-1", "reg-it-1", TipoRelacaoCausal.ORIGINADO_DE),
    ];

    it("deve recuperar cadeia causal completa na ascendência até a Necessidade", () => {
      const pacote = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.EXECUTAR_ITEM,
          codigoReferencia: "IT-010",
        },
        [regNec, regProj, regEV, regIT],
        vinculos
      );

      expect(pacote.finalidadeDeclarada).toBe(FinalidadeContexto.EXECUTAR_ITEM);
      expect(pacote.alvoPrincipal?.codigo).toBe("IT-010");
      expect(pacote.cadeiaAscendencia.length).toBe(3);
      expect(pacote.diagnosticoGeral).toBe(DiagnosticoContexto.CONSISTENTE);

      // Deve conter na ascendência as ligações IT-010 -> EV-003 -> P-001 -> N-001
      const origens = pacote.cadeiaAscendencia.map((c) => c.codigoOrigem);
      expect(origens).toContain("EV-003");
      expect(origens).toContain("P-001");
      expect(origens).toContain("N-001");
    });

    it("deve filtrar proporcionalmente omitindo ruídos estranhos à finalidade DESPACHAR_TRABALHO", () => {
      const pacote = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.DESPACHAR_TRABALHO,
          codigoReferencia: "IT-010",
        },
        [regNec, regProj, regEV, regIT],
        vinculos
      );

      // DESPACHAR_TRABALHO foca em handoffs, decisões, resultados e itens/EVs
      const codigosVigentes = pacote.registrosVigentes.map((r) => r.codigoReferencia);
      expect(codigosVigentes).toContain("IT-010");
      expect(codigosVigentes).toContain("EV-003");
      expect(codigosVigentes).toContain("N-001"); // decisão humana
    });
  });

  describe("Critério 3: Isolamento de Histórico e Vigência", () => {
    const motor = new MotorRecuperacaoContexto();

    it("deve separar registros vigentes de registros históricos superados mantendo imutabilidade cronológica", () => {
      const regAntigo = RegistroProveniencia.criar({
        id: "reg-decisao-v1",
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001",
        codigoReferencia: "DEC-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { versao: 1, escolha: "opcao-A" },
        vigente: true,
      });

      // Supera historicamente a versão 1
      regAntigo.marcarComoSuperado();
      expect(regAntigo.vigente).toBe(false);

      const regNovo = RegistroProveniencia.criar({
        id: "reg-decisao-v2",
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001",
        codigoReferencia: "DEC-001",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        dadosContexto: { versao: 2, escolha: "opcao-B" },
        vigente: true,
      });

      const vinculoSubstituicao = VinculoCausal.criar(
        "reg-decisao-v2",
        "reg-decisao-v1",
        TipoRelacaoCausal.SUBSTITUI,
        "Revisão formal da decisão"
      );

      // Consulta padrão sem histórico
      const pacoteSemHistorico = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.AUDITAR_FORMACAO,
          codigoReferencia: "DEC-001",
          incluirHistoricoSuperado: false,
        },
        [regAntigo, regNovo],
        [vinculoSubstituicao]
      );

      expect(pacoteSemHistorico.registrosVigentes.length).toBe(1);
      expect(pacoteSemHistorico.registrosVigentes[0].id).toBe("reg-decisao-v2");
      expect(pacoteSemHistorico.registrosHistoricos.length).toBe(0);

      // Consulta com histórico solicitado
      const pacoteComHistorico = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.AUDITAR_FORMACAO,
          codigoReferencia: "DEC-001",
          incluirHistoricoSuperado: true,
        },
        [regAntigo, regNovo],
        [vinculoSubstituicao]
      );

      expect(pacoteComHistorico.registrosVigentes.length).toBe(1);
      expect(pacoteComHistorico.registrosHistoricos.length).toBe(1);
      expect(pacoteComHistorico.registrosHistoricos[0].id).toBe("reg-decisao-v1");
    });
  });

  describe("Critério 4: Detecção Explícita de Lacunas e Contradições", () => {
    const motor = new MotorRecuperacaoContexto();

    it("deve diagnosticar LACUNA_DETECTADA quando entidade de destino ou elo de ascendência não existir", () => {
      const reg = RegistroProveniencia.criar({
        id: "reg-1",
        entidadeTipo: TipoEntidadeContexto.ITEM_DE_TRABALHO,
        entidadeId: "it-999",
        codigoReferencia: "IT-999",
        tipoRegistro: TipoRegistroProveniencia.HANDOFF,
        autorResponsavel: "Operador",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
      });

      const vinculoQuebrado = VinculoCausal.criar(
        "origem-fantasma-inexistente",
        "reg-1",
        TipoRelacaoCausal.ORIGINADO_DE
      );

      const pacote = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.EXECUTAR_ITEM,
          codigoReferencia: "IT-999",
        },
        [reg],
        [vinculoQuebrado]
      );

      expect(pacote.diagnosticoGeral).toBe(DiagnosticoContexto.LACUNA_DETECTADA);
      expect(pacote.alertas.some((a) => a.diagnostico === DiagnosticoContexto.LACUNA_DETECTADA)).toBe(true);
    });

    it("deve diagnosticar CONTRADICAO_DETECTADA quando registro substituto e substituído permanecerem ambos vigentes", () => {
      const regAntigo = RegistroProveniencia.criar({
        id: "reg-antigo",
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001",
        codigoReferencia: "DEC-002",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        vigente: true, // Conflito: não foi desativado
      });

      const regNovo = RegistroProveniencia.criar({
        id: "reg-novo",
        entidadeTipo: TipoEntidadeContexto.PROJETO,
        entidadeId: "p-001",
        codigoReferencia: "DEC-002-NOVA",
        tipoRegistro: TipoRegistroProveniencia.DECISAO_HUMANA,
        autorResponsavel: "mhj",
        classificacaoEpistemica: ClassificacaoEpistemica.CONHECIDO,
        vigente: true,
      });

      const vinculoSubstituicao = VinculoCausal.criar(
        "reg-novo",
        "reg-antigo",
        TipoRelacaoCausal.SUBSTITUI
      );

      const pacote = motor.recuperarProporcional(
        {
          finalidade: FinalidadeContexto.AUDITAR_GOVERNANCA,
          codigoReferencia: "DEC-002-NOVA",
        },
        [regAntigo, regNovo],
        [vinculoSubstituicao]
      );

      expect(pacote.diagnosticoGeral).toBe(DiagnosticoContexto.CONTRADICAO_DETECTADA);
      expect(pacote.alertas.some((a) => a.diagnostico === DiagnosticoContexto.CONTRADICAO_DETECTADA)).toBe(true);
    });
  });
});
