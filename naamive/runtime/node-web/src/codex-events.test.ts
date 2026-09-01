import assert from 'node:assert/strict';
import test from 'node:test';

// F5-23 pendency 19: closed-contract parser for `codex exec --json` JSONL.
// Pure unit tests — no DB, no config, no agent invocation.

const { parseCodexJsonlLine, CodexJsonlLineBuffer, CODEX_OPERATIONAL_EVENT_CONTRACT } = await import('./codex-events.js');

test('closed contract accepts only safe operational event types', () => {
  assert.deepEqual([...CODEX_OPERATIONAL_EVENT_CONTRACT], ['thread.started', 'turn.started', 'turn.completed', 'item.started', 'item.completed']);
});

test('parseCodexJsonlLine accepts thread.started and keeps only a sanitized thread_id', () => {
  const result = parseCodexJsonlLine(JSON.stringify({ type: 'thread.started', thread_id: 'abcd-1234', prompt: 'do not persist', reasoning: 'raw' }));
  assert.equal(result.kind, 'operational');
  if (result.kind !== 'operational') return;
  assert.equal(result.event.type, 'thread.started');
  assert.equal(result.event.thread_id, 'abcd-1234');
  // Unknown fields (prompt/reasoning) are never carried forward.
  assert.ok(!('prompt' in result.event));
  assert.ok(!('reasoning' in result.event));
});

test('parseCodexJsonlLine accepts turn.started with no payload', () => {
  const result = parseCodexJsonlLine(JSON.stringify({ type: 'turn.started', message: 'raw assistant text' }));
  assert.equal(result.kind, 'operational');
  if (result.kind !== 'operational') return;
  assert.equal(result.event.type, 'turn.started');
  assert.deepEqual(Object.keys(result.event), ['type']);
});

test('parseCodexJsonlLine accepts turn.completed but ONLY sanitized usage counters survive', () => {
  const result = parseCodexJsonlLine(JSON.stringify({
    type: 'turn.completed',
    id: 'secret-message-id',
    content: 'raw plan response with reasoning',
    tool_calls: [{ arguments: '{ "secret": true }' }],
    usage: { input_tokens: 120, output_tokens: 40, reasoning_output_tokens: 25, cached_input_tokens: 5, cache_write_input_tokens: 3, extra: 'nope' }
  }));
  assert.equal(result.kind, 'operational');
  if (result.kind !== 'operational') return;
  assert.equal(result.event.type, 'turn.completed');
  assert.deepEqual(result.event.usage, { input_tokens: 120, output_tokens: 40, reasoning_output_tokens: 25, cached_input_tokens: 5, cache_write_input_tokens: 3 });
  // No raw text, tool arguments, message ids or unknown counters.
  assert.ok(!('content' in result.event));
  assert.ok(!('id' in result.event));
  assert.ok(!('tool_calls' in result.event));
  assert.ok(!('usage' in result.event && 'extra' in result.event.usage!));
});

test('turn.completed with a malformed usage is dropped to undefined (never raw)', () => {
  const result = parseCodexJsonlLine(JSON.stringify({ type: 'turn.completed', usage: 'not-an-object' }));
  assert.equal(result.kind, 'operational');
  if (result.kind !== 'operational') return;
  assert.equal(result.event.type, 'turn.completed');
  assert.equal(result.event.usage, undefined);
});

test('item events retain only their type and discard all unsafe payload', () => {
  for (const type of ['item.started','item.completed'] as const) {
    const result = parseCodexJsonlLine(JSON.stringify({ type, content: 'raw assistant plan', arguments: '{"secret":true}' }));
    assert.equal(result.kind, 'operational');
    if (result.kind === 'operational') assert.deepEqual(result.event, { type });
  }
});

test('unknown or unsafe event types are discarded fail-closed, never exposed', () => {
  const cases = [
    { type: 'agent_message', text: 'reasoning' },
    { type: 'function_call', arguments: '{"secret":true}' },
    { type: 'secret_event', token: 'abc' }
  ];
  for (const line of cases) {
    const result = parseCodexJsonlLine(JSON.stringify(line));
    assert.equal(result.kind, 'discarded', `expected discard for ${line.type}`);
    if (result.kind === 'discarded') assert.equal(result.reason, 'UNKNOWN_EVENT_TYPE');
  }
});

test('malformed lines are discarded fail-closed (empty, invalid JSON, non-object)', () => {
  assert.equal(parseCodexJsonlLine('').kind, 'discarded');
  assert.equal(parseCodexJsonlLine('   ').kind, 'discarded');
  assert.equal(parseCodexJsonlLine('not json').kind, 'discarded');
  assert.equal(parseCodexJsonlLine('[1,2]').kind, 'discarded');
  assert.equal(parseCodexJsonlLine('"just-a-string"').kind, 'discarded');
});

test('discard records carry only a sanitized reason, never the raw line', () => {
  const raw = JSON.stringify({ type: 'agent_message', content: 'SECRET_RAW_OUTPUT' });
  const result = parseCodexJsonlLine(raw);
  assert.equal(result.kind, 'discarded');
  if (result.kind !== 'discarded') return;
  assert.equal(result.reason, 'UNKNOWN_EVENT_TYPE');
  assert.ok(!JSON.stringify(result).includes('SECRET_RAW_OUTPUT'));
  assert.ok(!JSON.stringify(result).includes(raw));
});

test('thread.started thread_id is sanitized (length + charset)', () => {
  const ok = parseCodexJsonlLine(JSON.stringify({ type: 'thread.started', thread_id: 'a'.repeat(200) }));
  assert.equal(ok.kind, 'operational');
  const okEvent = ok.kind === 'operational' ? ok.event : undefined;
  assert.ok(okEvent && okEvent.type === 'thread.started');
  if (!okEvent || okEvent.type !== 'thread.started') return;
  assert.ok((okEvent.thread_id ?? '').length <= 64);
  const unsafe = parseCodexJsonlLine(JSON.stringify({ type: 'thread.started', thread_id: 'drop table users;' }));
  assert.equal(unsafe.kind, 'operational');
  const unsafeEvent = unsafe.kind === 'operational' ? unsafe.event : undefined;
  assert.ok(unsafeEvent && unsafeEvent.type === 'thread.started');
  if (!unsafeEvent || unsafeEvent.type !== 'thread.started') return;
  assert.equal(unsafeEvent.thread_id, undefined);
});

test('CodexJsonlLineBuffer splits complete lines and buffers partial trailing chunks', () => {
  const buffer = new CodexJsonlLineBuffer();
  const chunk1 = buffer.push('{"type":"turn.started"}\n{"type":"thread.star');
  assert.deepEqual(chunk1, ['{"type":"turn.started"}']);
  const chunk2 = buffer.push('ted","thread_id":"t1"}\n');
  assert.deepEqual(chunk2, ['{"type":"thread.started","thread_id":"t1"}']);
  assert.deepEqual(buffer.flush(), []);
  const tail = new CodexJsonlLineBuffer();
  tail.push('{"type":"turn.completed"}');
  assert.deepEqual(tail.flush(), ['{"type":"turn.completed"}']);
});
