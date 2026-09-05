import { config } from './config.js';
import type { AdapterType, AuthType } from './agent-runtime-contracts.js';

const envReference = /^env:([A-Z0-9_]+)$/;
const secretManagerReference = /^naamive\/([a-z0-9-]+)\/deepseek\/api-key$/;

export class SecretResolutionError extends Error {
  constructor(readonly code: string, readonly nextAction: string) {
    super(code);
  }
}

export class EnvironmentSecretResolver {
  resolve(reference: string | null, environment: string, adapterType: AdapterType, authType: AuthType) {
    if (authType === 'NONE' || authType === 'CLI_SESSION') return undefined;
    if (!reference) throw new SecretResolutionError('SECRET_REFERENCE_REQUIRED', 'Cadastre uma referência de segredo permitida para o runtime.');
    if (adapterType !== 'OPENAI_COMPATIBLE_HTTP' || authType !== 'BEARER_TOKEN') throw new SecretResolutionError('SECRET_REFERENCE_NOT_ALLOWED', 'Somente runtimes HTTP autenticados por bearer token podem resolver este segredo.');
    const envMatch = reference.match(envReference);
    if (envMatch) {
      if (environment !== 'development') throw new SecretResolutionError('SECRET_REFERENCE_ENVIRONMENT_NOT_ALLOWED', 'Referências env:* só são permitidas em desenvolvimento.');
      if (envMatch[1] !== 'NAAMIVE_SECRET_DEEPSEEK_API_KEY') throw new SecretResolutionError('SECRET_REFERENCE_NAMESPACE_NOT_ALLOWED', 'Use somente a referência env aprovada para DeepSeek.');
      const value = process.env[envMatch[1]];
      if (!value) throw new SecretResolutionError('SECRET_NOT_AVAILABLE', 'Defina o segredo DeepSeek no ambiente aprovado.');
      return value;
    }
    const managerMatch = reference.match(secretManagerReference);
    if (!managerMatch) throw new SecretResolutionError('SECRET_REFERENCE_NAMESPACE_NOT_ALLOWED', 'A referência de segredo está fora do namespace aprovado.');
    if (managerMatch[1] !== environment) throw new SecretResolutionError('SECRET_REFERENCE_ENVIRONMENT_NOT_ALLOWED', 'A referência de segredo não corresponde ao ambiente configurado.');
    const cfg = config();
    const value = process.env.NAAMIVE_SECRET_DEEPSEEK_API_KEY ?? process.env[cfg.deepseekSecretEnvName];
    if (!value) throw new SecretResolutionError('SECRET_NOT_AVAILABLE', 'O resolver de segredos não encontrou a credencial aprovada.');
    return value;
  }
}
