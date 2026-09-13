import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

const CENSOR = '[REDACTED]';
const sensitiveKeys = new Set([
  'password',
  'passwd',
  'authorization',
  'cookie',
  'token',
  'access_token',
  'refresh_token',
  'auth_token',
  'id_token',
  'api_key',
  'apikey',
  'secret'
]);

function normalizedKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]/g, '_')
    .toLowerCase();
}

function redactSensitiveValues(value: unknown, seen = new WeakMap<object, object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  const copy: object = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);

  for (const [key, nestedValue] of Object.entries(value)) {
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: sensitiveKeys.has(normalizedKey(key))
        ? CENSOR
        : redactSensitiveValues(nestedValue, seen),
      writable: true
    });
  }
  return copy;
}

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
  const { hooks: configuredHooks, ...pinoOptions } = options;
  return pino({
    ...pinoOptions,
    base: {
      service: context.service,
      environment: context.environment,
      release_id: context.release_id
    },
    redact: {
      paths: [...sensitiveKeys],
      censor: CENSOR
    },
    hooks: {
      ...configuredHooks,
      logMethod(args, method, level) {
        const [firstArgument, ...remainingArguments] = args;
        const redactedArgs = (firstArgument !== null && typeof firstArgument === 'object')
          ? [redactSensitiveValues(firstArgument), ...remainingArguments] as typeof args
          : args;
        if (configuredHooks?.logMethod) {
          configuredHooks.logMethod.call(this, redactedArgs, method, level);
          return;
        }
        method.apply(this, redactedArgs);
      }
    }
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
