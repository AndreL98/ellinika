import { describe, expect, it } from 'vitest';
import { createChoice } from '../../app/src/engine/exercises';
import { Lesson, MAX_RETRIES } from '../../app/src/engine/lesson';
import {
  applyLesson, crownsOf, currentStreak, emptyProgress, previousDay, todayXp, toLocalDate,
} from '../../app/src/engine/progress';
import { seededRandom } from '../../app/src/engine/random';
import { words } from './helpers';

const exercises = words.slice(0, 3).map((w) => createChoice('choose_meaning', w, words, seededRandom(1)));

describe('Lesson', () => {
  it('asks wrong answers again at the end', () => {
    const lesson = new Lesson(exercises);
    lesson.submit(false);
    lesson.submit(true);
    lesson.submit(true);
    expect(lesson.finished).toBe(false);
    expect(lesson.isRetry).toBe(true);
    expect(lesson.current).toBe(exercises[0]);
    expect(lesson.step).toEqual({ current: 4, total: 4 });
    lesson.submit(true);
    expect(lesson.finished).toBe(true);
    expect(lesson.summary()).toEqual({ exercises: 3, mistakes: 1, perfect: false });
  });

  it('stops repeating after the retry limit', () => {
    const lesson = new Lesson([exercises[0]!]);
    for (let i = 0; i <= MAX_RETRIES; i++) lesson.submit(false);
    expect(lesson.finished).toBe(true);
    expect(lesson.summary().mistakes).toBe(MAX_RETRIES + 1);
  });

  it('is perfect without mistakes', () => {
    const lesson = new Lesson(exercises);
    exercises.forEach(() => lesson.submit(true));
    expect(lesson.summary().perfect).toBe(true);
  });
});

describe('progress', () => {
  const perfect = { exercises: 8, mistakes: 0, perfect: true };
  const flawed = { exercises: 8, mistakes: 2, perfect: false };

  it('formats local dates and finds the previous day across month and year ends', () => {
    expect(toLocalDate(new Date(2026, 8, 3))).toBe('2026-09-03');
    expect(previousDay('2026-10-01')).toBe('2026-09-30');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2026-03-29')).toBe('2026-03-28');
  });

  it('adds XP with a bonus for perfect lessons and caps crowns at 3', () => {
    let p = emptyProgress();
    p = applyLesson(p, 'demo/u', perfect, '2026-09-28');
    expect(p.xp).toBe(15);
    p = applyLesson(p, 'demo/u', flawed, '2026-09-28');
    expect(p.xp).toBe(25);
    expect(todayXp(p, '2026-09-28')).toBe(25);
    p = applyLesson(p, 'demo/u', flawed, '2026-09-28');
    p = applyLesson(p, 'demo/u', flawed, '2026-09-28');
    expect(crownsOf(p, 'demo/u')).toBe(3);
    expect(p.units['demo/u']?.lessons).toBe(4);
  });

  it('counts the streak over consecutive days and resets after a gap', () => {
    let p = applyLesson(emptyProgress(), 'u', perfect, '2026-09-27');
    p = applyLesson(p, 'u', perfect, '2026-09-28');
    p = applyLesson(p, 'u', perfect, '2026-09-28');
    expect(currentStreak(p, '2026-09-28')).toBe(2);
    expect(currentStreak(p, '2026-09-29')).toBe(2);
    expect(currentStreak(p, '2026-09-30')).toBe(0);
    p = applyLesson(p, 'u', perfect, '2026-10-02');
    expect(p.streak.count).toBe(1);
  });

  it('resets daily XP on a new day and does not mutate the input', () => {
    const before = applyLesson(emptyProgress(), 'u', perfect, '2026-09-27');
    const after = applyLesson(before, 'u', flawed, '2026-09-28');
    expect(todayXp(after, '2026-09-28')).toBe(10);
    expect(before.xp).toBe(15);
  });
});
