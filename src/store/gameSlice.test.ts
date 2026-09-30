import { beforeEach, describe, expect, it } from 'vitest';
import reducer, {
  eraseCell,
  inputDigit,
  moveSelection,
  puzzleLoaded,
  redo,
  resetBoard,
  revealSolution,
  selectCell,
  startGeneration,
  toggleNotesMode,
  undo,
  type GameState,
} from './gameSlice';
import { cloneNumericGrid, fromRows } from '../engine/sudokuEngine';

const SOLUTION = fromRows([
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

function freshGame(): GameState {
  const puzzle = cloneNumericGrid(SOLUTION);
  // Empty a couple of cells so we have editable squares.
  puzzle[0]![0] = 0;
  puzzle[0]![1] = 0;
  return reducer(
    undefined,
    puzzleLoaded({ puzzle, solution: SOLUTION, difficulty: 'easy' }),
  );
}

describe('gameSlice — lifecycle', () => {
  it('starts idle', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.status).toBe('idle');
    expect(state.currentGrid).toBeNull();
  });

  it('startGeneration moves to generating', () => {
    const state = reducer(undefined, startGeneration('extreme'));
    expect(state.status).toBe('generating');
    expect(state.difficulty).toBe('extreme');
  });

  it('puzzleLoaded installs grids and marks clues fixed', () => {
    const state = freshGame();
    expect(state.status).toBe('playing');
    expect(state.currentGrid?.[0]?.[0]?.isFixed).toBe(false);
    expect(state.currentGrid?.[0]?.[2]?.isFixed).toBe(true);
    expect(state.past).toHaveLength(0);
  });
});

describe('gameSlice — input', () => {
  let state: GameState;
  beforeEach(() => {
    state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
  });

  it('enters a digit into an editable cell', () => {
    const next = reducer(state, inputDigit(5));
    expect(next.currentGrid?.[0]?.[0]?.value).toBe(5);
    expect(next.past).toHaveLength(1);
  });

  it('does not modify fixed cells', () => {
    const onFixed = reducer(state, selectCell({ row: 0, col: 2 }));
    const next = reducer(onFixed, inputDigit(1));
    expect(next.currentGrid?.[0]?.[2]?.value).toBe(4); // unchanged clue
    expect(next.past).toHaveLength(0);
  });

  it('pressing the same digit twice clears the cell', () => {
    let next = reducer(state, inputDigit(5));
    next = reducer(next, selectCell({ row: 0, col: 0 }));
    next = reducer(next, inputDigit(5));
    expect(next.currentGrid?.[0]?.[0]?.value).toBeNull();
  });

  it('flags conflicts via hasError', () => {
    // Column 0 already has a 6 at row 1 → entering 6 conflicts.
    const next = reducer(state, inputDigit(6));
    expect(next.currentGrid?.[0]?.[0]?.hasError).toBe(true);
  });

  it('records notes in notes mode without setting a value', () => {
    let next = reducer(state, toggleNotesMode());
    next = reducer(next, inputDigit(3));
    next = reducer(next, inputDigit(7));
    expect(next.currentGrid?.[0]?.[0]?.value).toBeNull();
    expect(next.currentGrid?.[0]?.[0]?.notes).toEqual([3, 7]);
    // Toggling an existing note removes it.
    next = reducer(next, inputDigit(3));
    expect(next.currentGrid?.[0]?.[0]?.notes).toEqual([7]);
  });

  it('placing a value removes that note from row, column and box peers', () => {
    let next = reducer(state, toggleNotesMode());
    next = reducer(next, selectCell({ row: 0, col: 1 })); // same row & box
    next = reducer(next, inputDigit(5));
    next = reducer(next, inputDigit(3));
    next = reducer(next, toggleNotesMode());
    next = reducer(next, selectCell({ row: 0, col: 0 }));
    next = reducer(next, inputDigit(5));
    expect(next.currentGrid?.[0]?.[1]?.notes).toEqual([3]);

    // Undo restores both the value and the pruned note.
    next = reducer(next, undo());
    expect(next.currentGrid?.[0]?.[0]?.value).toBeNull();
    expect(next.currentGrid?.[0]?.[1]?.notes).toEqual([3, 5]);
    next = reducer(next, redo());
    expect(next.currentGrid?.[0]?.[1]?.notes).toEqual([3]);
  });

  it('erase clears value and notes', () => {
    let next = reducer(state, inputDigit(5));
    next = reducer(next, eraseCell());
    expect(next.currentGrid?.[0]?.[0]?.value).toBeNull();
  });

  it('marks the game solved when the last cell is correctly filled', () => {
    // Fill (0,0)=5 then (0,1)=3 to complete the grid.
    let next = reducer(state, inputDigit(5));
    next = reducer(next, selectCell({ row: 0, col: 1 }));
    next = reducer(next, inputDigit(3));
    expect(next.status).toBe('solved');
  });
});

