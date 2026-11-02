import {
  DEFAULTS,
  FONTS,
  normalize,
  contrast,
  buildSpec,
  buildPrompt,
  exportProject,
  importProject,
} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = 'pptbuilder.project.v1';
let state = { ...DEFAULTS },
  selectedSlide = 'cover',
  outputView = 'prompt',
  saveTimer,
  toastTimer,
  storageWarning = false;
let startupMessage = '';
try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) state = importProject(JSON.parse(saved));
} catch {
  startupMessage = 'Не удалось прочитать сохранённый проект. Открыты начальные настройки.';
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function persist() {
  clearTimeout(saveTimer);
  $('#save-status').textContent = 'Сохраняем…';
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(exportProject(state)));
      $('#save-status').textContent = 'Сохранено';
    } catch {
      $('#save-status').textContent = 'Не сохранено';
      if (!storageWarning)
        toast('Хранилище браузера недоступно. Сохраните проект через экспорт JSON.');
      storageWarning = true;
    }
  }, 300);
}

for (const [key, label] of Object.entries({
  background: 'Фон',
  text: 'Текст',
  accent: 'Акцент',
  secondary: 'Дополнительный',
})) {
  const row = document.createElement('div');
  row.className = 'color-row';
  row.innerHTML = `<div class="color-well"><input type="color" id="color-${key}" data-color="${key}" aria-label="${label}: выбрать цвет"></div><label for="hex-${key}">${label}</label><input class="hex" id="hex-${key}" data-hex="${key}" maxlength="7" spellcheck="false" aria-label="${label}: HEX-код" pattern="#[a-fA-F0-9]{6}">`;
  $('#palette-fields').append(row);
}
for (const select of [$('#heading-font'), $('#body-font')]) {
  for (const font of FONTS) {
    const option = new Option(font, font);
    option.style.fontFamily = font;
    select.add(option);
  }
}

function syncControls() {
  for (const field of $('#settings').elements) {
    if (!field.name || !(field.name in state)) continue;
    if (field.type === 'checkbox') field.checked = state[field.name];
    else field.value = state[field.name];
  }
  for (const field of $$('[data-color]')) field.value = state[field.dataset.color];
  for (const field of $$('[data-hex]')) {
    field.value = state[field.dataset.hex];
    field.removeAttribute('aria-invalid');
  }
}

const translations = {
  ru: {
    category: 'ПРЕЗЕНТАЦИЯ',
    issue: 'ИЗДАНИЕ 01',
    kicker: 'ОТ ИДЕИ К РЕЗУЛЬТАТУ',
    subtitle: 'Ясная мысль. Выразительная форма. История, которую хочется услышать.',
    art: 'Место для фотографии',
    photo: 'ФОТО / ПРИМЕР КОМПОЗИЦИИ',
    illustration: 'Место для иллюстрации',
    typographic: 'Типографический акцент',
    footer: 'Ваш взгляд на привычные вещи',
    content: 'Форма поддерживает смысл',
    item1: 'Начните с главного',
    item2: 'Оставьте пространство',
    detail1: 'Один ясный тезис помогает зрителю понять, что действительно важно.',
    detail2: 'Поля, ритм и иерархия направляют внимание, не отвлекая от содержания.',
    extra: 'Раскройте мысль примером и объясните, как она связана с решением.',
    dataTitle: 'Пусть данные расскажут историю',
    dataCopy: 'Главный показатель заметен сразу. Детали помогают увидеть контекст.',
    sample: 'Условные данные для демонстрации стиля',
    periods: ['Этап 1', 'Этап 2', 'Этап 3'],
  },
  en: {
    category: 'PRESENTATION',
    issue: 'EDITION 01',
    kicker: 'FROM IDEA TO OUTCOME',
    subtitle: 'A clear thought. An expressive form. A story worth listening to.',
    art: 'A place for photography',
    photo: 'PHOTO / LAYOUT EXAMPLE',
    illustration: 'A place for illustration',
    typographic: 'A typographic statement',
    footer: 'A fresh perspective on familiar things',
    content: 'Form supports meaning',
    item1: 'Start with what matters',
    item2: 'Leave room to think',
    detail1: 'One clear idea helps your audience understand what really matters.',
    detail2: 'Space, rhythm and hierarchy guide attention without distracting from the story.',
    extra: 'Use an example to explain the idea and connect it to a decision.',
    dataTitle: 'Let the data tell a story',
    dataCopy: 'The key number is visible at a glance. Details put it in context.',
    sample: 'Illustrative data for the style preview',
    periods: ['Stage 1', 'Stage 2', 'Stage 3'],
  },
};

