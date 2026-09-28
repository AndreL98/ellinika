import type { LessonSummary } from './lesson';

export const MAX_CROWNS = 3;
export const XP_PER_LESSON = 10;
export const XP_PERFECT_BONUS = 5;
export const DEFAULT_DAILY_GOAL = 20;

/** ISO date "YYYY-MM-DD" in the user's local time zone. */
export type LocalDate = string;

export interface UnitProgress {
  crowns: number;
  lessons: number;
}

export interface Progress {
  version: 1;
  xp: number;
  units: Record<string, UnitProgress>;
  day: { date: LocalDate | null; xp: number };
  streak: { count: number; lastDate: LocalDate | null };
  dailyGoal: number;
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    units: {},
    day: { date: null, xp: 0 },
    streak: { count: 0, lastDate: null },
    dailyGoal: DEFAULT_DAILY_GOAL,
  };
}

export function toLocalDate(date: Date): LocalDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Previous calendar day, computed in UTC to avoid daylight-saving gaps. */
export function previousDay(date: LocalDate): LocalDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d - 1));
  return utc.toISOString().slice(0, 10);
}

export function xpForLesson(summary: LessonSummary): number {
  return XP_PER_LESSON + (summary.perfect ? XP_PERFECT_BONUS : 0);
}

export function crownsOf(progress: Progress, unitKey: string): number {
  return progress.units[unitKey]?.crowns ?? 0;
}

/** Streak as seen today: it breaks if yesterday had no lesson. */
export function currentStreak(progress: Progress, today: LocalDate): number {
  const last = progress.streak.lastDate;
  if (last === today || (last !== null && last === previousDay(today))) return progress.streak.count;
  return 0;
}

/** XP earned today (0 if the stored day is not today). */
export function todayXp(progress: Progress, today: LocalDate): number {
  return progress.day.date === today ? progress.day.xp : 0;
}

/** Returns new progress after a finished lesson. Pure: the input is not changed. */
export function applyLesson(progress: Progress, unitKey: string, summary: LessonSummary, today: LocalDate): Progress {
  const earned = xpForLesson(summary);
  const unit = progress.units[unitKey] ?? { crowns: 0, lessons: 0 };
  const last = progress.streak.lastDate;
  const streakCount =
    last === today ? progress.streak.count : last !== null && last === previousDay(today) ? progress.streak.count + 1 : 1;

  return {
    ...progress,
    xp: progress.xp + earned,
    units: {
      ...progress.units,
      [unitKey]: { crowns: Math.min(MAX_CROWNS, unit.crowns + 1), lessons: unit.lessons + 1 },
    },
    day: { date: today, xp: todayXp(progress, today) + earned },
    streak: { count: streakCount, lastDate: today },
  };
}
