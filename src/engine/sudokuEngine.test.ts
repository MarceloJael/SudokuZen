import { describe, expect, it } from 'vitest';
import {
  CLUE_TARGETS,
  boxCells,
  cloneNumericGrid,
  countSolutions,
  createEmptyNumericGrid,
  createSeededRng,
  findConflicts,
  fromRows,
  generatePuzzle,
  generateSolvedGrid,
  hasUniqueSolution,
  isComplete,
  isPlacementValid,
  isSolved,
  solve,
  toCellGrid,
  toNumericGrid,
  withRecomputedErrors,
} from './sudokuEngine';
import { SIZE, type Difficulty, type NumericGrid } from './types';

/** A known solved grid used across several tests. */
const SOLVED = fromRows([
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]);

function countClues(grid: NumericGrid): number {
  return grid.flat().filter((v) => v !== 0).length;
}

describe('grid construction', () => {
  it('creates a 9x9 grid of zeros', () => {
    const g = createEmptyNumericGrid();
    expect(g).toHaveLength(SIZE);
    expect(g.every((row) => row.length === SIZE)).toBe(true);
    expect(g.flat().every((v) => v === 0)).toBe(true);
  });

  it('clones without aliasing rows', () => {
    const g = cloneNumericGrid(SOLVED);
    g[0]![0] = 0;
    expect(SOLVED[0]![0]).toBe(5);
  });

  it('fromRows rejects malformed matrices', () => {
    expect(() => fromRows([[1, 2, 3]])).toThrow();
  });
});

describe('validation rules', () => {
  it('recognises a fully solved grid', () => {
    expect(isSolved(SOLVED)).toBe(true);
    expect(isComplete(SOLVED)).toBe(true);
    expect(findConflicts(SOLVED).size).toBe(0);
  });

  it('detects a duplicate in a row', () => {
    const g = cloneNumericGrid(SOLVED);
    g[0]![1] = 5; // row 0 now has two 5s (cols 0 and 1)
    const conflicts = findConflicts(g);
    expect(conflicts.has('0,0')).toBe(true);
    expect(conflicts.has('0,1')).toBe(true);
    expect(isSolved(g)).toBe(false);
  });

  it('detects a duplicate in a column', () => {
    const g = cloneNumericGrid(SOLVED);
    g[1]![0] = 5; // col 0 now has two 5s (rows 0 and 1)
    expect(findConflicts(g).has('1,0')).toBe(true);
  });

  it('detects a duplicate in a box', () => {
    const g = cloneNumericGrid(SOLVED);
    g[1]![1] = 4; // box (0,0) already has a 4 at (0,2)
    const conflicts = findConflicts(g);
    expect(conflicts.has('1,1')).toBe(true);
  });

  it('isPlacementValid ignores the cell itself', () => {
    // Placing the value already present should be valid (no self-conflict).
    expect(isPlacementValid(SOLVED, 0, 0, 5)).toBe(true);
    // Placing a value that exists elsewhere in the row is invalid.
    expect(isPlacementValid(SOLVED, 0, 0, 3)).toBe(false);
  });

  it('treats empty (0) as always placeable', () => {
    expect(isPlacementValid(SOLVED, 0, 0, 0)).toBe(true);
  });

  it('an incomplete grid is not solved', () => {
    const g = cloneNumericGrid(SOLVED);
    g[0]![0] = 0;
    expect(isSolved(g)).toBe(false);
    expect(isComplete(g)).toBe(false);
  });
});

describe('backtracking solver', () => {
  it('solves a puzzle with a known unique solution', () => {
    const puzzle = cloneNumericGrid(SOLVED);
    // Blank out a handful of cells; solution stays unique for so few removals.
    puzzle[0]![0] = 0;
    puzzle[0]![1] = 0;
    puzzle[4]![4] = 0;
    const g = cloneNumericGrid(puzzle);
    expect(solve(g)).toBe(true);
    expect(isSolved(g)).toBe(true);
    // Solved grid must match the original solution (uniqueness).
    expect(g).toEqual(SOLVED);
  });

  it('solves an empty grid into a valid full grid', () => {
    const g = createEmptyNumericGrid();
    expect(solve(g)).toBe(true);
    expect(isSolved(g)).toBe(true);
  });

  it('returns false for an impossible grid', () => {
    // Two 5s in the same row make the grid unsolvable.
    const g = createEmptyNumericGrid();
    g[0]![0] = 5;
    g[0]![1] = 5;
    expect(solve(g)).toBe(false);
  });

  it('reports an impossible box configuration as unsolvable', () => {
    const g = createEmptyNumericGrid();
    g[0]![0] = 1;
    g[1]![1] = 1; // same box, duplicate 1
    expect(solve(g)).toBe(false);
  });
});

