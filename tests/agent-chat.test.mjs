import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const { database } = useTestDesktop();
Object.assign(globalThis.chainDesktop, {
  processRunner: { run: (...args) => globalThis.agentChatRun(...args) },
  agentServer: { start: async () => ({ port: 7890 }), stop: async () => {} },
});
const { initDb } = await import('../src/shared/lib/db/index.ts');
const connections = await import('../src/features/agent-chat/lib/connections.ts');
const conversations = await import('../src/features/agent-chat/lib/conversations.ts');
const messages = await import('../src/features/agent-chat/lib/messages.ts');
const usage = await import('../src/features/agent-chat/lib/usage.ts');
const retention = await import('../src/features/agent-chat/lib/retention.ts');
const { parseArgs } = await import('../src/features/agent-chat/lib/presets.ts');
const { runTurn } = await import('../src/features/agent-chat/lib/runTurn.ts');
await initDb();

for (const foreignKeys of ['OFF', 'ON']) {
  test(`chat lifecycle, identity, cleanup and usage with foreign_keys ${foreignKeys}`, async () => {
    database.exec(`PRAGMA foreign_keys = ${foreignKeys}`);
    const input = { name: " Echo'); DROP TABLE course; -- ", kind: 'custom', command: 'echo', args: ['a b', '--literal'] };
    await connections.createConnection(input);
    let [connection] = await connections.getConnections();
    assert.equal(connection.name, input.name.trim());
    assert.deepEqual(connection.args, input.args);
    assert.equal(connection.conversation_count, 0);
    assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE name = 'course'").get());
    const chat = await conversations.createConversation(connection.id);
    const kept = await conversations.createConversation(connection.id);
    assert.equal(chat.agent_connection_id, connection.id);
    await assert.rejects(conversations.createConversation(999999), /no longer exists/);
    await assert.rejects(messages.appendMessage(999999, 'user', 'orphan'), /no longer exists/);
    await assert.rejects(connections.deleteConnection(connection.id), /conversations first/);
    await assert.rejects(connections.updateConnection(connection.id, { ...input, command: 'another-agent' }), /different command/);
    await assert.rejects(connections.updateConnection(connection.id, { ...input, args: [] }), /different command/);
    await connections.updateConnection(connection.id, { ...input, name: 'Renamed echo' });
    assert.throws(() => database.prepare('UPDATE agent_conversation SET agent_connection_id = ? WHERE id = ?').run(999999, chat.id), /cannot switch/);
    database.prepare("UPDATE agent_conversation SET updated_at = '2000-01-01' WHERE id = ?").run(chat.id);
    const content = '<script>alert("untrusted")</script>';
    await messages.appendMessage(chat.id, 'user', content);
    await messages.appendMessage(chat.id, 'assistant', 'Reply');
    await messages.appendMessage(chat.id, 'tool', '{"name":"create_page"}');
    await messages.appendMessage(chat.id, 'error', 'Stopped');
    assert.equal((await conversations.getConversation(chat.id)).title, content);
    assert.notEqual((await conversations.getConversation(chat.id)).updated_at, '2000-01-01');
    assert.deepEqual((await messages.getMessages(chat.id)).map((message) => message.role), ['user', 'assistant', 'tool', 'error']);
    assert.deepEqual(await messages.getMessages(kept.id), []);
    await conversations.renameConversation(chat.id, 'My title');
    await messages.appendMessage(chat.id, 'user', 'Follow-up');
    await conversations.updateConversationSessionId(chat.id, 'external-session');
    assert.equal((await conversations.getConversation(chat.id)).title, 'My title');
    assert.equal((await conversations.getConversation(chat.id)).external_session_id, 'external-session');
    await assert.rejects(conversations.renameConversation(chat.id, ' '), /title/);
    const invocation = { agent_connection_id: connection.id, conversation_id: chat.id, duration_ms: 52, input_tokens: null, output_tokens: null, cost_usd: null, exit_code: 0 };
    await usage.recordUsage(invocation);
    assert.equal((await usage.getUsageSummary(connection.id)).total_cost, null);
    await usage.recordUsage({ ...invocation, cost_usd: 0, input_tokens: 12, output_tokens: 8 });
    await usage.recordUsage({ ...invocation, cost_usd: 0.25 });
    await assert.rejects(usage.recordUsage({ ...invocation, conversation_id: 999999 }), /must belong/);
    assert.equal((await usage.getUsageSummary(connection.id)).invocation_count, 3);
    assert.equal((await usage.getUsageSummary(connection.id)).known_cost_count, 2);
    assert.equal((await usage.getUsageSummary(connection.id)).total_cost, 0.25);
    await retention.setRetentionDays(null);
    assert.equal(await retention.getRetentionDays(), null);
    database.prepare("UPDATE agent_conversation SET updated_at = datetime('now', '-8 days') WHERE id = ?").run(chat.id);
    await retention.cleanUpConversations();
    assert.ok(await conversations.getConversation(chat.id));
    await retention.setRetentionDays(7);
    assert.equal(await retention.getRetentionDays(), 7);
    await retention.cleanUpConversations();
    assert.equal(await conversations.getConversation(chat.id), undefined);
    assert.deepEqual(await messages.getMessages(chat.id), []);
    assert.ok(await conversations.getConversation(kept.id));
    assert.equal((await usage.getUsageSummary(connection.id)).invocation_count, 3);
    assert.ok(database.prepare('SELECT conversation_id FROM agent_usage').all().every((row) => row.conversation_id === null));
    await conversations.deleteConversation(kept.id);
    await connections.deleteConnection(connection.id);
    assert.deepEqual(await connections.getConnections(), []);
    assert.equal(database.prepare('SELECT count(*) AS count FROM agent_usage').get().count, 0);
  });
}

