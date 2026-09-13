export type PrincipalStatus = 'ACTIVE' | 'SUSPENDED';

export class PrincipalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrincipalValidationError';
  }
}

export class PrincipalStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Principal status transition ${from} -> ${to} is not allowed`);
    this.name = 'PrincipalStateTransitionError';
  }
}

const usernamePattern = /^[a-z][a-z0-9_-]{2,31}$/;

export function assertValidUsername(username: string): void {
  if (!usernamePattern.test(username)) {
    throw new PrincipalValidationError('Username must match exactly [a-z][a-z0-9_-]{2,31}');
  }
}

export function assertPrincipalStatusTransition(from: PrincipalStatus, to: PrincipalStatus): void {
  if ((from === 'ACTIVE' && to === 'SUSPENDED') || (from === 'SUSPENDED' && to === 'ACTIVE')) return;
  throw new PrincipalStateTransitionError(from, to);
}

export function isActivePrincipalStatus(status: PrincipalStatus): boolean {
  return status === 'ACTIVE';
}
