/**
 * F5-23 pendencies 19-22: closed contract for `codex exec --json` operational
 * events.
 *
 * The JSONL stream produced by `codex exec --json` is captured incrementally,
 * but ONLY a closed set of OPERATIONAL events is ever persisted or projected:
 *   - thread.started   (thread_id)
 *   - turn.started     (no payload)
 *   - turn.completed   (usage token counts only)
 *
 * Prompts, chain of reasoning, tool arguments, file contents, secrets and raw
 * output are NEVER persisted or projected. Any line that does not match the
 * closed contract is dropped fail-closed: a sanitized DISCARD record (reason +
 * count, never the raw line) is emitted instead.
 *
 * Notably `item.completed` is deliberately EXCLUDED: for agent_message items it
 * carries the raw assistant text (the plan response / reasoning) and for
 * function_call items it carries tool arguments — both are forbidden.
 */
export const CODEX_OPERATIONAL_EVENT_CONTRACT = ['thread.started', 'turn.started', 'turn.completed'] as const;
export type CodexOperationalEventType = (typeof CODEX_OPERATIONAL_EVENT_CONTRACT)[number];
export type CodexUsage = { input_tokens?: number; cached_input_tokens?: number; cache_write_input_tokens?: number; output_tokens?: number; reasoning_output_tokens?: number };
export type CodexOperationalEvent =
  | { type: 'thread.started'; thread_id?: string }
  | { type: 'turn.started' }
  | { type: 'turn.completed'; usage?: CodexUsage };

export type CodexEventParseResult =
  | { kind: 'operational'; event: CodexOperationalEvent }
  | { kind: 'discarded'; reason: string };

const safeNonNegative = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined);
const safeThreadId = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length <= 64 && /^[0-9a-fA-F-]+$/.test(v) ? v.slice(0, 64) : undefined;

/** Parse a single `codex exec --json` line against the closed contract (fail-closed). */
export const parseCodexJsonlLine = (line: string): CodexEventParseResult => {
  const trimmed = typeof line === 'string' ? line.trim() : '';
  if (!trimmed) return { kind: 'discarded', reason: 'EMPTY_LINE' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { kind: 'discarded', reason: 'INVALID_JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'discarded', reason: 'NOT_OBJECT' };
  const type = (parsed as Record<string, unknown>).type;
  if (typeof type !== 'string' || !(CODEX_OPERATIONAL_EVENT_CONTRACT as readonly string[]).includes(type)) {
    // Unknown/unrecognized event → fail-closed discard; the raw line is never kept.
    return { kind: 'discarded', reason: 'UNKNOWN_EVENT_TYPE' };
  }
  if (type === 'thread.started') {
    return { kind: 'operational', event: { type: 'thread.started', thread_id: safeThreadId((parsed as Record<string, unknown>).thread_id) } };
  }
  if (type === 'turn.started') {
    return { kind: 'operational', event: { type: 'turn.started' } };
  }
  // turn.completed: only numeric usage counters survive; every other field
  // (turn contents, message ids, reasoning text) is dropped.
  const usageRaw = (parsed as Record<string, unknown>).usage;
  const usage: CodexUsage | undefined = usageRaw && typeof usageRaw === 'object' && !Array.isArray(usageRaw)
    ? Object.fromEntries(
        Object.entries(usageRaw as Record<string, unknown>)
          .filter(([k]) => ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens'].includes(k))
          .map(([k, v]) => [k, safeNonNegative(v)])
          .filter(([, v]) => v !== undefined)
      ) as CodexUsage
    : undefined;
  return { kind: 'operational', event: { type: 'turn.completed', ...(usage ? { usage } : {}) } };
};

/** Split a stream chunk into complete JSONL lines (buffers partial trailing lines). */
export class CodexJsonlLineBuffer {
  private buffer = '';
  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    return lines;
  }
  flush(): string[] {
    const lines = this.buffer.split('\n');
    this.buffer = '';
    return lines.filter((line) => line.trim() !== '');
  }
}