test('invalid settings and argument shapes cannot change saved data', async () => {
  assert.deepEqual(parseArgs('["--flag", "two words", "$(not-a-shell)"]'), ['--flag', 'two words', '$(not-a-shell)']);
  for (const value of ['{}', '[1]', '[null]', 'not json', '["\\u0000"]']) assert.throws(() => parseArgs(value));
  await assert.rejects(connections.createConnection({ name: ' ', kind: 'custom', command: 'echo', args: [] }), /name/);
  await assert.rejects(connections.createConnection({ name: 'Echo', kind: 'custom', command: ' ', args: [] }), /executable/);
  await retention.setRetentionDays(30);
  for (const days of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(retention.setRetentionDays(days), /positive/);
    await assert.rejects(conversations.deleteConversationsOlderThan(days), /positive/);
  }
  assert.equal(await retention.getRetentionDays(), 30);
  database.prepare('UPDATE settings SET value = ? WHERE key = ?').run('garbage', 'agent-chat.retention-days');
  assert.equal(await retention.getRetentionDays(), null);
  assert.deepEqual(await connections.getConnections(), []);
  assert.deepEqual(await conversations.getConversations(), []);
});

const { startTurn, stopTurn, getTurns, forgetTurn } = await import('../src/features/agent-chat/lib/turns.ts');
const { renderMarkdown } = await import('../src/features/agent-chat/lib/markdown.ts');
const { detectAgents } = await import('../src/features/agent-chat/lib/detectAgents.ts');

async function fixture(kind = 'claude') {
  await connections.createConnection({ name: `Test ${kind}`, kind, command: kind === 'custom' ? 'echo' : kind, args: kind === 'custom' ? ['two words'] : [] });
  const connection = (await connections.getConnections()).find((item) => item.name === `Test ${kind}`);
  const conversation = await conversations.createConversation(connection.id);
  return { connection, id: conversation.id };
}

function processFixture() {
  const processes = [];
  globalThis.agentChatRun = async (command, args, output) => {
    let exit;
    const exited = new Promise((resolve) => { exit = resolve; });
    const process = { command, args, output, exit, exited, kill: async () => exit({ code: null, killed: true }) };
    processes.push(process);
    return process;
  };
  return processes;
}

async function invoke(connection, id, session = null, message = 'hello') {
  const events = [];
  let resolve;
  const done = new Promise((finish) => { resolve = finish; });
  const handle = await runTurn(connection, id, session, message, [], undefined, (event) => {
    events.push(event);
    if (event.type === 'done' || event.type === 'error') resolve(event);
  });
  return { events, done, handle };
}

async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail('Timed out waiting for turn state');
}

test('Claude parses split lines, tool arguments/results, trailing result, usage and resume without changing confirmed flags', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture();
  const turn = await invoke(connection, id, 'old-session');
  const process = processes[0];
  assert.equal(process.args[process.args.indexOf('--resume') + 1], 'old-session');
  assert.deepEqual(JSON.parse(process.args[process.args.indexOf('--mcp-config') + 1]), { mcpServers: { mneme: { type: 'http', url: `http://127.0.0.1:7890/mcp?conversation=${id}` } } });
  const lines = [
    { type: 'system', session_id: 'new-session' },
    { type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'internal', name: 'ToolSearch', input: {} } } },
    { type: 'stream_event', event: { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tool-1', name: 'mcp__mneme__list_courses', input: {} } } },
    { type: 'stream_event', event: { index: 1, delta: { type: 'input_json_delta', partial_json: '{"query":' } } },
    { type: 'stream_event', event: { index: 1, delta: { type: 'input_json_delta', partial_json: '"biology"}' } } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: [{ type: 'text', text: 'Biology' }] }] } },
    { type: 'stream_event', event: { delta: { type: 'text_delta', text: 'Partial' } } },
    { type: 'result', result: '**Complete**', session_id: 'new-session', usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.01 },
  ];
  const output = lines.map((line) => JSON.stringify(line)).join('\n');
  for (let index = 0; index < output.length; index += 7) process.output({ stream: 'stdout', data: output.slice(index, index + 7) });
  assert.ok(turn.events.some((event) => event.type === 'text' && event.text === 'Partial'));
  assert.equal(turn.events.some((event) => event.type === 'done'), false);
  process.exit({ code: 0, killed: false });
  assert.deepEqual(await turn.done, { type: 'done', text: '**Complete**' });
  const saved = await messages.getMessages(id);
  assert.deepEqual(saved.map((message) => message.role), ['user', 'tool', 'assistant']);
  const tool = JSON.parse(saved[1].content);
  assert.equal(tool.name, 'list_courses');
  assert.equal(tool.input, '{"query":"biology"}');
  assert.ok(tool.result.includes('Biology'));
  assert.equal((await conversations.getConversation(id)).external_session_id, 'new-session');
  assert.equal((await usage.getUsageSummary(connection.id)).total_cost, 0.01);
});

