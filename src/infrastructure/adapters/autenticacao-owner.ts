import { AutenticacaoRequeridaErro, AutoridadeInvalidaErro } from "../../domain/erros.js";

/**
 * Representação de uma credencial ou token de autenticação do Owner.
 */
export interface CredencialAutenticada {
  identificadorUsuario: string;
  papeis: string[];
}

/**
 * Porta de autenticação e verificação de autoridade do Owner.
 */
export interface PortaAutenticacaoOwner {
  autenticar(credencial: unknown): Promise<CredencialAutenticada>;
  verificarIdentidadeOwner(usuario: string): Promise<boolean>;
  exigirIdentidadeOwner(usuario: string): Promise<string>;
}

/**
 * Adaptador de autenticação do Owner.
 * Garante que qualquer decisão material humana exija identidade comprovada.
 */
export class AdaptadorAutenticacaoOwner implements PortaAutenticacaoOwner {
  private readonly usuariosOwnerValidos: Set<string>;

  constructor(usuariosAutorizados: string[] = ["mhj", "owner"]) {
    this.usuariosOwnerValidos = new Set(
      usuariosAutorizados.map((u) => u.trim().toLowerCase())
    );
  }

  public async autenticar(credencial: unknown): Promise<CredencialAutenticada> {
    if (!credencial || typeof credencial !== "object") {
      throw new AutenticacaoRequeridaErro(
        "Credencial inválida ou ausente para autenticação do Owner."
      );
    }

    const { usuario, token } = credencial as { usuario?: string; token?: string };

    if (!usuario || typeof usuario !== "string" || usuario.trim() === "") {
      throw new AutenticacaoRequeridaErro("Identificador de usuário do Owner não informado.");
    }

    const usuarioLimpo = usuario.trim().toLowerCase();

    // Verificação de autoridade do Owner
    if (!this.usuariosOwnerValidos.has(usuarioLimpo)) {
      throw new AutoridadeInvalidaErro("Owner", usuario);
    }

    // Se fornecido token, não deve ser vazio ou inválido
    if (token !== undefined && (typeof token !== "string" || token.trim() === "")) {
      throw new AutenticacaoRequeridaErro("Token de autenticação do Owner inválido.");
    }

    return {
      identificadorUsuario: usuario.trim(),
      papeis: ["Owner", "AutoridadeMaterial"],
    };
  }

  public async verificarIdentidadeOwner(usuario: string): Promise<boolean> {
    if (!usuario || typeof usuario !== "string" || usuario.trim() === "") {
      return false;
    }
    return this.usuariosOwnerValidos.has(usuario.trim().toLowerCase());
  }

  /**
   * Valida obrigatoriamente a identidade do Owner antes de registrar decisão humana.
   * Lança AutenticacaoRequeridaErro ou AutoridadeInvalidaErro caso não atenda aos critérios.
   */
  public async exigirIdentidadeOwner(usuario: string): Promise<string> {
    if (!usuario || typeof usuario !== "string" || usuario.trim() === "") {
      throw new AutenticacaoRequeridaErro("Identificador de usuário do Owner ausente ou vazio.");
    }
    const valido = await this.verificarIdentidadeOwner(usuario);
    if (!valido) {
      throw new AutoridadeInvalidaErro("Owner", usuario);
    }
    return usuario.trim();
  }
}
