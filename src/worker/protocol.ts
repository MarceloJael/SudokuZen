/**
 * Typed message protocol shared between the main thread and the Sudoku
 * Web Worker. Keeping this in its own module (imported by both sides) means
 * the request/response shapes are checked at compile time on both ends.
 */
import type { Difficulty, NumericGrid } from '../engine/types';

/** Main thread -> worker. */
export type WorkerRequest =
  | { type: 'generate'; id: number; difficulty: Difficulty; seed?: number }
  | { type: 'solve'; id: number; grid: NumericGrid };

/** Worker -> main thread. */
export type WorkerResponse =
  | {
      type: 'generated';
      id: number;
      puzzle: NumericGrid;
      solution: NumericGrid;
      difficulty: Difficulty;
    }
  | { type: 'solved'; id: number; solution: NumericGrid | null }
  | { type: 'error'; id: number; message: string };