function renderSlide() {
  const slide = $('#slide');
  const t = translations[state.language];
  slide.className = `slide ${state.alignment === 'center' ? 'center' : ''} ${state.composition === 'minimal' ? 'minimal' : ''} ${state.composition === 'grid' ? 'grid-layout' : ''} ${state.density === 'high' ? 'dense' : state.density === 'medium' ? 'medium' : ''}`;
  slide.style.aspectRatio = state.ratio.replace(':', '/');
  $('#stage').style.setProperty('--aspect', state.ratio === '16:9' ? '1.7778' : '1.3333');
  const cover = `<div class="cover-grid"><div class="cover-copy"><p class="slide-kicker" data-text="kicker"></p><h2 id="cover-title"></h2><p class="slide-description" data-text="subtitle"></p></div><div class="cover-art art-${state.imagery}" aria-hidden="true"><span class="art-index">01</span><span class="art-orbit"></span><span class="art-orbit second"></span><span class="art-block"></span>${state.imagery === 'typographic' ? '<span class="art-large">Aa</span>' : ''}<span class="art-caption" id="art-caption"></span></div></div>`;
  const content = `<h2 class="content-heading" data-text="content"></h2><div class="content-grid"><div><div class="content-number">01</div><h3 data-text="item1"></h3><p data-text="detail1"></p>${state.density !== 'low' ? '<p class="extra-detail" data-text="extra"></p>' : ''}</div><div><div class="content-number">02</div><h3 data-text="item2"></h3><p data-text="detail2"></p>${state.density === 'high' ? '<p class="extra-detail" data-text="extra"></p>' : ''}</div></div>`;
  const data = `<h2 class="content-heading" data-text="dataTitle"></h2><div class="data-grid"><div><div class="data-value">+42%</div><p class="data-copy" data-text="dataCopy"></p></div><div role="img" aria-label="Демонстрационный график: 38, 55, 78"><div class="chart"><div class="chart-column"><span class="chart-value">38</span><span class="chart-bar" style="height:40%"></span></div><div class="chart-column"><span class="chart-value">55</span><span class="chart-bar" style="height:58%"></span></div><div class="chart-column"><span class="chart-value">78</span><span class="chart-bar" style="height:81%"></span></div></div><div class="chart-labels"><span id="period-0"></span><span id="period-1"></span><span id="period-2"></span></div></div></div>`;
  const number = { cover: '01', content: '02', data: '03' }[selectedSlide];
  slide.innerHTML = `<div class="slide-inner"><div class="slide-meta"><span><i class="line-mark"></i><span data-text="category"></span></span><span data-text="issue"></span></div>${{ cover, content, data }[selectedSlide]}<div class="slide-footer"><span id="slide-footer-text"></span><span>${number} / 03</span></div></div>`;
  for (const element of slide.querySelectorAll('[data-text]'))
    element.textContent = t[element.dataset.text];
  if (selectedSlide !== 'cover')
    slide
      .querySelector('h2')
      .style.setProperty('font-size', `calc(${state.titleSize} * .0776cqw)`, 'important');
  $('#slide-footer-text').textContent = selectedSlide === 'data' ? t.sample : t.footer;
  if (selectedSlide === 'cover') {
    const title =
      state.topic.trim() ||
      (state.language === 'ru' ? 'Ваша следующая большая идея' : 'Your next big idea');
    const titleEl = $('#cover-title');
    const previewTitle = title.length > 90 ? `${title.slice(0, 87)}…` : title;
    const words = previewTitle.split(/\s+/);
    if (words.length >= 3) {
      const last = words.splice(-2).join(' ');
      titleEl.append(document.createTextNode(`${words.join(' ')} `));
      const accent = document.createElement('span');
      accent.className = 'accent-word';
      accent.textContent = last;
      titleEl.append(accent);
    } else titleEl.textContent = previewTitle;
    titleEl.style.fontSize = `calc(${state.titleSize} * ${title.length > 60 ? '.08' : '.108'}cqw)`;
    $('#art-caption').textContent =
      state.imagery === 'editorial'
        ? t.art
        : state.imagery === 'illustration'
          ? t.illustration
          : t.typographic;
  }
  if (selectedSlide === 'data')
    t.periods.forEach((value, i) => {
      $(`#period-${i}`).textContent = value;
    });
  $('#slide-counter').textContent = `${number} / 03`;
  for (const button of $$('[data-slide]')) {
    const active = button.dataset.slide === selectedSlide;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('.mini-slide').style.aspectRatio = state.ratio.replace(':', '/');
  }
}

