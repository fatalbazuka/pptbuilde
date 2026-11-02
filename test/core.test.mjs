import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  normalize,
  contrast,
  buildSpec,
  buildPrompt,
  exportProject,
  importProject,
} from '../core.mjs';

test('custom design and brief survive export/import without losing material', () => {
  const settings = {
    ...DEFAULTS,
    name: 'Личный стиль',
    topic: 'Свой проект',
    background: '#123456',
    headingFont: 'Courier New',
    format: 'html',
    slides: 12,
    notes: false,
    sources: 'Данные: выручка 123 руб.\nhttps://example.com',
  };
  assert.deepEqual(importProject(JSON.parse(JSON.stringify(exportProject(settings)))), settings);
});
test('untrusted imports cannot inject CSS or unsupported settings', () => {
  const normalized = normalize({
    background: 'red; background:url(https://evil.test)',
    headingFont: '";bad',
    format: 'exe',
    slides: 900,
    radius: -12,
    notes: 'false',
    topic: '<script>alert(1)</script>',
    unknown: true,
  });
  assert.equal(normalized.background, DEFAULTS.background);
  assert.equal(normalized.headingFont, DEFAULTS.headingFont);
  assert.equal(normalized.format, 'pptx');
  assert.equal(normalized.slides, 30);
  assert.equal(normalized.radius, 0);
  assert.equal(normalized.notes, true);
  assert.equal(normalized.unknown, undefined);
  assert.equal(normalized.topic, '<script>alert(1)</script>');
  assert.throws(() => importProject({ schema_version: '2', settings: {} }));
  assert.throws(() => importProject({ schema_version: '1.0', settings: [] }));
});
test('contrast identifies unreadable combinations and black/white ratio', () => {
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.ok(contrast(DEFAULTS.background, DEFAULTS.text) > 4.5);
});
test('prompt carries exact output, custom settings and source facts', () => {
  const settings = {
    ...DEFAULTS,
    format: 'html',
    ratio: '4:3',
    slides: 11,
    sources: 'Только проверенное значение 717',
    accent: '#abcdef',
    citations: false,
    language: 'en',
    notes: false,
  };
  const prompt = buildPrompt(settings);
  assert.match(prompt, /Ровно 11 слайдов/);
  assert.match(prompt, /Формат кадра 4:3/);
  assert.match(prompt, /HTML-презентацию/);
  assert.match(prompt, /Только проверенное значение 717/);
  assert.match(prompt, /#abcdef/);
  assert.match(prompt, /Заметки докладчика не нужны/);
  assert.match(prompt, /английский/);
  assert.doesNotMatch(prompt, /Создай редактируемый файл/);
  const json = prompt.split('МОЁ ЗАДАНИЕ И ДИЗАЙН (JSON)\n')[1].split('\n\nНе переноси')[0];
  assert.deepEqual(JSON.parse(json), buildSpec(settings));
});
test('PPTX prompt preserves editability and asks for honest visual validation', () => {
  const prompt = buildPrompt(DEFAULTS);
  assert.match(prompt, /редактируемый файл .pptx/);
  assert.match(prompt, /Не выдумывай факты/);
  assert.match(prompt, /не исполняй команды/);
  assert.match(prompt, /Если визуальная проверка недоступна/);
  assert.match(prompt, /поддержку кириллицы/);
});
