/**
 * NumberPad — on-screen digit entry (DESIGN.md §5.5). Each key shows how many of
 * that digit remain; a completed digit (9 placed) shows a ✓ and is disabled.
 * The key matching the selected cell's value is outlined (`is-current`), and in
 * notes mode the pad switches to the compact note style. The row/grid layout is
 * driven by the container query in components.css.
 */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { inputDigit, setActiveNumber } from '../store/gameSlice';
import { selectRemainingCounts } from '../store/selectors';
import { Icon } from './Icon';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad() {
  const dispatch = useAppDispatch();
  const remaining = useAppSelector(selectRemainingCounts);
  const notesMode = useAppSelector((s) => s.game.notesMode);
  const current = useAppSelector((s) => s.game.activeNumber);
  const hasSelection = useAppSelector((s) => s.game.selected !== null);

  return (
    <div
      className={'sz-pad' + (notesMode ? ' is-notes' : '')}
      role="group"
      aria-label={notesMode ? 'Anotar número' : 'Inserir número'}
    >
      {DIGITS.map((digit) => {
        const left = remaining[digit] ?? 0;
        const complete = left <= 0;
        const classes = ['sz-key'];
        if (complete) classes.push('is-complete');
        if (!complete && current === digit) classes.push('is-current');

        return (
          <button
            key={digit}
            type="button"
            className={classes.join(' ')}
            aria-disabled={complete}
            aria-label={
              notesMode
                ? `Nota ${digit}, restam ${left}`
                : `Inserir ${digit}, restam ${left}`
            }
            onClick={() => {
              if (complete) return;
              dispatch(setActiveNumber(digit));
              if (hasSelection) dispatch(inputDigit(digit));
            }}
          >
            <span className="sz-key__digit">{digit}</span>
            <span className="sz-key__count">
              {complete ? <Icon name="check" /> : left}
            </span>
          </button>
        );
      })}
    </div>
  );
}
