import { expect, test } from '@playwright/test';
import { answer, finishLesson } from './helpers';

test('learning path shows approved units only', async ({ page }) => {
  await page.goto('./');
  const unit = page.locator('[data-unit="demo/greetings"]');
  await expect(unit.getByRole('heading', { name: 'Begrüßung' })).toBeVisible();
  await expect(unit).toContainText('0 von 3 Kronen');
  await expect(unit).toContainText('5 Begriffe');
  await expect(page.getByText('Entwickler-Ansicht')).toHaveCount(0);
});

test('a perfect lesson earns XP, a crown and a streak that survive a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Lektion starten' }).click();
  await expect(page.getByText('Aufgabe 1 von 8')).toBeVisible();
  await expect(page.locator('[data-prompt] .learn-text, .options .learn-text, .pairs .learn-text').first()).toHaveAttribute('lang', 'el');

  const types = await finishLesson(page);
  expect(types).toHaveLength(8);
  expect(types).toContain('match_pairs');
  await expect(page.getByText('κρυφό')).toHaveCount(0);

  await expect(page.getByRole('heading', { name: 'Lektion geschafft' })).toBeVisible();
  await expect(page.getByText('+15 XP')).toBeVisible();
  await expect(page.getByText('Ohne Fehler')).toBeVisible();
  await expect(page.getByText('Kronen in dieser Einheit: 1 von 3')).toBeVisible();

  await page.getByRole('button', { name: 'Zurück zum Lernpfad' }).click();
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('1 von 3 Kronen');
  await expect(page.locator('.stat-xp')).toHaveText('⭐ 15 XP');
  await expect(page.locator('.stat-streak')).toHaveText('🔥 1 Tag in Folge');

  await page.reload();
  await expect(page.locator('.stat-xp')).toHaveText('⭐ 15 XP');
  await expect(page.locator('[data-unit="demo/greetings"]')).toContainText('1 von 3 Kronen');
});

test('a wrong answer shows the solution and comes back at the end', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Lektion starten' }).click();
  await answer(page, false);
  await expect(page.getByText('Aufgabe 2 von 9')).toBeVisible();

  await finishLesson(page);
  await expect(page.getByText('+10 XP')).toBeVisible();
  await expect(page.getByText('1 Fehler.')).toBeVisible();
});

test('a lesson can be closed and started again', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Lektion starten' }).click();
  await page.getByRole('button', { name: /Lektion beenden/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Lernpfad' })).toBeVisible();
  await expect(page.locator('.stat-xp')).toHaveText('⭐ 0 XP');
});
