import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { askAssistant, openAssistant, subscribeAssistant } = await import('../src/features/agent-chat/lib/assistant.ts');
const { getConversations } = await import('../src/features/agent-chat/lib/conversation/actions.ts');
await initDb();

test('asking with no agent connected says how to fix it and starts nothing', async () => {
  const events = [];
  const stop = subscribeAssistant((event) => events.push(event));
  await askAssistant('What drives an attacker?', null);
  openAssistant();
  stop();
  assert.deepEqual(events, [
    { conversationId: null, error: 'No agent connected yet. Add one in Chat, then ask again.' },
    { conversationId: null }
  ]);
  assert.equal((await getConversations()).length, 0);
});
