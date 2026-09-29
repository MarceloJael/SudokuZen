/**
 * Memoized selectors (prompt §4 — re-render optimization).
 *
 * `makeSelectCellView` builds a per-cell selector via `createSelector`. Each
 * Cell component instantiates one (memoized for its lifetime) and subscribes
 * with a shallow-equality check, so a cell re-renders only when one of its own
 * view fields actually changes — not on every unrelated board edit.
 */
import { createSelector } from '@reduxjs/toolkit';
import { BOX } from '../engine/types';
import type { RootState } from './index';

export interface CellView {
  value: number | null;
  isFixed: boolean;
  hasError: boolean;
  notes: number[];
  /** This is the currently selected cell. */
  isSelected: boolean;
  /** Shares a row, column, or box with the selected cell (peer highlight). */
  isPeer: boolean;
  /** Holds the same value as the active number (same-number highlight). */
  isSameNumber: boolean;
  /** The active number, when this cell carries it as a pencil mark. */
  noteMatch: number | null;
  /** Just revealed by a hint (transient highlight). */
  isHint: boolean;
}

const EMPTY_NOTES: number[] = [];

const selectGrid = (state: RootState) => state.game.currentGrid;
const selectSelected = (state: RootState) => state.game.selected;
const selectActiveNumber = (state: RootState) => state.game.activeNumber;
const selectHintCell = (state: RootState) => state.game.hintCell;

export function makeSelectCellView(row: number, col: number) {
  return createSelector(
    [selectGrid, selectSelected, selectActiveNumber, selectHintCell],
    (grid, selected, activeNumber, hintCell): CellView => {
      const cell = grid?.[row]?.[col];
      const value = cell?.value ?? null;
      const notes = cell?.notes ?? EMPTY_NOTES;

      const isSelected = selected?.row === row && selected?.col === col;

      let isPeer = false;
      if (selected && !isSelected) {
        const sameRow = selected.row === row;
        const sameCol = selected.col === col;
        const sameBox =
          Math.floor(selected.row / BOX) === Math.floor(row / BOX) &&
          Math.floor(selected.col / BOX) === Math.floor(col / BOX);
        isPeer = sameRow || sameCol || sameBox;
      }

      const isSameNumber =
        value !== null && activeNumber !== null && value === activeNumber;

      const noteMatch =
        activeNumber !== null && notes.includes(activeNumber)
          ? activeNumber
          : null;

      return {
        value,
        isFixed: cell?.isFixed ?? false,
        hasError: cell?.hasError ?? false,
        notes,
        isSelected,
        isPeer,
        isSameNumber,
        noteMatch,
        isHint: hintCell?.row === row && hintCell?.col === col,
      };
    },
  );
}

/** How many times each digit 1-9 still needs to be placed (for the NumberPad). */
export const selectRemainingCounts = createSelector([selectGrid], (grid) => {
  const counts: Record<number, number> = {
    1: 9,
    2: 9,
    3: 9,
    4: 9,
    5: 9,
    6: 9,
    7: 9,
    8: 9,
    9: 9,
  };
  if (!grid) return counts;
  for (const rowArr of grid) {
    for (const cell of rowArr) {
      if (cell.value !== null) {
        const current = counts[cell.value];
        if (current !== undefined) counts[cell.value] = current - 1;
      }
    }
  }
  return counts;
});

export const selectCanUndo = (state: RootState) => state.game.past.length > 0;
export const selectCanRedo = (state: RootState) => state.game.future.length > 0;
