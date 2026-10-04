export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDominio";
  }
}

export class TransicaoInvalidaErro extends ErroDominio {
  constructor(statusAtual: string, acao: string, motivo: string) {
    super(
      `Transição inválida a partir do status '${statusAtual}' para a ação '${acao}': ${motivo}`
    );
    this.name = "TransicaoInvalidaErro";
  }
}

export class AutoridadeInvalidaErro extends ErroDominio {
  constructor(atorEsperado: string, atorInformado: string = "não informado") {
    super(
      `Autoridade inválida: a ação requer competência de '${atorEsperado}', mas foi informada '${atorInformado}'`
    );
    this.name = "AutoridadeInvalidaErro";
  }
}

export class InvarianteVioladaErro extends ErroDominio {
  constructor(mensagem: string) {
    super(`Invariante violada: ${mensagem}`);
    this.name = "InvarianteVioladaErro";
  }
}

export class AutenticacaoRequeridaErro extends ErroDominio {
  constructor(mensagem: string) {
    super(`Autenticação obrigatória do Owner violada: ${mensagem}`);
    this.name = "AutenticacaoRequeridaErro";
  }
}
