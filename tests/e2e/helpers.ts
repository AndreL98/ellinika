import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import { tokenize } from '../../app/src/engine/tokens';

type Texts = { items: Record<string, { text?: string; meaning?: string }> };
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Texts;
const de = read('../fixtures/packs-e2e/demo/gloss/de.json');

/** Dictionary of the e2e test pack per learning language: text → German meaning and back. */
function dictionary(lang: string) {
  const texts = read(`../fixtures/packs-e2e/demo/${lang}.json`);
  const meaningOf = new Map<string, string>();
  const textOf = new Map<string, string>();
  for (const [id, entry] of Object.entries(texts.items)) {
    const meaning = de.items[id]?.meaning;
    if (entry.text && meaning) {
      meaningOf.set(entry.text, meaning);
      textOf.set(meaning, entry.text);
    }
  }
  return { meaningOf, textOf };
}
const dictionaries = { el: dictionary('el'), ru: dictionary('ru') };
type Lang = keyof typeof dictionaries;

const lookup = (map: Map<string, string>, key: string) => {
  const value = map.get(key.trim());
  if (!value) throw new Error(`No fixture entry for "${key}"`);
  return value;
};

async function clickTiles(exercise: Locator, tokens: string[]) {
  for (const token of tokens) {
    await exercise.locator('.tiles-bank button:not([disabled])', { hasText: new RegExp(`^${token}$`) }).first().click();
  }
}

/** Answers the current exercise correctly (or wrongly) using the fixture dictionary. */
export async function answer(page: Page, correct = true, lang: Lang = 'el'): Promise<string> {
  const { meaningOf, textOf } = dictionaries[lang];
  const exercise = page.locator('[data-exercise]');
  const type = (await exercise.getAttribute('data-exercise')) ?? '';
  const promptLearn = async () => (await exercise.locator('[data-prompt] .learn-text').textContent()) ?? '';
  const promptUi = async () => (await exercise.locator('[data-prompt] .ui-text').textContent()) ?? '';

  switch (type) {
    case 'choose_meaning':
    case 'choose_translation': {
      const solution = type === 'choose_meaning' ? lookup(meaningOf, await promptLearn()) : lookup(textOf, await promptUi());
      const options = exercise.locator('.options button');
      const target = correct
        ? options.filter({ hasText: new RegExp(`^${solution}$`) })
        : options.filter({ hasNotText: new RegExp(`^${solution}$`) }).first();
      await target.click();
      break;
    }
    case 'build_to_ui':
    case 'build_to_learn': {
      const solution = type === 'build_to_ui' ? lookup(meaningOf, await promptLearn()) : lookup(textOf, await promptUi());
      const tokens = tokenize(solution);
      await clickTiles(exercise, correct ? tokens : [...tokens].reverse());
      break;
    }
    case 'match_pairs': {
      const left = exercise.locator('.pairs-column').nth(0).locator('button');
      const right = exercise.locator('.pairs-column').nth(1).locator('button');
      const count = await left.count();
      if (!correct) {
        const first = (await left.nth(0).textContent()) ?? '';
        await left.nth(0).click();
        await right.filter({ hasNotText: new RegExp(`^${lookup(meaningOf, first)}$`) }).first().click();
      }
      for (let i = 0; i < count; i++) {
        const text = (await left.nth(i).textContent()) ?? '';
        await left.nth(i).click();
        await right.filter({ hasText: new RegExp(`^${lookup(meaningOf, text)}$`) }).click();
      }
      break;
    }
    default:
      throw new Error(`Exercise type "${type}" cannot be solved in e2e (no voice expected in headless browser)`);
  }

  await page.getByRole('button', { name: 'Prüfen' }).click();
  await expect(page.locator('.feedback')).toHaveClass(correct ? /is-correct/ : /is-wrong/);
  await page.getByRole('button', { name: 'Weiter' }).click();
  return type;
}

/** Plays the rest of the lesson correctly and returns the exercise types seen. */
export async function finishLesson(page: Page, lang: Lang = 'el'): Promise<string[]> {
  const types: string[] = [];
  while (await page.locator('[data-screen="lesson"]').isVisible()) {
    await expect(page.locator('[data-exercise]')).toBeVisible();
    types.push(await answer(page, true, lang));
    await expect(page.locator('[data-screen="lesson"], [data-screen="result"]')).toBeVisible();
  }
  return types;
}
