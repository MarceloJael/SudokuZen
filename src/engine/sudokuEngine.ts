/**
 * sudokuEngine.ts — pure, framework-agnostic Sudoku domain logic.
 *
 * This module has ZERO dependencies on React, Redux, the DOM, or the Web Worker
 * runtime. Everything here is a pure function (given the same input + RNG it
 * produces the same output), which makes the whole engine trivially unit
 * testable and safe to run inside a Web Worker.
 */

import {
  BOX,
  EMPTY,
  SIZE,
  type Difficulty,
  type Digit,
  type GeneratedPuzzle,
  type Grid,
  type NumericGrid,
  type Nine,
  type Position,
} from './types';

/* -------------------------------------------------------------------------- */
/* Randomness                                                                 */
/* -------------------------------------------------------------------------- */

/** A pluggable random source. Defaults to Math.random. */
export type Rng = () => number;

/**
 * Mulberry32 — a tiny, fast, seedable PRNG. Used so tests can generate
 * deterministic boards while production uses Math.random.
 */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle (returns a new array). */
function shuffle<T>(input: readonly T[], rng: Rng): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i]!;
    const b = arr[j]!;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* -------------------------------------------------------------------------- */
/* Grid construction & cloning                                                */
/* -------------------------------------------------------------------------- */

/** Build a 9x9 numeric grid of zeros. */
export function createEmptyNumericGrid(): NumericGrid {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => EMPTY),
  ) as unknown as NumericGrid;
}

/** Deep-clone a numeric grid (rows are copied, values are primitives). */
export function cloneNumericGrid(grid: NumericGrid): NumericGrid {
  return grid.map((row) => row.slice()) as unknown as NumericGrid;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Can `value` (1-9) legally be placed at (row, col) given the current grid?
 * Ignores the cell's own current content, so it also works for "is this
 * existing value in conflict" checks when the cell is temporarily cleared.
 */
export function isPlacementValid(
  grid: NumericGrid,
  row: number,
  col: number,
  value: number,
): boolean {
  if (value === EMPTY) return true;

  // Row & column.
  for (let i = 0; i < SIZE; i++) {
    if (i !== col && grid[row]![i] === value) return false;
    if (i !== row && grid[i]![col] === value) return false;
  }

  // 3x3 box.
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  for (let r = boxRow; r < boxRow + BOX; r++) {
    for (let c = boxCol; c < boxCol + BOX; c++) {
      if ((r !== row || c !== col) && grid[r]![c] === value) return false;
    }
  }

  return true;
}

/**
 * Returns the set of cells (as "row,col" keys) that violate Sudoku rules.
 * A cell is in conflict if it shares its value with another filled cell in the
 * same row, column, or box.
 */
export function findConflicts(grid: NumericGrid): Set<string> {
  const conflicts = new Set<string>();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = grid[row]![col]!;
      if (value === EMPTY) continue;
      if (!isPlacementValid(grid, row, col, value)) {
        conflicts.add(`${row},${col}`);
      }
    }
  }
  return conflicts;
}

/** Is the grid completely filled (no empty cells)? */
export function isComplete(grid: NumericGrid): boolean {
  return grid.every((row) => row.every((v) => v !== EMPTY));
}

/** Is the grid fully filled AND rule-valid (i.e. a solved puzzle)? */
export function isSolved(grid: NumericGrid): boolean {
  return isComplete(grid) && findConflicts(grid).size === 0;
}

/* -------------------------------------------------------------------------- */
/* Solving (bitmask backtracking)                                             */
/* -------------------------------------------------------------------------- */

/*
 * The solver below is the engine's hot path — puzzle generation runs a full
 * uniqueness proof after every cell removal, so raw speed matters. We track the
 * digits used by each row, column and box as 9-bit masks (bit d-1 set = digit d
 * is taken). Candidate lookup for a cell is then a single AND/NOT, and placing
 * or removing a digit is O(1). This is ~25x faster than re-scanning peers with
 * `isPlacementValid` at every node.
 */

const FULL_MASK = 0x1ff; // bits 0..8 set → all nine digits available

/** Number of set bits in a 9-bit mask. */
function popcount(mask: number): number {
  let m = mask;
  let count = 0;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
}

/** Expand a candidate mask into its digit list (1-9). */
function maskToDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= SIZE; d++) {
    if (mask & (1 << (d - 1))) digits.push(d);
  }
  return digits;
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / BOX) * BOX + Math.floor(col / BOX);
}

interface Masks {
  rows: number[];
  cols: number[];
  boxes: number[];
}

/**
 * Build row/column/box occupancy masks from a grid. Returns `null` if the
 * givens already violate Sudoku rules (a digit appears twice in a unit). This
 * is essential: the masks only track digit *presence*, so a duplicate given
 * would otherwise go undetected and send the solver into a huge, unsatisfiable
 * search instead of failing immediately.
 */