test('custom output stays raw, literal argv is preserved, and nonzero exit preserves partial output plus error', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture('custom');
  const turn = await invoke(connection, id, 'ignored-session', 'hello; $(not-shell)');
  const process = processes[0];
  assert.deepEqual(process.args, ['two words', 'hello; $(not-shell)']);
  process.output({ stream: 'stdout', data: '  {"raw":true}\n' });
  process.output({ stream: 'stderr', data: 'real failure' });
  assert.deepEqual(turn.events, [{ type: 'text', text: '  {"raw":true}' }]);
  process.exit({ code: 3, killed: false });
  assert.deepEqual(await turn.done, { type: 'error', message: 'real failure' });
  assert.deepEqual((await messages.getMessages(id)).slice(-2).map((message) => message.content), ['{"raw":true}', 'real failure']);
  assert.equal((await conversations.getConversation(id)).external_session_id, null);
  assert.equal((await usage.getUsageSummary(connection.id)).total_cost, null);
});

test('tool failures retain their status in live events and saved history', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture();
  const turn = await invoke(connection, id);
  for (const line of [
    { type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'failed-tool', name: 'mcp__mneme__get_page', input: { id: 99 } } } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'failed-tool', content: 'Page not found', is_error: true }] } },
    { type: 'result', result: 'That page could not be found.' },
  ]) processes[0].output({ stream: 'stdout', data: JSON.stringify(line) + '\n' });
  processes[0].exit({ code: 0, killed: false });
  await turn.done;
  assert.equal(turn.events.filter((event) => event.type === 'tool').at(-1).tool.isError, true);
  assert.equal(JSON.parse((await messages.getMessages(id)).find((message) => message.role === 'tool').content).isError, true);
});

test('Markdown code and tables preserve content, alignment and escaping while streaming', () => {
  const html = renderMarkdown('```html\n<button data-copy-code onclick="alert(1)">unsafe</button>\n```\n\n| Item | Count |\n| :--- | ---: |\n| **Pages** | 2 |');
  assert.ok(html.includes('&lt;button data-copy-code onclick=&quot;alert(1)&quot;&gt;'));
  assert.equal((html.match(/<button /g) ?? []).length, 1);
  assert.ok(html.includes('scope="col"'));
  assert.ok(html.includes('class="text-right'));
  assert.ok(html.includes('<strong>Pages</strong>'));
  const partial = renderMarkdown('```typescript\nconst title = "<script>";');
  assert.ok(partial.includes('&lt;script&gt;'));
  assert.ok(partial.includes('</code></pre></figure>'));
});

test('stop preserves partial text; result errors and incomplete Claude exits are surfaced', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture();
  const stopped = await invoke(connection, id);
  processes[0].output({ stream: 'stdout', data: JSON.stringify({ type: 'stream_event', event: { delta: { type: 'text_delta', text: 'Partial' } } }) + '\n' });
  await stopped.handle.kill();
  assert.equal((await stopped.done).message, 'Generation stopped.');
  assert.equal((await messages.getMessages(id)).at(-2).content, 'Partial');
  const failed = await invoke(connection, id);
  processes[1].output({ stream: 'stdout', data: JSON.stringify({ type: 'result', is_error: true, errors: ['Rate limit'], session_id: 'failed-session' }) });
  processes[1].exit({ code: 0, killed: false });
  assert.equal((await failed.done).message, 'Rate limit');
  const incomplete = await invoke(connection, id);
  processes[2].exit({ code: 0, killed: false });
  assert.match((await incomplete.done).message, /without completing/);
});

