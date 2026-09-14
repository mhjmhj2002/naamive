import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import {
  PrincipalStateTransitionError,
  PrincipalValidationError,
  assertPrincipalStatusTransition,
  assertValidUsername,
  isActivePrincipalStatus,
  type PrincipalStatus
} from '@naamive/modules';

export { createLoginAuthenticationRepository } from './login.js';

export interface DatabaseSchema {
  platform: { foundation_migration_probe: { id: number } };
  authority: {
    principal: {
      principal_id: string;
      username: string;
      status: PrincipalStatus;
      version: string;
      current_history_event_id: string;
    };
    principal_history: {
      history_event_id: string;
      principal_id: string;
      version: string;
      username: string;
      status: PrincipalStatus;
      event_type: PrincipalHistoryEventType;
      occurred_at: Date;
    };
  };
  security: {
    human_password_credential: {
      credential_id: string;
      principal_id: string;
      credential_version: string;
      hash_format_version: number;
      algorithm: 'argon2id';
      memory_kib: number;
      iterations: number;
      parallelism: number;
      salt: Buffer;
      hash: Buffer;
      revoked_at: Date | null;
    };
  };
}

export type PrincipalHistoryEventType = 'PRINCIPAL_CREATED' | 'USERNAME_CHANGED' | 'STATUS_CHANGED';

export type PrincipalSnapshot = {
  principalId: string;
  username: string;
  status: PrincipalStatus;
  version: bigint;
  currentHistoryEventId: string;
};

export type PrincipalHistoryEntry = PrincipalSnapshot & {
  historyEventId: string;
  eventType: PrincipalHistoryEventType;
  occurredAt: Date;
};

export class PrincipalVersionConflictError extends Error {
  constructor() {
    super('The Principal expected version is stale');
    this.name = 'PrincipalVersionConflictError';
  }
}

export function createDatabase(connectionString: string) {
  return new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }) });
}

type PrincipalRow = {
  principal_id: string;
  username: string;
  status: PrincipalStatus;
  version: string;
  current_history_event_id: string;
};

type PrincipalHistoryRow = PrincipalRow & {
  history_event_id: string;
  event_type: PrincipalHistoryEventType;
  occurred_at: Date;
};

function snapshotFrom(row: PrincipalRow): PrincipalSnapshot {
  return {
    principalId: row.principal_id,
    username: row.username,
    status: row.status,
    version: BigInt(row.version),
    currentHistoryEventId: row.current_history_event_id
  };
}

function historyFrom(row: PrincipalHistoryRow): PrincipalHistoryEntry {
  return {
    ...snapshotFrom(row),
    historyEventId: row.history_event_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at
  };
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createPrincipal(
  database: Kysely<DatabaseSchema>,
  input: { principalId?: string; username: string }
): Promise<PrincipalSnapshot> {
  assertValidUsername(input.username);
  const principalId = input.principalId ?? newId();
  const historyEventId = newId();
  const result = await sql<PrincipalRow>`
    SELECT principal_id, username, status, version, current_history_event_id
    FROM authority.create_principal(${principalId}::uuid, ${input.username}, ${historyEventId}::uuid)
  `.execute(database);
  return snapshotFrom(requiredRow(result.rows[0]));
}

export async function changePrincipalUsername(
  database: Kysely<DatabaseSchema>,
  input: { principalId: string; expectedVersion: bigint; username: string }
): Promise<PrincipalSnapshot> {
  assertValidUsername(input.username);
  return mutatePrincipal(database, input.principalId, input.expectedVersion, 'USERNAME_CHANGED', input.username, undefined);
}

export async function changePrincipalStatus(
  database: Kysely<DatabaseSchema>,
  input: { principalId: string; expectedVersion: bigint; status: PrincipalStatus }
): Promise<PrincipalSnapshot> {
  const current = await getPrincipal(database, input.principalId);
  assertPrincipalStatusTransition(requiredRow(current).status, input.status);
  return mutatePrincipal(database, input.principalId, input.expectedVersion, 'STATUS_CHANGED', undefined, input.status);
}

export async function getPrincipal(
  database: Kysely<DatabaseSchema>,
  principalId: string
): Promise<PrincipalSnapshot | undefined> {
  const result = await sql<PrincipalRow>`
    SELECT principal_id, username, status, version, current_history_event_id
    FROM authority.principal WHERE principal_id = ${principalId}::uuid
  `.execute(database);
  return result.rows[0] ? snapshotFrom(result.rows[0]) : undefined;
}

export async function getPrincipalHistory(
  database: Kysely<DatabaseSchema>,
  principalId: string
): Promise<PrincipalHistoryEntry[]> {
  const result = await sql<PrincipalHistoryRow>`
    SELECT history.history_event_id, history.principal_id, history.version, history.username, history.status,
      history.event_type, history.occurred_at, principal.current_history_event_id
    FROM authority.principal_history AS history
    JOIN authority.principal AS principal USING (principal_id)
    WHERE history.principal_id = ${principalId}::uuid
    ORDER BY history.version
  `.execute(database);
  return result.rows.map(historyFrom);
}

export async function isPrincipalActive(database: Kysely<DatabaseSchema>, principalId: string): Promise<boolean> {
  const principal = await getPrincipal(database, principalId);
  return principal !== undefined && isActivePrincipalStatus(principal.status);
}

async function mutatePrincipal(
  database: Kysely<DatabaseSchema>,
  principalId: string,
  expectedVersion: bigint,
  eventType: Exclude<PrincipalHistoryEventType, 'PRINCIPAL_CREATED'>,
  requestedUsername: string | undefined,
  requestedStatus: PrincipalStatus | undefined
): Promise<PrincipalSnapshot> {
  const historyEventId = newId();
  try {
    const result = eventType === 'USERNAME_CHANGED'
      ? await sql<PrincipalRow>`
          SELECT principal_id, username, status, version, current_history_event_id
          FROM authority.change_principal_username(${principalId}::uuid, ${expectedVersion.toString()}::bigint,
            ${requestedUsername!}, ${historyEventId}::uuid)
        `.execute(database)
      : await sql<PrincipalRow>`
          SELECT principal_id, username, status, version, current_history_event_id
          FROM authority.change_principal_status(${principalId}::uuid, ${expectedVersion.toString()}::bigint,
            ${requestedStatus!}, ${historyEventId}::uuid)
        `.execute(database);
    return snapshotFrom(requiredRow(result.rows[0]));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Principal expected version is stale')) {
      throw new PrincipalVersionConflictError();
    }
    throw error;
  }
}

function requiredRow<T>(row: T | undefined): T {
  if (!row) throw new PrincipalValidationError('Principal does not exist');
  return row;
}
