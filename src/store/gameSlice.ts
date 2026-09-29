/**
 * gameSlice — global game state (prompt §3).
 *
 * Holds `initialGrid`, `currentGrid` and `solutionGrid`, plus selection/UI
 * state. Undo/Redo is implemented with two stacks of *moves* (not full-grid
 * snapshots): each edit pushes a compact `{ row, col, before, after }` record.
 * Undo pops from `past` and pushes to `future`; a fresh edit clears `future`.
 * This keeps history memory-flat regardless of how long a session runs.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  toCellGrid,
  toNumericGrid,
  withRecomputedErrors,
} from '../engine/sudokuEngine';
import { isSolved as isNumericSolved } from '../engine/sudokuEngine';
import {
  type CellState,
  type Difficulty,
  type Grid,
  type NumericGrid,
  type Position,
  SIZE,
} from '../engine/types';

export type GameStatus = 'idle' | 'generating' | 'playing' | 'solved';

/** A single reversible change to one cell. */
interface Move {
  row: number;
  col: number;
  before: CellState;
  after: CellState;
}

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  initialGrid: Grid | null;
  currentGrid: Grid | null;
  solutionGrid: NumericGrid | null;
  selected: Position | null;
  /** The value the user last interacted with, for "highlight same number". */
  activeNumber: number | null;
  /** True when the player is entering pencil-mark notes instead of values. */
  notesMode: boolean;
  /** Count of conflicting entries made (shown in the HUD / victory panel). */
  mistakes: number;
  /** Remaining hints (DESIGN.md §5.7 — default 3). */
  hintsLeft: number;
  /** Cell most recently revealed by a hint, for the transient highlight. */
  hintCell: Position | null;
  past: Move[];
  future: Move[];
}

const HINTS_START = 3;

const initialState: GameState = {
  status: 'idle',
  difficulty: 'easy',
  initialGrid: null,
  currentGrid: null,
  solutionGrid: null,
  selected: null,
  activeNumber: null,
  notesMode: false,
  mistakes: 0,
  hintsLeft: HINTS_START,
  hintCell: null,
  past: [],
  future: [],
};

function cloneCell(cell: CellState): CellState {
  return { ...cell, notes: [...cell.notes] };
}

/** Replace one cell in a grid, returning a new grid (structural sharing). */
function setCell(grid: Grid, row: number, col: number, cell: CellState): Grid {
  return grid.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? cell : c)) : r,
  ) as unknown as Grid;
}

/** Apply a move's `after` (or `before` on undo) and refresh error flags. */
function applyMove(grid: Grid, move: Move, direction: 'do' | 'undo'): Grid {
  const cell = direction === 'do' ? move.after : move.before;
  const next = setCell(grid, move.row, move.col, cloneCell(cell));
  return withRecomputedErrors(next);
}

