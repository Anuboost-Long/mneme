import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

async function moduleUrl(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  for (const name of ['react/jsx-runtime', 'react', 'clsx']) {
    outputText = outputText.replaceAll(`from "${name}"`, `from "${import.meta.resolve(name)}"`);
  }
  if (outputText.includes('from "./Typography"')) {
    outputText = outputText.replace('from "./Typography"', `from "${await moduleUrl('../src/shared/ui/Typography.tsx')}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}

const { TextInput, TextArea } = await import(await moduleUrl('../src/shared/ui/Input.tsx'));
const { PageTitle, SectionTitle, BodyText, Caption } = await import(await moduleUrl('../src/shared/ui/Typography.tsx'));

test('fields associate labels, hints, errors and external descriptions with unique controls', () => {
  const html = renderToStaticMarkup(createElement('form', null,
    createElement(TextInput, { label: 'Name', required: true, hint: 'Use the course name.', error: 'Enter a name.', 'aria-describedby': 'external', name: 'name' }),
    createElement(TextArea, { label: 'Description', name: 'description', defaultValue: 'Initial notes' }),
  ));
  const input = html.match(/<input[^>]*>/)[0];
  const textarea = html.match(/<textarea[^>]*>/)[0];
  const inputId = input.match(/id="([^"]+)"/)[1];
  const textareaId = textarea.match(/id="([^"]+)"/)[1];
  assert.notEqual(inputId, textareaId);
  assert.ok(html.includes(`for="${inputId}"`));
  assert.ok(html.includes(`for="${textareaId}"`));
  assert.ok(input.includes(`aria-describedby="external ${inputId}-hint ${inputId}-error"`));
  assert.ok(input.includes('aria-invalid="true"'));
  assert.ok(input.includes('required=""'));
  assert.ok(html.includes(`id="${inputId}-hint"`));
  assert.ok(html.includes(`id="${inputId}-error"`));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('Initial notes</textarea>'));
  assert.ok(!textarea.includes(' aria-invalid='));
  assert.ok(!textarea.includes(' aria-describedby='));
});

test('fields preserve supplied IDs and native control properties', () => {
  const html = renderToStaticMarkup(createElement(TextInput, {
    id: 'email', label: 'Email', type: 'email', name: 'email', disabled: true,
    readOnly: true, defaultValue: 'student@example.com', 'aria-invalid': true,
    'aria-describedby': 'external', autoComplete: 'email',
  }));
  for (const attribute of ['for="email"', 'id="email"', 'type="email"', 'name="email"', 'disabled=""', 'readOnly=""', 'value="student@example.com"', 'aria-invalid="true"', 'aria-describedby="external"', 'autoComplete="email"']) {
    assert.ok(html.includes(attribute), attribute);
  }
});

test('typography keeps heading hierarchy and supports semantic overrides', () => {
  for (const [Component, props, tag] of [
    [PageTitle, {}, 'h1'], [SectionTitle, {}, 'h2'], [SectionTitle, { as: 'h3' }, 'h3'],
    [BodyText, {}, 'p'], [Caption, { as: 'span' }, 'span'],
  ]) {
    const html = renderToStaticMarkup(createElement(Component, { ...props, id: 'text' }, 'Learning'));
    assert.ok(html.startsWith(`<${tag} `));
    assert.ok(html.includes('id="text"'));
    assert.ok(html.endsWith(`Learning</${tag}>`));
  }
});
