import { sql, type Kysely } from 'kysely';
import type {
  LoginAuthenticationRepository,
  LoginFailureRecorded,
  LoginRateLimit,
  PasswordCredential
} from '@naamive/modules';
import type { DatabaseSchema } from './index.js';

type CredentialRow = {
  principal_id: string;
  credential_version: string;
  hash_format_version: number;
  algorithm: 'argon2id';
  memory_kib: number;
  iterations: number;
  parallelism: number;
  salt: Buffer;
  hash: Buffer;
  status: 'ACTIVE' | 'SUSPENDED';
};

export function createLoginAuthenticationRepository(database: Kysely<DatabaseSchema>): LoginAuthenticationRepository {
  return {
    async findCredentialByUsername(username) {
      const result = await sql<CredentialRow>`
        SELECT credential.principal_id, credential.credential_version, credential.hash_format_version,
          credential.algorithm, credential.memory_kib, credential.iterations, credential.parallelism,
          credential.salt, credential.hash, principal.status
        FROM authority.principal AS principal
        JOIN security.human_password_credential AS credential ON credential.principal_id = principal.principal_id
        WHERE principal.username = ${username} AND credential.revoked_at IS NULL
      `.execute(database);
      const row = result.rows[0];
      if (!row) return undefined;
      return credentialFrom(row);
    },
    async checkRateLimit(input): Promise<LoginRateLimit> {
      const result = await sql<{ rate_limited: boolean; retry_after_seconds: number | null }>`
        SELECT rate_limited, retry_after_seconds
        FROM security.login_rate_limit_check(${input.ipSignal}, ${input.usernameIpSignal}, ${input.now})
      `.execute(database);
      return result.rows[0]?.rate_limited
        ? { rateLimited: true, retryAfterSeconds: result.rows[0].retry_after_seconds! }
        : { rateLimited: false };
    },
    async recordFailure(input): Promise<LoginFailureRecorded> {
      const result = await sql<{ accepted: boolean; delay_seconds: number | null; retry_after_seconds: number | null }>`
        SELECT accepted, delay_seconds, retry_after_seconds
        FROM security.login_rate_limit_record_failure(${input.ipSignal}, ${input.usernameIpSignal}, ${input.now})
      `.execute(database);
      const row = result.rows[0]!;
      return row.accepted
        ? { accepted: true, delaySeconds: row.delay_seconds! }
        : { accepted: false, retryAfterSeconds: row.retry_after_seconds! };
    },
    async resetUsernameIpRateLimit(input): Promise<void> {
      await sql`SELECT security.login_rate_limit_reset_username_ip(${input.usernameIpSignal}, ${input.now})`.execute(database);
    }
  };
}

function credentialFrom(row: CredentialRow): PasswordCredential & { principalStatus: 'ACTIVE' | 'SUSPENDED' } {
  return {
    principalId: row.principal_id,
    credentialVersion: BigInt(row.credential_version),
    hashFormatVersion: row.hash_format_version,
    algorithm: row.algorithm,
    memoryKib: row.memory_kib,
    iterations: row.iterations,
    parallelism: row.parallelism,
    salt: row.salt,
    hash: row.hash,
    principalStatus: row.status
  };
}
