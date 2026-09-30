/**
 * Cell — a single Sudoku square (DESIGN.md §5.3).
 *
 * Wrapped in React.memo and driven by a per-cell memoized selector
 * (shallow-compared), so it re-renders only when its own view state changes.
 * Background precedence: selected > error > hint > same-value > related.
 * Accessibility: a gridcell button with a full Portuguese `aria-label`.
 */
import { memo, useMemo, type CSSProperties } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCell } from '../store/gameSlice';
import { makeSelectCellView, type CellView } from '../store/selectors';

interface CellProps {
  row: number;
  col: number;
}

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Portuguese aria-label describing the cell (DESIGN.md §5.3). */
function describeCell(row: number, col: number, view: CellView): string {
  const base = `Linha ${row + 1}, coluna ${col + 1}`;
  let content: string;
  if (view.value !== null) {
    content = `${view.isFixed ? 'fixo' : 'preenchido'} ${view.value}`;
  } else if (view.notes.length > 0) {
    content = `notas ${view.notes.join(' ')}`;
  } else {
    content = 'vazia';
  }
  const error = view.hasError ? ', incorreto' : '';
  return `${base}, ${content}${error}`;
}

function CellComponent({ row, col }: CellProps) {
  const dispatch = useAppDispatch();
  const selectCellView = useMemo(
    () => makeSelectCellView(row, col),
    [row, col],
  );
  const view = useAppSelector(selectCellView, shallowEqual);

  const classes = ['sz-cell'];
  if (view.isFixed) classes.push('is-given');
  if (view.isPeer) classes.push('is-related');
  if (view.isSameNumber) classes.push('is-same');
  if (view.isHint) classes.push('is-hint');
  if (view.isSelected) classes.push('is-selected');
  if (view.hasError) classes.push('is-error', 'is-shake');

  return (
    <button
      type="button"
      role="gridcell"
      className={classes.join(' ')}
      style={{ '--d': row + col } as CSSProperties}
      data-r={row}
      data-c={col}
      data-testid={`cell-${row}-${col}`}
      aria-label={describeCell(row, col, view)}
      aria-selected={view.isSelected}
      aria-invalid={view.hasError}
      aria-readonly={view.isFixed}
      tabIndex={view.isSelected ? 0 : -1}
      onMouseDown={(e) => {
        // Avoid the mouse focus ring but keep keyboard focus working.
        e.preventDefault();
        dispatch(selectCell({ row, col }));
      }}
    >
      {view.value !== null ? (
        <span
          key={view.value}
          className={'sz-cell__digit' + (view.isFixed ? '' : ' is-pop')}
        >
          {view.value}
        </span>
      ) : view.notes.length > 0 ? (
        <span className="sz-notes" aria-hidden="true">
          {NOTE_DIGITS.map((n) => (
            <span key={n} className={view.noteMatch === n ? 'is-match' : ''}>
              {view.notes.includes(n) ? n : ''}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

export const Cell = memo(CellComponent);