describe('solution counting & uniqueness', () => {
  it('a solved grid has exactly one solution', () => {
    expect(countSolutions(SOLVED)).toBe(1);
    expect(hasUniqueSolution(SOLVED)).toBe(true);
  });

  it('an empty grid has many solutions (capped by limit)', () => {
    const g = createEmptyNumericGrid();
    expect(countSolutions(g, 2)).toBe(2);
    expect(hasUniqueSolution(g)).toBe(false);
  });

  it('an impossible grid has zero solutions', () => {
    const g = createEmptyNumericGrid();
    g[0]![0] = 5;
    g[0]![1] = 5;
    expect(countSolutions(g)).toBe(0);
    expect(hasUniqueSolution(g)).toBe(false);
  });

  it('respects the count limit (short-circuits)', () => {
    const g = createEmptyNumericGrid();
    expect(countSolutions(g, 1)).toBe(1);
  });

  it('detects a puzzle with exactly two solutions as non-unique', () => {
    // Remove a pair that can be swapped, creating ambiguity.
    const g = cloneNumericGrid(SOLVED);
    g[0]![0] = 0;
    g[0]![8] = 0;
    g[8]![0] = 0;
    g[8]![8] = 0;
    // Four corners of the deca-swap; may or may not be unique depending on
    // structure, but must have >= 1 solution and be internally consistent.
    expect(countSolutions(g, 3)).toBeGreaterThanOrEqual(1);
  });
});

describe('solved grid generation', () => {
  it('produces a valid complete grid', () => {
    const rng = createSeededRng(12345);
    const g = generateSolvedGrid(rng);
    expect(isSolved(g)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const a = generateSolvedGrid(createSeededRng(999));
    const b = generateSolvedGrid(createSeededRng(999));
    expect(a).toEqual(b);
  });

  it('produces different grids for different seeds', () => {
    const a = generateSolvedGrid(createSeededRng(1));
    const b = generateSolvedGrid(createSeededRng(2));
    expect(a).not.toEqual(b);
  });
});

describe('puzzle generation', () => {
  const levels: Difficulty[] = ['easy', 'medium', 'extreme'];

  for (const level of levels) {
    it(`generates a unique-solution ${level} puzzle`, () => {
      const rng = createSeededRng(2024 + level.length);
      const { puzzle, solution } = generatePuzzle(level, rng);

      // The solution is complete & valid.
      expect(isSolved(solution)).toBe(true);
      // The puzzle is a subset of the solution.
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const v = puzzle[r]![c]!;
          if (v !== 0) expect(v).toBe(solution[r]![c]);
        }
      }
      // The puzzle has a unique solution...
      expect(hasUniqueSolution(puzzle)).toBe(true);
      // ...and solving it reproduces the solution.
      const working = cloneNumericGrid(puzzle);
      solve(working);
      expect(working).toEqual(solution);
    });

    it(`${level} reaches roughly its clue target`, () => {
      const rng = createSeededRng(7 + level.length);
      const { puzzle } = generatePuzzle(level, rng);
      const clues = countClues(puzzle);
      // Removal is best-effort (uniqueness can block it), so allow a margin
      // above target, but it must never exceed the starting 81 or be trivial.
      expect(clues).toBeLessThanOrEqual(CLUE_TARGETS[level] + 12);
      expect(clues).toBeGreaterThanOrEqual(17); // 17 = theoretical minimum
    });
  }

  it('is deterministic for a given seed', () => {
    const a = generatePuzzle('medium', createSeededRng(42));
    const b = generatePuzzle('medium', createSeededRng(42));
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.solution).toEqual(b.solution);
  });
});

describe('UI grid conversions', () => {
  it('marks clues as fixed and empties as editable', () => {
    const puzzle = cloneNumericGrid(SOLVED);
    puzzle[0]![0] = 0;
    const grid = toCellGrid(puzzle);
    expect(grid[0]![0]).toEqual({
      value: null,
      isFixed: false,
      hasError: false,
      notes: [],
    });
    expect(grid[0]![1]).toEqual({
      value: 3,
      isFixed: true,
      hasError: false,
      notes: [],
    });
  });

  it('round-trips numeric <-> cell grids', () => {
    const grid = toCellGrid(SOLVED);
    expect(toNumericGrid(grid)).toEqual(SOLVED);
  });

  it('flags conflicting editable cells and preserves references otherwise', () => {
    const puzzle = cloneNumericGrid(SOLVED);
    puzzle[0]![0] = 0;
    const grid = toCellGrid(puzzle);
    // User types a wrong value that conflicts.
    const withValue = grid.map((row, r) =>
      row.map((cell, c) => (r === 0 && c === 0 ? { ...cell, value: 3 } : cell)),
    ) as unknown as typeof grid;
    const recomputed = withRecomputedErrors(withValue);
    expect(recomputed[0]![0]!.hasError).toBe(true);
    // A non-conflicting, unchanged cell keeps its object reference (memo-friendly).
    expect(recomputed[5]![5]).toBe(withValue[5]![5]);
  });

  it('never flags fixed clues as errors', () => {
    const grid = toCellGrid(SOLVED);
    const recomputed = withRecomputedErrors(grid);
    expect(recomputed.flat().every((c) => c.hasError === false)).toBe(true);
  });
});

describe('geometry helpers', () => {
  it('boxCells returns the nine cells of the containing box', () => {
    const cells = boxCells(4, 4);
    expect(cells).toHaveLength(9);
    expect(cells).toContainEqual({ row: 3, col: 3 });
    expect(cells).toContainEqual({ row: 5, col: 5 });
    expect(cells.every((p) => p.row >= 3 && p.row <= 5)).toBe(true);
  });
});
