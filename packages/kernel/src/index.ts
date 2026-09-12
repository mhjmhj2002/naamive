import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

export type LogContext = {
  service: string;
  environment: string;
  release_id: string;
  correlation_id?: string;
  causation_id?: string;
  intention_id?: string;
  principal_class?: string;
  operation?: string;
  outcome?: string;
  error_class?: string;
};

export function createLogger(context: LogContext, options: LoggerOptions = {}, destination?: DestinationStream): Logger {
  return pino({
    base: {
      service: context.service,
      environment: context.environment,
      release_id: context.release_id
    },
    redact: { paths: ['password', 'password.*', 'authorization', 'cookie', 'token'], censor: '[REDACTED]' },
    ...options
  }, destination).child({
    correlation_id: context.correlation_id ?? null,
    causation_id: context.causation_id ?? null,
    intention_id: context.intention_id ?? null,
    principal_class: context.principal_class ?? null,
    operation: context.operation ?? null,
    outcome: context.outcome ?? null,
    error_class: context.error_class ?? null
  });
}
