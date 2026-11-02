import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('custom settings produce the right prompt, copy, persist and export', async ({
  page,
  context,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('#cover-title')).toContainText('Идеи');
  await mkdir('docs', { recursive: true });
  await page.screenshot({ path: 'docs/preview.png', fullPage: true });
  await page.locator('#hex-background').fill('#14263a');
  await page.locator('#hex-text').fill('#faf7ee');
  await page.locator('#heading-font').selectOption('Arial');
  await expect(page.locator('#slide')).toHaveCSS('background-color', 'rgb(20, 38, 58)');
  await page.getByRole('tab', { name: 'Содержание', exact: true }).click();
  await page.locator('#topic').fill('Проверяем свой дизайн');
  await page.locator('#sources').fill('Факт: 717 клиентов.');
  await page.getByRole('tab', { name: 'Результат', exact: true }).click();
  await page.getByRole('button', { name: 'HTML-слайды', exact: false }).click();
  await page.getByRole('button', { name: '4:3 · классика' }).click();
  await page.locator('#slides').fill('12');
  await page.locator('#copy').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Ровно 12 слайдов');
  expect(copied).toContain('HTML-презентацию');
  expect(copied).toContain('#14263a');
  expect(copied).toContain('Факт: 717 клиентов.');
  await expect(page.locator('#save-status')).toHaveText('Сохранено');
  await page.reload();
  await expect(page.locator('#cover-title')).toHaveText('Проверяем свой дизайн');
  await expect(page.locator('#format-badge')).toHaveText('.HTML');
  await page.locator('#prompt-open').click();
  await page.getByRole('button', { name: 'Только JSON', exact: true }).click();
  const spec = JSON.parse(await page.locator('#prompt-text').inputValue());
  expect(spec.output).toMatchObject({ format: 'html', aspect_ratio: '4:3' });
  expect(spec.brief.slides).toBe(12);
  expect(spec.design.typography.heading_font).toBe('Arial');
  await page.keyboard.press('Escape');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  expect((await downloadPromise).suggestedFilename()).toBe('pptbuilder-project.json');
  expect(errors).toEqual([]);
});

test('invalid imports preserve the project and HTML in content stays inert', async ({ page }) => {
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.locator('#toast')).toContainText('Не удалось прочитать JSON');
  await expect(page.locator('#cover-title')).toContainText('Идеи');
  await page.getByRole('tab', { name: 'Содержание', exact: true }).click();
  await page.locator('#topic').fill('<img src=x onerror="window.INJECTED=true">');
  await expect(page.locator('#cover-title')).toContainText('<img');
  expect(await page.evaluate(() => window.INJECTED)).toBeUndefined();
  await page.locator('#import-file').setInputFiles({
    name: 'project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        settings: {
          topic: 'Импортированный проект',
          accent: '#aa1122',
          language: 'en',
          format: 'html',
        },
      }),
    ),
  });
  await expect(page.locator('#cover-title')).toHaveText('Импортированный проект');
  await expect(page.locator('#format-badge')).toHaveText('.HTML');
});

test('all previews, low contrast warning, keyboard tabs and reset work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '02 Содержание' }).click();
  await expect(page.locator('.content-heading')).toHaveText('Форма поддерживает смысл');
  await page.getByRole('button', { name: '03 Данные' }).click();
  await expect(page.locator('.chart-column')).toHaveCount(3);
  await page.locator('#hex-text').fill('#f5f1e9');
  await expect(page.locator('#contrast-status')).toContainText('попробуйте');
  await page.locator('#tab-design').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-content')).toBeFocused();
  await expect(page.locator('#panel-content')).toBeVisible();
  await page.locator('#reset').click();
  await page.locator('#reset-confirm').click();
  await expect(page.locator('#cover-title')).toContainText('Идеи');
  await expect(page.locator('#contrast-status')).toContainText('хорошо читается');
});

test('mobile layout fits and keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#cover-title')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.locator('#copy').scrollIntoViewIfNeeded();
  await expect(page.locator('#copy')).toBeVisible();
  await page.getByRole('tab', { name: 'Результат', exact: true }).click();
  await page.getByRole('button', { name: '4:3 · классика' }).click();
  await expect(page.locator('#slide')).toHaveCSS('aspect-ratio', '4 / 3');
});
