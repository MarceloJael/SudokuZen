/**
 * Promise-based client for the Sudoku Web Worker.
 *
 * Each request carries an incrementing id; the client keeps a map of pending
 * resolvers so multiple in-flight requests never cross wires. If the runtime
 * lacks Worker support (e.g. some test environments), callers can fall back to
 * running the engine synchronously.
 */
import type { Difficulty, GeneratedPuzzle, NumericGrid } from '../engine/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

/** Omit that distributes over each member of a union (unlike bare Omit). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export class SudokuWorkerClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    // Vite compiles this URL form into a proper worker bundle.
    this.worker = new Worker(new URL('./sudoku.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>): void => {
    const res = event.data;
    const entry = this.pending.get(res.id);
    if (!entry) return;
    this.pending.delete(res.id);
    if (res.type === 'error') {
      entry.reject(new Error(res.message));
    } else {
      entry.resolve(res);
    }
  };

  private handleError = (event: ErrorEvent): void => {
    // Fail every in-flight request; the worker is in an unknown state.
    const err = new Error(event.message || 'Sudoku worker crashed');
    for (const [, entry] of this.pending) entry.reject(err);
    this.pending.clear();
  };

  private request<R extends WorkerResponse>(
    payload: DistributiveOmit<WorkerRequest, 'id'>,
  ): Promise<R> {
    const id = this.nextId++;
    const message = { ...payload, id } as WorkerRequest;
    return new Promise<R>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.worker.postMessage(message);
    });
  }

  async generate(
    difficulty: Difficulty,
    seed?: number,
  ): Promise<GeneratedPuzzle> {
    const res = await this.request<
      Extract<WorkerResponse, { type: 'generated' }>
    >(
      seed === undefined
        ? { type: 'generate', difficulty }
        : { type: 'generate', difficulty, seed },
    );
    return {
      puzzle: res.puzzle,
      solution: res.solution,
      difficulty: res.difficulty,
    };
  }

  async solve(grid: NumericGrid): Promise<NumericGrid | null> {
    const res = await this.request<Extract<WorkerResponse, { type: 'solved' }>>(
      { type: 'solve', grid },
    );
    return res.solution;
  }

  dispose(): void {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.worker.terminate();
    this.pending.clear();
  }
}
