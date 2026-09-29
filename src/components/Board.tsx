/**
 * Board — the 9x9 grid (DESIGN.md §5.4).
 *
 * ARIA grid pattern with `display: contents` rows. Roving tabindex: only the
 * selected cell is tabbable, and DOM focus follows the selection so keyboard
 * and screen-reader users always land on the active cell. On victory the board
 * plays the diagonal wave (each cell delayed by row+col via `--d`).
 */
import { useEffect, useRef } from 'react';
import { Cell } from './Cell';
import { SIZE } from '../engine/types';
import { useAppSelector } from '../store/hooks';

const ROWS = Array.from({ length: SIZE }, (_, i) => i);
const COLS = Array.from({ length: SIZE }, (_, i) => i);

export function Board() {
  const boardRef = useRef<HTMLDivElement>(null);
  const selected = useAppSelector((s) => s.game.selected);
  const won = useAppSelector((s) => s.game.status === 'solved');

  // Keep DOM focus on the selected cell (roving tabindex).
  useEffect(() => {
    if (!selected || !boardRef.current) return;
    const el = boardRef.current.querySelector<HTMLButtonElement>(
      `.sz-cell[data-r="${selected.row}"][data-c="${selected.col}"]`,
    );
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [selected]);

  return (
    <div
      ref={boardRef}
      className={'sz-board' + (won ? ' is-won' : '')}
      role="grid"
      aria-rowcount={SIZE}
      aria-colcount={SIZE}
      aria-label="Tabuleiro de Sudoku"
    >
      {ROWS.map((row) => (
        <div className="sz-board__row" role="row" key={row}>
          {COLS.map((col) => (
            <Cell key={col} row={row} col={col} />
          ))}
        </div>
      ))}
    </div>
  );
}