function updateOutput() {
  $('#prompt-text').value =
    outputView === 'json' ? JSON.stringify(buildSpec(state), null, 2) : buildPrompt(state);
  for (const button of $$('[data-view]'))
    button.setAttribute('aria-pressed', String(button.dataset.view === outputView));
}
function render() {
  const root = document.documentElement;
  for (const key of ['background', 'text', 'accent', 'secondary'])
    root.style.setProperty(`--slide-${key === 'background' ? 'bg' : key}`, state[key]);
  root.style.setProperty(
    '--heading-font',
    `"${state.headingFont}", ${state.headingFont === 'Georgia' ? 'serif' : 'sans-serif'}`,
  );
  root.style.setProperty('--body-font', `"${state.bodyFont}", sans-serif`);
  root.style.setProperty('--slide-radius', `${state.radius}px`);
  root.style.setProperty('--title-size', state.titleSize);
  for (const group of $$('[data-control]')) {
    for (const button of group.querySelectorAll('[data-value]'))
      button.setAttribute(
        'aria-pressed',
        String(state[group.dataset.control] === button.dataset.value),
      );
  }
  $('#title-size-value').value = `${state.titleSize} pt`;
  $('#radius-value').value = `${state.radius} px`;
  $('#slides-value').value = state.slides;
  $('#ratio-label').textContent = state.ratio;
  $('#format-badge').textContent = `.${state.format.toUpperCase()}`;
  const ratio = contrast(state.background, state.text);
  $('#contrast-status').classList.toggle('warning', ratio < 4.5);
  $('#contrast-status').textContent =
    ratio < 4.5
      ? `! Контраст текста ${ratio.toFixed(1)}:1 — попробуйте более тёмный текст или светлый фон.`
      : `✓ Контраст текста ${ratio.toFixed(1)}:1 · хорошо читается`;
  renderSlide();
  updateOutput();
}
function update(patch) {
  state = normalize({ ...state, ...patch });
  render();
  persist();
}

