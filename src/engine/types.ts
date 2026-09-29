/**
 * Core domain types for the Sudoku engine.
 *
 * The prompt requires compile-time guarantees that the grid and its rows have
 * exactly 9 elements. We model this with fixed-length tuple types so that
 * constructing a malformed grid is a type error, not a runtime surprise.
 */

/**
 * A tuple with exactly nine elements of type T. Mutable on purpose: the engine
 * fills grids in place during backtracking, and Redux Toolkit's Immer drafts
 * require writable state. The fixed length still guarantees, at compile time,
 * that a grid/row has exactly nine slots.
 */
export type Nine<T> = [T, T, T, T, T, T, T, T, T];

/** Valid Sudoku digit (1-9). */
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * The solved/numeric representation used by the engine's algorithms.
 * `0` denotes an empty cell. This compact form keeps backtracking fast.
 */
export type NumericGrid = Nine<Nine<number>>;

/** The three difficulty levels the game exposes. */
export type Difficulty = 'easy' | 'medium' | 'extreme';

/**
 * Rich per-cell state consumed by the UI layer (see prompt §2).
 * `value` is `null` when the cell is empty.
 */
export interface CellState {
  value: number | null;
  isFixed: boolean;
  hasError: boolean;
  notes: number[];
}

/** The board as consumed by React/Redux: 9 rows of 9 cells. */
export type Grid = Nine<Nine<CellState>>;

/** Row/column coordinate into the 9x9 grid, each 0-8. */
export interface Position {
  row: number;
  col: number;
}

/** Result of generating a puzzle: the clues plus its unique solution. */
export interface GeneratedPuzzle {
  puzzle: NumericGrid;
  solution: NumericGrid;
  difficulty: Difficulty;
}

export const SIZE = 9 as const;
export const BOX = 3 as const;
export const EMPTY = 0 as const;
