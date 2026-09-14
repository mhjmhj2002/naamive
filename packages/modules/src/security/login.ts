import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { assertValidUsername } from '../authority/principal.js';

const deriveArgon2id = promisify(argon2);

export const passwordHashParameters = {
  algorithm: 'argon2id',
  hashFormatVersion: 1,
  memoryKib: 65_536,
  iterations: 3,
  parallelism: 1,
  saltBytes: 16,
  hashBytes: 32
} as const;

export type PasswordCredential = {
  principalId: string;
  credentialVersion: bigint;
  hashFormatVersion: number;
  algorithm: 'argon2id';
  memoryKib: number;
  iterations: number;
  parallelism: number;
  salt: Buffer;
  hash: Buffer;
};

export type AuthenticatedPrincipal = {
  principalId: string;
  authenticatedAt: Date;
  credentialVersion: bigint;
  correlationId: string;
};

export type LoginRateLimit =
  | { rateLimited: false }
  | { rateLimited: true; retryAfterSeconds: number };

export type LoginFailureRecorded =
  | { accepted: true; delaySeconds: number }
  | { accepted: false; retryAfterSeconds: number };

export interface LoginAuthenticationRepository {
  findCredentialByUsername(username: string): Promise<(PasswordCredential & { principalStatus: 'ACTIVE' | 'SUSPENDED' }) | undefined>;
  checkRateLimit(input: { usernameIpSignal: Buffer; ipSignal: Buffer; now: Date }): Promise<LoginRateLimit>;
  recordFailure(input: { usernameIpSignal: Buffer; ipSignal: Buffer; now: Date }): Promise<LoginFailureRecorded>;
  resetUsernameIpRateLimit(input: { usernameIpSignal: Buffer; now: Date }): Promise<void>;
}

export type LoginResult =
  | { kind: 'SUCCESS'; authenticatedPrincipal: AuthenticatedPrincipal }
  | { kind: 'AUTHENTICATION_FAILED'; delaySeconds: number }
  | { kind: 'RATE_LIMITED'; retryAfterSeconds: number };

export type LoginAuthenticator = {
  authenticate(input: { username: string; password: string; clientIp: string; correlationId: string; now?: Date }): Promise<LoginResult>;
};

export type LoginAuthenticationOptions = {
  hmac: (value: string) => Buffer;
};

const dummyCredential: PasswordCredential = {
  principalId: '00000000-0000-0000-0000-000000000000',
  credentialVersion: 0n,
  hashFormatVersion: passwordHashParameters.hashFormatVersion,
  algorithm: 'argon2id',
  memoryKib: passwordHashParameters.memoryKib,
  iterations: passwordHashParameters.iterations,
  parallelism: passwordHashParameters.parallelism,
  salt: Buffer.alloc(passwordHashParameters.saltBytes),
  hash: Buffer.from('ac04c530a42ff935d2d33f2ecd261bf93ea9bbe0ce165e60f1f47a3667088d94', 'hex')
};

export async function hashPassword(password: string): Promise<Pick<PasswordCredential, 'hashFormatVersion' | 'algorithm' | 'memoryKib' | 'iterations' | 'parallelism' | 'salt' | 'hash'>> {
  const salt = randomBytes(passwordHashParameters.saltBytes);
  return {
    hashFormatVersion: passwordHashParameters.hashFormatVersion,
    algorithm: passwordHashParameters.algorithm,
    memoryKib: passwordHashParameters.memoryKib,
    iterations: passwordHashParameters.iterations,
    parallelism: passwordHashParameters.parallelism,
    salt,
    hash: await derive(password, salt, passwordHashParameters)
  };
}

export async function verifyPassword(password: string, credential: PasswordCredential): Promise<boolean> {
  if (credential.algorithm !== 'argon2id' || credential.hash.length !== passwordHashParameters.hashBytes) return false;
  const derived = await derive(password, credential.salt, credential);
  return timingSafeEqual(derived, credential.hash);
}

export function createLoginAuthenticator(
  repository: LoginAuthenticationRepository,
  options: LoginAuthenticationOptions
): LoginAuthenticator {
  return {
    async authenticate(input) {
      assertValidLoginInput(input.username, input.password);
      const now = input.now ?? new Date();
      const usernameIpSignal = options.hmac(`username+ip\u0000${input.username}\u0000${input.clientIp}`);
      const ipSignal = options.hmac(`ip\u0000${input.clientIp}`);
      const limited = await repository.checkRateLimit({ usernameIpSignal, ipSignal, now });
      if (limited.rateLimited) return { kind: 'RATE_LIMITED', retryAfterSeconds: limited.retryAfterSeconds };

      const credential = await repository.findCredentialByUsername(input.username);
      const usableCredential = credential && credential.principalStatus === 'ACTIVE' ? credential : dummyCredential;
      const verified = await verifyPassword(input.password, usableCredential);
      if (!credential || credential.principalStatus !== 'ACTIVE' || !verified) {
        const recorded = await repository.recordFailure({ usernameIpSignal, ipSignal, now });
        if (!recorded.accepted) return { kind: 'RATE_LIMITED', retryAfterSeconds: recorded.retryAfterSeconds };
        return { kind: 'AUTHENTICATION_FAILED', delaySeconds: recorded.delaySeconds };
      }

      await repository.resetUsernameIpRateLimit({ usernameIpSignal, now });
      return {
        kind: 'SUCCESS',
        authenticatedPrincipal: {
          principalId: credential.principalId,
          authenticatedAt: now,
          credentialVersion: credential.credentialVersion,
          correlationId: input.correlationId
        }
      };
    }
  };
}

export function assertValidLoginInput(username: unknown, password: unknown): asserts username is string {
  if (typeof username !== 'string' || typeof password !== 'string') throw new LoginValidationError();
  try {
    assertValidUsername(username);
  } catch {
    throw new LoginValidationError();
  }
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (passwordBytes < 1 || passwordBytes > 1_024) throw new LoginValidationError();
}

export class LoginValidationError extends Error {
  constructor() {
    super('Login request is structurally invalid');
    this.name = 'LoginValidationError';
  }
}

async function derive(
  password: string,
  salt: Buffer,
  parameters: Pick<PasswordCredential, 'memoryKib' | 'iterations' | 'parallelism'>
): Promise<Buffer> {
  return Buffer.from(await deriveArgon2id('argon2id', {
    message: Buffer.from(password, 'utf8'),
    nonce: salt,
    memory: parameters.memoryKib,
    passes: parameters.iterations,
    parallelism: parameters.parallelism,
    tagLength: passwordHashParameters.hashBytes
  }));
}