function refreshStatus(state: GameState): void {
  if (!state.currentGrid) return;
  const numeric = toNumericGrid(state.currentGrid);
  state.status = isNumericSolved(numeric) ? 'solved' : 'playing';
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    /** Mark that a generation request is in flight. */
    startGeneration(state, action: PayloadAction<Difficulty>) {
      state.status = 'generating';
      state.difficulty = action.payload;
      state.selected = null;
      state.activeNumber = null;
    },

    /** Install a freshly generated puzzle and reset history. */
    puzzleLoaded(
      state,
      action: PayloadAction<{
        puzzle: NumericGrid;
        solution: NumericGrid;
        difficulty: Difficulty;
      }>,
    ) {
      const grid = toCellGrid(action.payload.puzzle);
      state.initialGrid = grid;
      state.currentGrid = grid;
      state.solutionGrid = action.payload.solution;
      state.difficulty = action.payload.difficulty;
      state.status = 'playing';
      state.selected = null;
      state.activeNumber = null;
      state.notesMode = false;
      state.mistakes = 0;
      state.hintsLeft = HINTS_START;
      state.hintCell = null;
      state.past = [];
      state.future = [];
    },

    selectCell(state, action: PayloadAction<Position | null>) {
      state.selected = action.payload;
      if (action.payload && state.currentGrid) {
        const cell =
          state.currentGrid[action.payload.row]?.[action.payload.col];
        state.activeNumber = cell?.value ?? null;
      }
    },

    /** Move selection by a delta with edge-wrapping (prompt §4 keyboard nav). */
    moveSelection(
      state,
      action: PayloadAction<{ dRow: number; dCol: number }>,
    ) {
      const { dRow, dCol } = action.payload;
      const cur = state.selected ?? { row: 0, col: 0 };
      const row = (cur.row + dRow + SIZE) % SIZE;
      const col = (cur.col + dCol + SIZE) % SIZE;
      state.selected = { row, col };
      const cell = state.currentGrid?.[row]?.[col];
      state.activeNumber = cell?.value ?? null;
    },

    setActiveNumber(state, action: PayloadAction<number | null>) {
      state.activeNumber = action.payload;
    },

    toggleNotesMode(state) {
      state.notesMode = !state.notesMode;
    },

    /**
     * Enter a digit at the selected cell. Respects notes mode. Fixed clues are
     * never mutated. Records a move for undo/redo.
     */
    inputDigit(state, action: PayloadAction<number>) {
      const digit = action.payload;
      if (!state.currentGrid || !state.selected) return;
      const { row, col } = state.selected;
      const before = state.currentGrid[row]?.[col];
      if (!before || before.isFixed) return;

      let after: CellState;
      if (state.notesMode) {
        // Toggle the pencil mark; clearing the value if present.
        const notes = before.notes.includes(digit)
          ? before.notes.filter((n) => n !== digit)
          : [...before.notes, digit].sort((a, b) => a - b);
        after = { ...before, value: null, notes };
      } else {
        // Toggle the value: pressing the same digit again clears it.
        const value = before.value === digit ? null : digit;
        after = { ...before, value, notes: [] };
      }

      const move: Move = {
        row,
        col,
        before: cloneCell(before),
        after: cloneCell(after),
      };
      state.currentGrid = applyMove(state.currentGrid, move, 'do');
      state.past.push(move);
      state.future = [];
      state.activeNumber = after.value;
      // A newly entered value that conflicts counts as a mistake (DESIGN §5.7).
      if (after.value !== null && state.currentGrid[row]?.[col]?.hasError) {
        state.mistakes += 1;
      }
      refreshStatus(state);
    },

    /** Clear the selected cell's value and notes. */
    eraseCell(state) {
      if (!state.currentGrid || !state.selected) return;
      const { row, col } = state.selected;
      const before = state.currentGrid[row]?.[col];
      if (!before || before.isFixed) return;
      if (before.value === null && before.notes.length === 0) return;

      const after: CellState = { ...before, value: null, notes: [] };
      const move: Move = {
        row,
        col,
        before: cloneCell(before),
        after: cloneCell(after),
      };
      state.currentGrid = applyMove(state.currentGrid, move, 'do');
      state.past.push(move);
      state.future = [];
      refreshStatus(state);
    },

    undo(state) {
      const move = state.past.pop();
      if (!move || !state.currentGrid) return;
      state.currentGrid = applyMove(state.currentGrid, move, 'undo');
      state.future.push(move);
      state.selected = { row: move.row, col: move.col };
      refreshStatus(state);
    },

    redo(state) {
      const move = state.future.pop();
      if (!move || !state.currentGrid) return;
      state.currentGrid = applyMove(state.currentGrid, move, 'do');
      state.past.push(move);
      state.selected = { row: move.row, col: move.col };
      refreshStatus(state);
    },

    /** Reset the board back to the initial clues and clear history. */
    resetBoard(state) {
      if (!state.initialGrid) return;
      state.currentGrid = state.initialGrid;
      state.past = [];
      state.future = [];
      state.selected = null;
      state.activeNumber = null;
      state.mistakes = 0;
      state.hintsLeft = HINTS_START;
      state.hintCell = null;
      state.status = 'playing';
    },

    /**
     * Reveal the correct digit for one cell (DESIGN.md §5.7). Prefers the
     * selected cell when it is empty or wrong; otherwise the first such cell.
     * Consumes one hint and flags the cell for a transient highlight.
     */
    hint(state) {
      if (!state.currentGrid || !state.solutionGrid || state.hintsLeft <= 0) {
        return;
      }
      const grid = state.currentGrid;
      const solution = state.solutionGrid;
      const isWrongOrEmpty = (r: number, c: number): boolean => {
        const cell = grid[r]?.[c];
        return !!cell && !cell.isFixed && cell.value !== solution[r]?.[c];
      };

      let target: Position | null = null;
      if (
        state.selected &&
        isWrongOrEmpty(state.selected.row, state.selected.col)
      ) {
        target = state.selected;
      } else {
        outer: for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (isWrongOrEmpty(r, c)) {
              target = { row: r, col: c };
              break outer;
            }
          }
        }
      }
      if (!target) return;

      const { row, col } = target;
      const before = grid[row]?.[col];
      if (!before) return;
      const after: CellState = {
        ...before,
        value: solution[row]?.[col] ?? null,
        notes: [],
      };
      const move: Move = {
        row,
        col,
        before: cloneCell(before),
        after: cloneCell(after),
      };
      state.currentGrid = applyMove(state.currentGrid, move, 'do');
      state.past.push(move);
      state.future = [];
      state.selected = target;
      state.activeNumber = after.value;
      state.hintsLeft -= 1;
      state.hintCell = target;
      refreshStatus(state);
    },

    /** Clear the transient hint highlight. */
    clearHint(state) {
      state.hintCell = null;
    },

    /** Reveal the full solution (gives up). */
    revealSolution(state) {
      if (!state.solutionGrid || !state.currentGrid) return;
      state.currentGrid = withRecomputedErrors(toCellGrid(state.solutionGrid));
      state.past = [];
      state.future = [];
      state.status = 'solved';
    },
  },
});

export const {
  startGeneration,
  puzzleLoaded,
  selectCell,
  moveSelection,
  setActiveNumber,
  toggleNotesMode,
  inputDigit,
  eraseCell,
  undo,
  redo,
  resetBoard,
  revealSolution,
  hint,
  clearHint,
} = gameSlice.actions;

export default gameSlice.reducer;