describe('gameSlice — undo/redo stack', () => {
  it('undo reverts the last move and redo reapplies it', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
    state = reducer(state, inputDigit(9));
    expect(state.currentGrid?.[0]?.[0]?.value).toBe(9);

    state = reducer(state, undo());
    expect(state.currentGrid?.[0]?.[0]?.value).toBeNull();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(1);

    state = reducer(state, redo());
    expect(state.currentGrid?.[0]?.[0]?.value).toBe(9);
    expect(state.future).toHaveLength(0);
  });

  it('a new move after undo clears the redo stack', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
    state = reducer(state, inputDigit(9));
    state = reducer(state, undo());
    expect(state.future).toHaveLength(1);
    state = reducer(state, inputDigit(5));
    expect(state.future).toHaveLength(0);
    expect(state.currentGrid?.[0]?.[0]?.value).toBe(5);
  });

  it('undo/redo across multiple moves preserves order', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
    state = reducer(state, inputDigit(5));
    state = reducer(state, selectCell({ row: 0, col: 1 }));
    state = reducer(state, inputDigit(3));

    state = reducer(state, undo()); // undo the 3
    expect(state.currentGrid?.[0]?.[1]?.value).toBeNull();
    expect(state.currentGrid?.[0]?.[0]?.value).toBe(5);
    state = reducer(state, undo()); // undo the 5
    expect(state.currentGrid?.[0]?.[0]?.value).toBeNull();
  });

  it('undo on an empty stack is a no-op', () => {
    const state = freshGame();
    const next = reducer(state, undo());
    expect(next).toEqual(state);
  });
});

describe('gameSlice — selection & navigation', () => {
  it('moveSelection wraps around edges', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
    state = reducer(state, moveSelection({ dRow: -1, dCol: 0 }));
    expect(state.selected).toEqual({ row: 8, col: 0 });
    state = reducer(state, moveSelection({ dRow: 0, dCol: -1 }));
    expect(state.selected).toEqual({ row: 8, col: 8 });
  });

  it('selecting a cell updates the active number', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 2 })); // value 4
    expect(state.activeNumber).toBe(4);
  });
});

describe('gameSlice — reset & reveal', () => {
  it('reset restores the initial clues', () => {
    let state = freshGame();
    state = reducer(state, selectCell({ row: 0, col: 0 }));
    state = reducer(state, inputDigit(9));
    state = reducer(state, resetBoard());
    expect(state.currentGrid?.[0]?.[0]?.value).toBeNull();
    expect(state.past).toHaveLength(0);
  });

  it('reveal fills the full solution and marks solved', () => {
    const state = reducer(freshGame(), revealSolution());
    expect(state.status).toBe('solved');
    expect(state.currentGrid?.[0]?.[0]?.value).toBe(5);
    expect(state.currentGrid?.[0]?.[1]?.value).toBe(3);
  });
});
