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
  return database.transaction().execute(async (transaction) => {
    await sql`
      INSERT INTO authority.principal (principal_id, username, status, version, current_history_event_id)
      VALUES (${principalId}::uuid, ${input.username}, 'ACTIVE', 1, ${historyEventId}::uuid)
    `.execute(transaction);
    await sql`
      INSERT INTO authority.principal_history (history_event_id, principal_id, version, username, status, event_type)
      VALUES (${historyEventId}::uuid, ${principalId}::uuid, 1, ${input.username}, 'ACTIVE', 'PRINCIPAL_CREATED')
    `.execute(transaction);
    const result = await sql<PrincipalRow>`
      SELECT principal_id, username, status, version, current_history_event_id
      FROM authority.principal WHERE principal_id = ${principalId}::uuid
    `.execute(transaction);
    return snapshotFrom(requiredRow(result.rows[0]));
  });
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
  return database.transaction().execute(async (transaction) => {
    const currentResult = await sql<PrincipalRow>`
      SELECT principal_id, username, status, version, current_history_event_id
      FROM authority.principal WHERE principal_id = ${principalId}::uuid FOR UPDATE
    `.execute(transaction);
    const current = requiredRow(currentResult.rows[0]);
    if (BigInt(current.version) !== expectedVersion) throw new PrincipalVersionConflictError();

    const nextUsername = requestedUsername ?? current.username;
    const nextStatus = requestedStatus ?? current.status;
    if (requestedStatus !== undefined) assertPrincipalStatusTransition(current.status, requestedStatus);
    if (requestedUsername !== undefined && requestedUsername === current.username) {
      throw new PrincipalValidationError('A username mutation must change the current username');
    }
    const nextVersion = expectedVersion + 1n;
    const historyEventId = newId();
    await sql`
      INSERT INTO authority.principal_history (history_event_id, principal_id, version, username, status, event_type)
      VALUES (${historyEventId}::uuid, ${principalId}::uuid, ${nextVersion.toString()}::bigint,
        ${nextUsername}, ${nextStatus}, ${eventType})
    `.execute(transaction);
    const update = await sql<PrincipalRow>`
      UPDATE authority.principal
      SET username = ${nextUsername}, status = ${nextStatus}, version = ${nextVersion.toString()}::bigint,
        current_history_event_id = ${historyEventId}::uuid
      WHERE principal_id = ${principalId}::uuid AND version = ${expectedVersion.toString()}::bigint
      RETURNING principal_id, username, status, version, current_history_event_id
    `.execute(transaction);
    if (!update.rows[0]) throw new PrincipalVersionConflictError();
    return snapshotFrom(update.rows[0]);
  });
}

function requiredRow<T>(row: T | undefined): T {
  if (!row) throw new PrincipalValidationError('Principal does not exist');
  return row;
}
