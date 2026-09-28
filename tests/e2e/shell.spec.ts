import { expect, test } from '@playwright/test';

test('app shell renders in German with correct language attributes', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Logos');
  await expect(page.getByRole('heading', { level: 1, name: 'Logos' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Das Fundament steht' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('skip link moves keyboard focus to the main content', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Zum Inhalt springen' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('app works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Offline verfügbar');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Logos' })).toBeVisible();
});
