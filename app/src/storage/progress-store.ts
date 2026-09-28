import { emptyProgress, type Progress } from '../engine/progress';
import type { KeyValueStore } from './store';

const KEY = 'progress';
const EXPORT_FORMAT = 'logos-progress';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isDateOrNull = (value: unknown) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));

/** Validates unknown data and returns clean progress, or null if it is not valid. */
export function parseProgress(data: unknown): Progress | null {
  if (!isObject(data) || data['version'] !== 1 || !isCount(data['xp'])) return null;
  const { units, day, streak, dailyGoal } = data;
  if (!isObject(units) || !isObject(day) || !isObject(streak) || !isCount(dailyGoal) || dailyGoal === 0) return null;
  if (!isDateOrNull(day['date']) || !isCount(day['xp'])) return null;
  if (!isDateOrNull(streak['lastDate']) || !isCount(streak['count'])) return null;

  const cleanUnits: Progress['units'] = {};
  for (const [key, value] of Object.entries(units)) {
    if (!isObject(value) || !isCount(value['crowns']) || !isCount(value['lessons'])) return null;
    cleanUnits[key] = { crowns: Math.min(3, value['crowns']), lessons: value['lessons'] };
  }
  return {
    version: 1,
    xp: data['xp'],
    units: cleanUnits,
    day: { date: day['date'] as string | null, xp: day['xp'] },
    streak: { count: streak['count'], lastDate: streak['lastDate'] as string | null },
    dailyGoal,
  };
}

/** Loads progress; broken or missing data gives empty progress instead of an error. */
export async function loadProgress(store: KeyValueStore): Promise<Progress> {
  const raw = await store.get(KEY);
  if (raw === null) return emptyProgress();
  try {
    return parseProgress(JSON.parse(raw)) ?? emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(store: KeyValueStore, progress: Progress): Promise<void> {
  await store.set(KEY, JSON.stringify(progress));
}

/** JSON file content for "export progress". */
export function exportProgress(progress: Progress, exportedAt: Date): string {
  return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: exportedAt.toISOString(), progress }, null, 2);
}

/** Parses an exported file. Throws with a short reason if the file is not valid. */
export function importProgress(json: string): Progress {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('not-json');
  }
  if (!isObject(data) || data['format'] !== EXPORT_FORMAT) throw new Error('wrong-format');
  const progress = parseProgress(data['progress']);
  if (!progress) throw new Error('invalid-progress');
  return progress;
}
