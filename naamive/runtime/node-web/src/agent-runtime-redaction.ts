const secretPattern = /(authorization|api[_-]?key|token|secret|password|signed_url|prompt|response|stdout|stderr|command|cwd|workdir|repository_path|path|environment)/i;

export const sanitizeStructured = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeStructured);
  if (!value || typeof value !== 'object') return typeof value === 'string' && value.length > 2048 ? `${value.slice(0, 2048)}…` : value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !secretPattern.test(key))
    .map(([key, item]) => [key, sanitizeStructured(item)]));
};

export const sanitizeErrorMessage = (message: string | null | undefined) => {
  if (!message) return undefined;
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/[A-Za-z0-9_\-]{16,}/g, (token) => secretPattern.test(token) ? '[REDACTED]' : token)
    .replace(/https?:\/\/[^\s]+/gi, (url) => url.includes('api.deepseek.com') ? 'https://api.deepseek.com/[REDACTED]' : url)
    .replace(/[^A-Za-z0-9_.:/ -]/g, '')
    .slice(0, 512);
};

export const deepseekMonthlyLimitUsd = 10;
export const deepseekExecutionLimitUsd = 1;