function buildMasks(grid: NumericGrid): Masks | null {
  const rows = new Array<number>(SIZE).fill(0);
  const cols = new Array<number>(SIZE).fill(0);
  const boxes = new Array<number>(SIZE).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r]![c]!;
      if (v !== EMPTY) {
        const bit = 1 << (v - 1);
        const b = boxIndex(r, c);
        // If the bit is already set in any unit, this digit is a duplicate.
        if ((rows[r]! | cols[c]! | boxes[b]!) & bit) return null;
        rows[r]! |= bit;
        cols[c]! |= bit;
        boxes[b]! |= bit;
      }
    }
  }
  return { rows, cols, boxes };
}

/**
 * Find the empty cell with the fewest candidates (MRV). Returns null when the
 * grid is full, or a cell with an empty `mask` when a dead end is detected.
 */
function findBestCell(
  grid: NumericGrid,
  masks: Masks,
): { row: number; col: number; mask: number } | null {
  let best: { row: number; col: number; mask: number } | null = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] !== EMPTY) continue;
      const used =
        masks.rows[r]! | masks.cols[c]! | masks.boxes[boxIndex(r, c)]!;
      const mask = ~used & FULL_MASK;
      const count = popcount(mask);
      if (count === 0) return { row: r, col: c, mask }; // dead end
      if (best === null || count < popcount(best.mask)) {
        best = { row: r, col: c, mask };
        if (count === 1) return best; // can't beat a forced cell
      }
    }
  }
  return best;
}

function place(
  grid: NumericGrid,
  masks: Masks,
  r: number,
  c: number,
  d: number,
): void {
  const bit = 1 << (d - 1);
  grid[r]![c] = d;
  masks.rows[r]! |= bit;
  masks.cols[c]! |= bit;
  masks.boxes[boxIndex(r, c)]! |= bit;
}

function unplace(
  grid: NumericGrid,
  masks: Masks,
  r: number,
  c: number,
  d: number,
): void {
  const bit = 1 << (d - 1);
  grid[r]![c] = EMPTY;
  masks.rows[r]! &= ~bit;
  masks.cols[c]! &= ~bit;
  masks.boxes[boxIndex(r, c)]! &= ~bit;
}

function solveWithMasks(grid: NumericGrid, masks: Masks, rng?: Rng): boolean {
  const cell = findBestCell(grid, masks);
  if (cell === null) return true; // solved
  if (cell.mask === 0) return false; // dead end

  const digits = maskToDigits(cell.mask);
  const order = rng ? shuffle(digits, rng) : digits;
  for (const d of order) {
    place(grid, masks, cell.row, cell.col, d);
    if (solveWithMasks(grid, masks, rng)) return true;
    unplace(grid, masks, cell.row, cell.col, d);
  }
  return false;
}

/**
 * Solve the grid in place using MRV backtracking. Pass an `rng` to randomise
 * candidate order (used during generation to produce varied solved grids).
 * Returns true if a solution was found.
 */
export function solve(grid: NumericGrid, rng?: Rng): boolean {
  const masks = buildMasks(grid);
  if (masks === null) return false; // Givens already conflict — unsolvable.
  return solveWithMasks(grid, masks, rng);
}

/**
 * Count solutions up to `limit` (default 2). Proving uniqueness requires
 * exhausting the search tree, but we never need a count beyond the limit, so we
 * stop as soon as it is reached. Operates on a clone to leave the input intact.
 */
export function countSolutions(grid: NumericGrid, limit = 2): number {
  const working = cloneNumericGrid(grid);
  const masks = buildMasks(working);
  if (masks === null) return 0; // Givens already conflict — no solutions.
  let count = 0;

  const recurse = (): void => {
    const cell = findBestCell(working, masks);
    if (cell === null) {
      count++;
      return;
    }
    if (cell.mask === 0) return; // dead end
    for (const d of maskToDigits(cell.mask)) {
      place(working, masks, cell.row, cell.col, d);
      recurse();
      unplace(working, masks, cell.row, cell.col, d);
      if (count >= limit) return;
    }
  };

  recurse();
  return count;
}