test('turn store blocks duplicate send, retains completed transcripts, and refreshes session from storage', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture();
  await startTurn(id, 'first');
  await startTurn(id, 'duplicate');
  assert.equal(processes.length, 1);
  assert.throws(() => forgetTurn(id), /Stop generating/);
  processes[0].output({ stream: 'stdout', data: JSON.stringify({ type: 'result', result: 'answer', session_id: 'resume-me' }) });
  processes[0].exit({ code: 0, killed: false });
  await until(() => !getTurns().get(id).busy);
  assert.equal(getTurns().get(id).messages.at(-1).content, 'answer');
  await startTurn(id, 'follow-up');
  assert.ok(processes[1].args.includes('resume-me'));
  await stopTurn(id);
  await until(() => !getTurns().get(id).busy);
  assert.equal(getTurns().get(id).error, 'Generation stopped.');
  forgetTurn(id);
  assert.equal(getTurns().has(id), false);
  assert.equal((await usage.getUsageSummary(connection.id)).invocation_count > 0, true);
});

test('spawn failure releases busy state and preserves an inline error', async () => {
  const { id } = await fixture('custom');
  globalThis.agentChatRun = async () => { throw new Error('Executable not found'); };
  await startTurn(id, 'test');
  assert.equal(getTurns().get(id).busy, false);
  assert.equal(getTurns().get(id).messages.at(-1).content, 'Executable not found');
});

test('Codex gets Mneme MCP tools without approval prompts', async () => {
  const processes = processFixture();
  const { connection, id } = await fixture('codex');
  const turn = await invoke(connection, id, null, 'List my courses.');
  const process = processes[0];
  assert.ok(process.args.includes('--dangerously-bypass-approvals-and-sandbox'));
  assert.ok(process.args.includes('--ignore-user-config'));
  assert.equal(process.args[process.args.indexOf('mcp_servers.mneme.type="http"')], 'mcp_servers.mneme.type="http"');
  assert.ok(process.args.includes(`mcp_servers.mneme.url="http://127.0.0.1:7890/mcp?conversation=${id}"`));
  process.output({ stream: 'stdout', data: JSON.stringify({ type: 'thread.started', thread_id: 'codex-thread' }) + '\n' });
  process.output({ stream: 'stdout', data: JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Your courses are ready.' } }) + '\n' });
  process.output({ stream: 'stdout', data: JSON.stringify({ type: 'turn.completed' }) + '\n' });
  process.exit({ code: 0, killed: false });
  assert.deepEqual(await turn.done, { type: 'done', text: 'Your courses are ready.' });
  assert.equal((await conversations.getConversation(id)).external_session_id, 'codex-thread');
  const resumed = await invoke(connection, id, 'codex-thread', 'What else is there?');
  const resumedProcess = processes[1];
  assert.ok(resumedProcess.args.includes('resume'));
  assert.ok(resumedProcess.args.includes('--dangerously-bypass-approvals-and-sandbox'));
  assert.ok(resumedProcess.args.includes(`mcp_servers.mneme.url="http://127.0.0.1:7890/mcp?conversation=${id}"`));
  resumedProcess.output({ stream: 'stdout', data: JSON.stringify({ type: 'turn.completed' }) + '\n' });
  resumedProcess.exit({ code: 0, killed: false });
  assert.deepEqual(await resumed.done, { type: 'done', text: '' });
});

test('agent detection lists five presets; final Markdown escapes HTML, unsafe links and images', async () => {
  const commands = [];
  globalThis.agentChatRun = async (command, args) => {
    commands.push(command);
    assert.deepEqual(args, ['--version']);
    if (command === 'gemini') throw new Error('Not found');
    return { exited: Promise.resolve({ code: 0, killed: false }) };
  };
  const detected = await detectAgents();
  assert.equal(detected.length, 5);
  assert.equal(detected.find((agent) => agent.kind === 'gemini').installed, false);
  assert.ok(commands.includes('copilot') && commands.includes('cursor-agent'));
  const html = renderMarkdown('**Bold** <img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29) ![image](https://example.com/image.png) [safe](https://example.com)');
  assert.ok(html.includes('<strong>Bold</strong>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});


test('stop requested before spawn returns kills the eventual process and returns the conversation to idle', async () => {
  const { id } = await fixture('custom');
  let resolveHandle;
  let exit;
  let kills = 0;
  globalThis.agentChatRun = () => new Promise((resolve) => { resolveHandle = resolve; });
  const starting = startTurn(id, 'cancel during launch');
  await until(() => Boolean(resolveHandle));
  await stopTurn(id);
  assert.equal(getTurns().get(id).stopping, true);
  resolveHandle({ exited: new Promise((resolve) => { exit = resolve; }), kill: async () => { kills++; exit({ code: null, killed: true }); } });
  await starting;
  await until(() => !getTurns().get(id).busy);
  assert.equal(kills, 1);
  assert.equal(getTurns().get(id).error, 'Generation stopped.');
});
