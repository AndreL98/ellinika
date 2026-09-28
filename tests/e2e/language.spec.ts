import { expect, test } from '@playwright/test';
import { finishLesson } from './helpers';

test('the learning language can be switched, is remembered and has its own progress', async ({ page }) => {
  await page.goto('./');
  const greek = page.getByRole('radio', { name: 'Griechisch' });
  const russian = page.getByRole('radio', { name: 'Russisch' });
  await expect(greek).toBeChecked();

  // A Greek lesson earns a crown for Greek only.
  await page.getByRole('button', { name: 'Lektion starten' }).click();
  await finishLesson(page, 'el');
  await page.getByRole('button', { name: 'Zurück zum Lernpfad' }).click();
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('1 von 3 Kronen');

  await russian.check();
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('0 von 3 Kronen');
  await page.getByRole('button', { name: 'Lektion starten' }).click();
  await expect(page.locator('[data-prompt] .learn-text, .options .learn-text, .pairs .learn-text').first()).toHaveAttribute('lang', 'ru');
  await finishLesson(page, 'ru');
  await expect(page.getByText('скрыто')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zurück zum Lernpfad' }).click();
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('1 von 3 Kronen');
  await expect(page.locator('.stat-xp')).toHaveText('⭐ 30 XP');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Russisch' })).toBeChecked();
  await greek.check();
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('1 von 3 Kronen');
});