/** Convenience: does the puzzle have exactly one solution? */
export function hasUniqueSolution(grid: NumericGrid): boolean {
  return countSolutions(grid, 2) === 1;
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

/** Generate a fully-solved, rule-valid 9x9 grid. */
export function generateSolvedGrid(rng: Rng = Math.random): NumericGrid {
  const grid = createEmptyNumericGrid();
  // Seed the three independent diagonal boxes first — they never constrain
  // each other, so this is a cheap way to inject randomness before solving.
  for (let b = 0; b < SIZE; b += BOX) {
    const digits = shuffle(DIGITS, rng);
    let k = 0;
    for (let r = 0; r < BOX; r++) {
      for (let c = 0; c < BOX; c++) {
        grid[b + r]![b + c] = digits[k++]!;
      }
    }
  }
  solve(grid, rng);
  return grid;
}

/** Number of clues (filled cells) targeted per difficulty. */
const CLUE_TARGETS: Record<Difficulty, number> = {
  easy: 42,
  medium: 32,
  extreme: 26,
};

/**
 * Generate a puzzle with a guaranteed unique solution for the given difficulty.
 *
 * Strategy: start from a solved grid and remove cells in random order,
 * keeping a removal only if the puzzle still has exactly one solution. We
 * remove symmetric pairs when possible for a pleasant board, and stop once we
 * reach the clue target (or run out of safely-removable cells).
 */
export function generatePuzzle(
  difficulty: Difficulty,
  rng: Rng = Math.random,
): GeneratedPuzzle {
  const solution = generateSolvedGrid(rng);
  const puzzle = cloneNumericGrid(solution);

  const target = CLUE_TARGETS[difficulty];
  let clues = SIZE * SIZE; // 81

  // Iterate over all cells in random order and try to remove each.
  const cells: Position[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) cells.push({ row, col });
  }
  const order = shuffle(cells, rng);

  for (const { row, col } of order) {
    if (clues <= target) break;
    if (puzzle[row]![col] === EMPTY) continue;

    // Try removing this cell and its 180deg-rotational partner together.
    const mirror: Position = { row: SIZE - 1 - row, col: SIZE - 1 - col };
    const removed: Position[] = [{ row, col }];
    const isCenter = mirror.row === row && mirror.col === col;
    if (!isCenter && puzzle[mirror.row]![mirror.col] !== EMPTY) {
      removed.push(mirror);
    }

    const backup = removed.map((p) => puzzle[p.row]![p.col]!);
    for (const p of removed) puzzle[p.row]![p.col] = EMPTY;

    if (hasUniqueSolution(puzzle)) {
      clues -= removed.length;
    } else {
      // Revert — removing these broke uniqueness.
      removed.forEach((p, i) => {
        puzzle[p.row]![p.col] = backup[i]!;
      });
    }
  }

  return { puzzle, solution, difficulty };
}

/* -------------------------------------------------------------------------- */
/* Conversions between NumericGrid (algorithms) and Grid (UI/state)           */
/* -------------------------------------------------------------------------- */

/**
 * Convert a numeric puzzle grid into the rich `Grid` of `CellState` used by the
 * UI. Cells that carry a clue are marked `isFixed`.
 */
export function toCellGrid(puzzle: NumericGrid): Grid {
  return puzzle.map((row) =>
    row.map((value) => ({
      value: value === EMPTY ? null : value,
      isFixed: value !== EMPTY,
      hasError: false,
      notes: [] as number[],
    })),
  ) as unknown as Grid;
}

/** Extract a plain numeric grid from a `Grid` of `CellState`. */
export function toNumericGrid(grid: Grid): NumericGrid {
  return grid.map((row) =>
    row.map((cell) => cell.value ?? EMPTY),
  ) as unknown as NumericGrid;
}

/**
 * Recompute the `hasError` flag on every cell of a `Grid`, returning a NEW grid
 * (immutable-friendly). A cell errors when its value conflicts with another
 * filled cell per Sudoku rules or, when `solution` is given, when its value
 * differs from the solution — a rule-legal digit can still be a dead end.
 * Fixed clues never error.
 */
export function withRecomputedErrors(
  grid: Grid,
  solution?: NumericGrid | null,
): Grid {
  const numeric = toNumericGrid(grid);
  const conflicts = findConflicts(numeric);
  return grid.map((row, r) =>
    row.map((cell, c) => {
      const wrong =
        !!solution && cell.value !== null && cell.value !== solution[r]?.[c];
      const hasError = !cell.isFixed && (conflicts.has(`${r},${c}`) || wrong);
      return hasError === cell.hasError ? cell : { ...cell, hasError };
    }),
  ) as unknown as Grid;
}

/** A9x9 grid of a single repeated value — handy for tests. */
export function fromRows(rows: readonly (readonly number[])[]): NumericGrid {
  if (rows.length !== SIZE || rows.some((r) => r.length !== SIZE)) {
    throw new Error('fromRows expects a 9x9 matrix');
  }
  return rows.map((r) => r.slice()) as unknown as NumericGrid;
}

/** All nine cell coordinates of the box containing (row, col). */
export function boxCells(row: number, col: number): Nine<Position> {
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  const cells: Position[] = [];
  for (let r = boxRow; r < boxRow + BOX; r++) {
    for (let c = boxCol; c < boxCol + BOX; c++) cells.push({ row: r, col: c });
  }
  return cells as unknown as Nine<Position>;
}

export { CLUE_TARGETS };