$('#settings').addEventListener('submit', (event) => event.preventDefault());
$('#settings').addEventListener('input', (event) => {
  const field = event.target;
  if (field.dataset.color) {
    update({ [field.dataset.color]: field.value });
    $(`[data-hex="${field.dataset.color}"]`).value = field.value;
    $(`[data-hex="${field.dataset.color}"]`).removeAttribute('aria-invalid');
  } else if (field.dataset.hex) {
    const valid = /^#[\da-f]{6}$/i.test(field.value);
    field.setAttribute('aria-invalid', String(!valid));
    if (valid) {
      update({ [field.dataset.hex]: field.value });
      $(`[data-color="${field.dataset.hex}"]`).value = field.value;
    }
  } else if (field.name && field.name in DEFAULTS) {
    update({
      [field.name]:
        field.type === 'checkbox'
          ? field.checked
          : field.type === 'range'
            ? Number(field.value)
            : field.value,
    });
  }
});
for (const group of $$('[data-control]'))
  group.addEventListener('click', (event) => {
    const button = event.target.closest('[data-value]');
    if (button) update({ [group.dataset.control]: button.dataset.value });
  });

function setTab(name, focus = false) {
  for (const tab of $$('[data-tab]')) {
    const active = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`#panel-${tab.dataset.tab}`).hidden = !active;
    if (active && focus) tab.focus();
  }
  $('#settings').scrollTop = 0;
}
for (const tab of $$('[data-tab]')) {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    const tabs = $$('[data-tab]'),
      index = tabs.indexOf(tab);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setTab(tabs[next].dataset.tab, true);
    }
  });
}
for (const button of $$('[data-slide]'))
  button.addEventListener('click', () => {
    selectedSlide = button.dataset.slide;
    renderSlide();
  });
for (const button of $$('[data-view]'))
  button.addEventListener('click', () => {
    outputView = button.dataset.view;
    updateOutput();
  });

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Скопировано. Вставьте задание в своего агента.');
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    const container = $$('dialog').find((dialog) => dialog.open) || document.body;
    container.append(field);
    field.focus();
    field.select();
    const success = document.execCommand('copy');
    field.remove();
    if (success) toast('Задание скопировано.');
    else {
      if (!$('#prompt-dialog').open) $('#prompt-dialog').showModal();
      updateOutput();
      $('#prompt-text').focus();
      $('#prompt-text').select();
      toast('Скопируйте выделенный текст вручную или скачайте .txt.');
    }
  }
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
$('#copy').addEventListener('click', () => copy(buildPrompt(state)));
$('#dialog-copy').addEventListener('click', () => copy($('#prompt-text').value));
$('#download').addEventListener('click', () => {
  download(buildPrompt(state), 'presentation-prompt.txt', 'text/plain;charset=utf-8');
  toast('Промпт сохранён в текстовый файл.');
});
$('#export').addEventListener('click', () => {
  download(
    JSON.stringify(exportProject(state), null, 2),
    'pptbuilder-project.json',
    'application/json',
  );
  toast('Проект экспортирован: стиль, содержание и настройки.');
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('Файл слишком большой. Максимум — 100 КБ.');
    const project = importProject(JSON.parse(await file.text()));
    state = project;
    syncControls();
    render();
    persist();
    toast('Проект загружен. Можно продолжать.');
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? 'Не удалось прочитать JSON. Текущий проект сохранён.'
        : error.message,
    );
  }
  event.target.value = '';
});
$('#help-open').addEventListener('click', () => $('#help-dialog').showModal());
$('#prompt-open').addEventListener('click', () => {
  updateOutput();
  $('#prompt-dialog').showModal();
});
$('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
$('#reset-confirm').addEventListener('click', () => {
  state = { ...DEFAULTS };
  selectedSlide = 'cover';
  syncControls();
  render();
  persist();
  $('#reset-dialog').close();
  toast('Настройки сброшены. Начните с чистого листа.');
});
for (const button of $$('[data-close]'))
  button.addEventListener('click', () => button.closest('dialog').close());
for (const dialog of $$('dialog'))
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#stage').requestFullscreen) await $('#stage').requestFullscreen();
    else toast('Полноэкранный режим недоступен в этом браузере.');
  } catch {
    toast('Браузер не разрешил полноэкранный режим.');
  }
});
syncControls();
render();
if (startupMessage) toast(startupMessage);
