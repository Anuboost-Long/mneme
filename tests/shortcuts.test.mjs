import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { comboFromEvent, defaultBindings, formatCombo, shortcutProblem } = await import('../src/shared/lib/shortcuts/types.ts');
const { getShortcutOverrides, saveShortcutOverrides } = await import('../src/shared/lib/shortcuts/actions.ts');
await initDb();

const press = (code, key, modifiers = {}) => ({ code, key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...modifiers });

test('a key press becomes a combo by physical key, ignoring a bare modifier', () => {
  assert.equal(comboFromEvent(press('KeyP', 'p', { ctrlKey: true })), 'Mod+P');
  assert.equal(comboFromEvent(press('KeyA', 'å', { ctrlKey: true, altKey: true, shiftKey: true })), 'Mod+Alt+Shift+A');
  assert.equal(comboFromEvent(press('Digit7', '&', { ctrlKey: true, shiftKey: true })), 'Mod+Shift+7');
  assert.equal(comboFromEvent(press('Backslash', '\\', { ctrlKey: true })), 'Mod+\\');
  assert.equal(comboFromEvent(press('ShiftLeft', 'Shift', { shiftKey: true })), null);
  assert.equal(formatCombo('Mod+Shift+A'), 'Ctrl+Shift+A');
});

test('a shortcut is refused when it has no modifier, is reserved, or is already taken', () => {
  assert.match(shortcutProblem('new-page', 'N', defaultBindings), /so the shortcut doesn’t fire while you type/);
  assert.match(shortcutProblem('new-page', 'Mod+B', defaultBindings), /is already Bold/);
  assert.match(shortcutProblem('new-page', 'Mod+P', defaultBindings), /already does “Open the command palette”/);
  assert.equal(shortcutProblem('command-palette', 'Mod+P', defaultBindings), null);
  assert.equal(shortcutProblem('new-page', 'Mod+Alt+N', defaultBindings), null);
  assert.equal(shortcutProblem('new-page', 'F5', defaultBindings), null);
});

test('changed shortcuts are saved and read back, and unknown or broken entries are dropped', async () => {
  assert.deepEqual(await getShortcutOverrides(), {});
  await saveShortcutOverrides({ 'new-page': 'Mod+Alt+N' });
  assert.deepEqual(await getShortcutOverrides(), { 'new-page': 'Mod+Alt+N' });
  const { putSetting } = await import('../src/shared/lib/settings/actions.ts');
  await putSetting('keyboard.shortcuts', JSON.stringify({ 'new-page': 'Mod+Alt+N', 'not-a-shortcut': 'Mod+J', 'find-in-page': 5 }));
  assert.deepEqual(await getShortcutOverrides(), { 'new-page': 'Mod+Alt+N' });
  await putSetting('keyboard.shortcuts', '{broken');
  assert.deepEqual(await getShortcutOverrides(), {});
});
