import type { Exercise } from './types';

/** How often a wrongly answered exercise is asked again at the end of the lesson. */
export const MAX_RETRIES = 2;

export interface LessonSummary {
  exercises: number;
  mistakes: number;
  perfect: boolean;
}

/**
 * Runs through a lesson. Wrong answers are queued again at the end
 * (APP.md: "Fehler kommen am Ende der Lektion erneut").
 */
export class Lesson {
  private readonly queue: { exercise: Exercise; retry: number }[];
  private position = 0;
  private mistakeCount = 0;
  private readonly baseCount: number;

  constructor(exercises: Exercise[]) {
    this.queue = exercises.map((exercise) => ({ exercise, retry: 0 }));
    this.baseCount = exercises.length;
  }

  get current(): Exercise | undefined {
    return this.queue[this.position]?.exercise;
  }

  /** True if the current exercise is a repetition of an earlier mistake. */
  get isRetry(): boolean {
    return (this.queue[this.position]?.retry ?? 0) > 0;
  }

  /** 1-based number of the current exercise and the current total (grows with mistakes). */
  get step(): { current: number; total: number } {
    return { current: Math.min(this.position + 1, this.queue.length), total: this.queue.length };
  }

  get finished(): boolean {
    return this.position >= this.queue.length;
  }

  /** Records the result of the current exercise and moves on. */
  submit(correct: boolean): void {
    const entry = this.queue[this.position];
    if (!entry) throw new Error('Lesson already finished');
    if (!correct) {
      this.mistakeCount += 1;
      if (entry.retry < MAX_RETRIES) this.queue.push({ exercise: entry.exercise, retry: entry.retry + 1 });
    }
    this.position += 1;
  }

  summary(): LessonSummary {
    return { exercises: this.baseCount, mistakes: this.mistakeCount, perfect: this.mistakeCount === 0 };
  }
}
