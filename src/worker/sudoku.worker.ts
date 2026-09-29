/**
 * sudoku.worker.ts — runs the CPU-heavy engine work off the main thread.
 *
 * Puzzle generation (repeated uniqueness checks) and full backtracking solves
 * can take tens to hundreds of milliseconds. Doing them here guarantees the
 * UI thread never janks while a new level is created (prompt §1).
 */
/// <reference lib="webworker" />
import {
  cloneNumericGrid,
  createSeededRng,
  generatePuzzle,
  solve,
} from '../engine/sudokuEngine';
import type { WorkerRequest, WorkerResponse } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerResponse): void {
  ctx.postMessage(message);
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    switch (req.type) {
      case 'generate': {
        const rng =
          req.seed === undefined ? Math.random : createSeededRng(req.seed);
        const { puzzle, solution, difficulty } = generatePuzzle(
          req.difficulty,
          rng,
        );
        post({ type: 'generated', id: req.id, puzzle, solution, difficulty });
        break;
      }
      case 'solve': {
        const working = cloneNumericGrid(req.grid);
        const ok = solve(working);
        post({ type: 'solved', id: req.id, solution: ok ? working : null });
        break;
      }
      default: {
        // Exhaustiveness guard.
        const _never: never = req;
        throw new Error(`Unknown request: ${JSON.stringify(_never)}`);
      }
    }
  } catch (error) {
    post({
      type: 'error',
      id: req.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
